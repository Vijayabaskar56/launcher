# Homescreen Features Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task. **Do NOT reload a skill if it is already loaded in the current conversation context** — check what's already loaded before invoking the Skill tool. Only load skills that are new for the current task.
>
> - `vercel-react-native-skills` for Reanimated shared values, animation performance, TextInput-as-display patterns, SVG rendering
> - `vercel-react-best-practices` for hook design, context boundaries, derived state, effect lifecycle
> - `building-native-ui` for Expo SDK packages (battery, screen-orientation, status-bar, navigation-bar), route layout, screen structure
> - `heroui-native` for HeroUI component usage, `className` token classes, `useThemeColor` hook
> - `vercel-composition-patterns` for compound component architecture and reusable patterns
> - `building-components` for accessible, composable clock style architecture
> - `creating-reanimated-animations` for Reanimated animation creation patterns — withTiming, withRepeat, useAnimatedStyle, entering/exiting transitions
> - `reanimated-skia-performance` for Skia + Reanimated performance patterns — canvas rendering, GPU-friendly animations, frame loop optimization

**Goal:** Wire real data into the homescreen — live clock (digital + analog styles), live battery widget with 3-mode homescreen indicator, charging glow animation, system bar control, and screen orientation lock. Replace all mock/hardcoded data with live sources.

**Reference Direction:** Match Kvaesitso's homescreen behavior:

- Real-time clock with configurable style (digital/analog) and optional seconds
- Battery indicator below clock with smart visibility (hide/always/charging-or-low)
- Subtle charging animation at screen bottom when plugged in
- System bar hide/show + icon color control, scoped to homescreen only
- Portrait orientation lock toggle, applied app-wide

**Architecture:** Clock uses Reanimated shared values for zero-JS-rerender updates. `useClock()` hook provides timestamp via `useSharedValue`, consumers format via `useDerivedValue` and render through `Animated.TextInput` (editable=false, styled as Text). Battery reads from `expo-battery` hooks. Charging animation uses `withRepeat(withTiming(...))`. System bars controlled by `expo-status-bar` + `expo-navigation-bar`, applied/reverted on homescreen focus. Orientation lock via `expo-screen-orientation` in root layout.

**Tech Stack:** Expo Router, react-native-reanimated 4.2.1, react-native-gesture-handler, react-native-svg, expo-battery, expo-screen-orientation, expo-status-bar, expo-navigation-bar, heroui-native/uniwind

---

### Product Decisions Locked

- **Clock update strategy:** Reanimated shared value (Option C) — zero JS re-renders
- **Clock styles:** Digital + Analog only (more styles can be added later without architecture changes)
- **Seconds display:** Off by default, toggleable from homescreen settings
- **Battery homescreen indicator:** 3 modes — Hide / Always / ChargingOrLow (auto-show when charging or <15%)
- **Battery panel widget:** Percentage + charging state + fill icon (no estimated time)
- **Charging animation:** Subtle glow pulse at bottom (not particle system)
- **System bars:** Homescreen-scoped only — revert to defaults when entering settings/drawer
- **Orientation lock:** App-wide in `_layout.tsx`
- **Wallpaper blur/dim:** DEFERRED — requires transparent Android window (separate task)
- **Music widget:** SKIPPED — requires custom native module

---

### Packages to Install

```bash
npx expo install expo-battery expo-screen-orientation
```

Both work in Expo Go and dev clients. No native rebuild required.

---

### Task 1: Install Dependencies

**Required skills:** `building-native-ui` (for Expo SDK package installation and compatibility)

**Files:**

- Modify: `apps/native/package.json`

**Step 1: Install expo-battery and expo-screen-orientation**

```bash
npx expo install expo-battery expo-screen-orientation
```

**Step 2: Verify packages are compatible**

Check that both packages are compatible with the current Expo SDK 55 version. Run `npx expo doctor` to verify.

**Step 3: Commit**

```
chore: install expo-battery and expo-screen-orientation
```

---

### Task 2: Build the `useClock()` Hook

**Required skills:** `vercel-react-native-skills` (for Reanimated shared value patterns, UI thread performance, and `useAnimatedProps`/`useDerivedValue` usage), `vercel-react-best-practices` (for hook design, effect lifecycle, and cleanup patterns), `creating-reanimated-animations` (for shared value update patterns and worklet-safe derived value formatting)

**Files:**

- Create: `apps/native/hooks/use-clock.ts`

**Step 1: Create the shared value time source**

Create a `useClock()` hook that:

- Stores the current timestamp in `useSharedValue<number>(Date.now())`
- Runs a `setInterval(1000)` inside a `useEffect` that updates the shared value every second
- Aligns to the clock boundary (fires at the start of each second, like Kvaesitso's `1000 - millis` approach)
- Cleans up the interval on unmount

```ts
const timestamp = useSharedValue(Date.now());

useEffect(() => {
  const update = () => {
    const now = Date.now();
    timestamp.value = now;
    const millis = now % 1000;
    const next = 1000 - millis;
    timeoutId = setTimeout(update, next < 200 ? next + 1000 : next);
  };
  let timeoutId = setTimeout(update, 1000 - (Date.now() % 1000));
  return () => clearTimeout(timeoutId);
}, []);
```

**Step 2: Expose derived formatted values**

Return derived values that consumers can use:

```ts
return {
  timestamp, // raw shared value (for analog clock rotation math)
  formattedTime, // useDerivedValue → "HH:mm" or "HH:mm:ss"
  formattedDate, // useDerivedValue → "Tuesday, March 25"
  hours, // useDerivedValue → number (0-23)
  minutes, // useDerivedValue → number (0-59)
  seconds, // useDerivedValue → number (0-59)
};
```

**Important:** All formatting must happen inside `useDerivedValue` worklets. Use worklet-compatible date math (modular arithmetic on timestamp), not `new Date().toLocaleString()` which isn't available on the UI thread.

For `formattedTime`: extract hours/minutes from timestamp using modular arithmetic and zero-pad manually.

For `formattedDate`: since day changes are rare (once per day), this can be computed on the JS thread and stored in a `useSharedValue` that updates only when the day changes.

**Step 3: Add seconds setting awareness**

Accept a `showSeconds` parameter. When false, `formattedTime` only recalculates when the minute changes (compare `Math.floor(ts / 60000)`). When true, it recalculates every second.

**Step 4: Read the showSeconds setting**

Read `homescreen.showSeconds` from `SettingsContext` (we'll add this setting in Task 5). For now, default to `false`.

**Step 5: Commit**

```
feat: add useClock hook with Reanimated shared value time source
```

---

### Task 3: Wire Real-Time Clock into ClockDisplay (Homescreen)

**Required skills:** `vercel-react-native-skills` (for `Animated.TextInput` as display pattern, `useAnimatedProps`, and ensuring zero re-renders), `heroui-native` (for className styling tokens)

**Files:**

- Modify: `apps/native/components/clock-display.tsx`

**Step 1: Replace static text with Animated.TextInput**

Replace the hardcoded `<Text>10:06</Text>` with an `Animated.TextInput` driven by the `useClock()` hook:

```tsx
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const { formattedTime, formattedDate } = useClock();

const timeProps = useAnimatedProps(() => ({
  text: formattedTime.value,
  defaultValue: formattedTime.value,
}));
```

Render:

```tsx
<AnimatedTextInput
  animatedProps={timeProps}
  editable={false}
  underlineColorAndroid="transparent"
  className="text-foreground font-extralight text-8xl tabular-nums"
  style={{ letterSpacing: -2 }}
/>
```

**Step 2: Replace the static date/subtitle**

Replace `"In 6 hours"` with the live formatted date from `useClock().formattedDate`. Since the date only changes once per day, this can be a regular React state that updates via `useAnimatedReaction` when the day changes.

**Step 3: Verify zero re-renders**

Wrap the component in `React.memo` and add a console.log in development to confirm the component body never re-executes after mount. Only the `TextInput` native prop updates.

**Step 4: Commit**

```
feat: wire real-time clock into homescreen ClockDisplay
```

---

### Task 4: Wire Real-Time Clock into Clock Widget (Panel)

**Required skills:** `vercel-react-native-skills` (same Animated.TextInput pattern), `heroui-native` (for widget card styling)

**Files:**

- Modify: `apps/native/components/widgets/clock-widget.tsx`

**Step 1: Replace hardcoded time and date**

Same pattern as Task 3 — use `useClock()` hook and `Animated.TextInput` for the time display. Replace `"Saturday, March 21"` with the live formatted date. Replace `"In 6 hours"` with a meaningful subtitle (e.g., next alarm time, or just remove it).

**Step 2: Handle size variants**

The widget supports `small | medium | large` sizes. The `Animated.TextInput` approach works the same across all sizes — just change the className font size per variant.

**Step 3: Commit**

```
feat: wire real-time clock into widget panel clock widget
```

---

### Task 5: Add Clock Settings (Style Selector + Show Seconds)

**Required skills:** `vercel-react-best-practices` (for settings state design), `heroui-native` (for settings UI components)

**Files:**

- Modify: `apps/native/types/settings.ts`
- Modify: `apps/native/app/settings/homescreen.tsx`

**Step 1: Add clock settings to HomescreenSettings type**

```ts
export type ClockStyle = "digital" | "analog";

export interface HomescreenSettings {
  // ... existing fields ...
  clockStyle: ClockStyle;
  showSeconds: boolean;
  batteryIndicator: "hide" | "always" | "charging-or-low";
}
```

**Step 2: Add defaults**

```ts
clockStyle: "digital",
showSeconds: false,
batteryIndicator: "charging-or-low",
```

**Step 3: Add Clock settings category to homescreen settings UI**

Add a new `PreferenceCategory` titled "Clock" between "Layout" and "Dock" in `homescreen.tsx`:

```tsx
<PreferenceCategory title="Clock">
  <SelectPreference
    icon="schedule"
    title="Clock Style"
    value={homescreen.clockStyle}
    options={[
      { label: "Digital", value: "digital" },
      { label: "Analog", value: "analog" },
    ]}
    onValueChange={(v) => actions.updateHomescreen({ clockStyle: v })}
  />
  <SwitchPreference
    icon="timer"
    title="Show Seconds"
    summary="Display seconds in clock"
    value={homescreen.showSeconds}
    onValueChange={(v) => actions.updateHomescreen({ showSeconds: v })}
  />
  <SelectPreference
    icon="battery-std"
    title="Battery Indicator"
    value={homescreen.batteryIndicator}
    options={[
      { label: "Hidden", value: "hide" },
      { label: "Always visible", value: "always" },
      { label: "Charging or low", value: "charging-or-low" },
    ]}
    onValueChange={(v) => actions.updateHomescreen({ batteryIndicator: v })}
  />
</PreferenceCategory>
```

**Step 4: Disable wallpaper settings (deferred)**

Add `disabled` prop and summary note to the wallpaper dim/blur toggles:

```tsx
<SwitchPreference
  icon="image"
  title="Dim Wallpaper"
  summary="Requires transparent window (coming soon)"
  value={homescreen.wallpaperDim}
  onValueChange={(v) => actions.updateHomescreen({ wallpaperDim: v })}
  disabled
/>
```

**Step 5: Commit**

```
feat: add clock style, show seconds, and battery indicator settings
```

---

### Task 6: Build Analog Clock Style

**Required skills:** `vercel-react-native-skills` (for SVG rendering with Reanimated animated props), `building-components` (for composable clock component architecture with style switching), `creating-reanimated-animations` (for driving SVG rotation transforms from shared values), `reanimated-skia-performance` (for GPU-friendly rendering of the SVG clock face and animated hands)

**Files:**

- Create: `apps/native/components/clock-styles/analog-clock.tsx`
- Create: `apps/native/components/clock-styles/digital-clock.tsx`
- Modify: `apps/native/components/clock-display.tsx`

**Step 1: Extract digital clock into its own component**

Move the existing `Animated.TextInput`-based clock from `ClockDisplay` into `components/clock-styles/digital-clock.tsx`. It receives the `useClock()` return value as props.

**Step 2: Build the analog clock with SVG + Reanimated**

Create `analog-clock.tsx` using `react-native-svg`:

- `<Circle>` for the clock face (stroke only, no fill — transparent)
- `<Line>` for hour, minute, and optional second hands
- Hour/minute/second rotations derived from `useClock().hours`, `.minutes`, `.seconds` via `useDerivedValue`
- Use `useAnimatedProps` on each `<Line>` to drive rotation transforms on the UI thread
- Clock size: ~200dp diameter on homescreen, smaller in widget panel
- Hand colors: `foreground` token color (read via `useThemeColor`)
- Optional tick marks at 12 positions (small lines at the edge)

Reference Kvaesitso's `AnalogClock.kt` for the rotation math:

- Hour hand: `(hours % 12 + minutes / 60) * 30` degrees
- Minute hand: `(minutes + seconds / 60) * 6` degrees
- Second hand: `seconds * 6` degrees

**Step 3: Add style switching in ClockDisplay**

Read `clockStyle` from settings and render the appropriate component:

```tsx
const clockStyle = settings.state.homescreen.clockStyle;

{
  clockStyle === "digital" ? (
    <DigitalClock clock={clock} />
  ) : (
    <AnalogClock clock={clock} />
  );
}
```

**Step 4: Commit**

```
feat: add analog clock style with SVG and Reanimated
```

---

### Task 7: Wire Live Battery Widget + Homescreen Indicator

**Required skills:** `building-native-ui` (for `expo-battery` API usage — `useBatteryLevel`, `useBatteryState`, battery state constants), `vercel-react-best-practices` (for derived state from battery hooks), `heroui-native` (for styling)

**Files:**

- Create: `apps/native/hooks/use-battery.ts`
- Modify: `apps/native/components/widgets/battery-widget.tsx`
- Modify: `apps/native/components/clock-display.tsx`

**Step 1: Create a `useBattery()` convenience hook**

Wraps `expo-battery` hooks and returns:

```ts
{
  level: number; // 0-100 (converted from 0-1)
  isCharging: boolean; // derived from BatteryState
  state: BatteryState; // raw enum (CHARGING, UNPLUGGED, FULL, UNKNOWN)
  statusText: string; // "Charging", "On Battery", "Full"
}
```

**Step 2: Replace hardcoded battery widget data**

In `battery-widget.tsx`, replace `87%` and `"On Battery"` with live data from `useBattery()`:

```tsx
const { level, statusText } = useBattery();
// ...
<Text>{Math.round(level)}%</Text>
<Text>{statusText}</Text>
```

**Step 3: Add battery indicator below clock on homescreen**

In `clock-display.tsx`, add a small battery indicator below the clock/date:

- Read `batteryIndicator` setting from `SettingsContext`
- Read battery data from `useBattery()`
- Visibility logic:
  - `"hide"` → never show
  - `"always"` → always show
  - `"charging-or-low"` → show when `isCharging || level < 15`
- Display: small row with battery icon + percentage text (e.g., "🔋 87%")
- Use `className="text-xs text-muted-foreground"` for subtle appearance

**Step 4: Commit**

```
feat: wire live battery data into widget and homescreen indicator
```

---

### Task 8: Build Charging Glow Animation

**Required skills:** `creating-reanimated-animations` (for `withRepeat`, `withTiming`, `useAnimatedStyle`, entering/exiting transitions), `reanimated-skia-performance` (for GPU-friendly opacity animation and gradient rendering performance)

**Files:**

- Create: `apps/native/components/charging-glow.tsx`
- Modify: `apps/native/app/index.tsx`

**Step 1: Create the ChargingGlow component**

A component that renders a subtle animated gradient glow at the bottom of the screen:

- Absolutely positioned at `bottom: 0`, full width, ~60px height
- Linear gradient from transparent to a soft accent color (read from theme)
- Opacity pulses between 0.3 and 0.8 using `withRepeat(withTiming(...))`
- Animation config: ~2 second cycle, ease-in-out, repeat forever
- Uses `useAnimatedStyle` for the opacity pulse — stays on UI thread

```tsx
const opacity = useSharedValue(0.3);

useEffect(() => {
  opacity.value = withRepeat(
    withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
    -1, // infinite
    true // reverse
  );
}, []);
```

**Step 2: Add visibility logic**

- Read `chargingAnimation` setting from `SettingsContext`
- Read `isCharging` from `useBattery()`
- Only render when both `chargingAnimation === true` AND `isCharging === true`
- Animate in/out with `FadeIn` / `FadeOut` entering/exiting transitions

**Step 3: Mount in homescreen**

Add `<ChargingGlow />` to `app/index.tsx` inside the home content area, positioned absolutely at the bottom. It should render below the dock row but above the background.

**Step 4: Commit**

```
feat: add charging glow pulse animation on homescreen
```

---

### Task 9: Wire System Bar Control (Homescreen-Scoped)

**Required skills:** `building-native-ui` (for `expo-status-bar` and `expo-navigation-bar` API usage — `setStatusBarHidden`, `setStatusBarStyle`, `setBackgroundColorAsync`, `setVisibilityAsync`)

**Files:**

- Create: `apps/native/hooks/use-system-bars.ts`
- Modify: `apps/native/app/index.tsx`

**Step 1: Create `useSystemBars()` hook**

A hook that applies system bar settings when the homescreen is focused and reverts when leaving:

```ts
function useSystemBars(settings: HomescreenSettings, isHomescreen: boolean) {
  useEffect(() => {
    if (!isHomescreen) {
      // Revert to defaults
      StatusBar.setStatusBarHidden(false, "fade");
      NavigationBar.setVisibilityAsync("visible");
      StatusBar.setStatusBarStyle("light");
      return;
    }

    // Apply user settings
    StatusBar.setStatusBarHidden(settings.hideStatusBar, "fade");

    if (settings.hideNavigationBar) {
      NavigationBar.setVisibilityAsync("hidden");
    }

    // Icon colors
    const statusStyle =
      settings.statusBarIconColor === "auto"
        ? "auto"
        : settings.statusBarIconColor;
    StatusBar.setStatusBarStyle(statusStyle);

    // Navigation bar icon color
    NavigationBar.setButtonStyleAsync(
      settings.navigationBarIconColor === "dark" ? "dark" : "light"
    );
  }, [isHomescreen, settings]);
}
```

**Step 2: Determine homescreen visibility**

The homescreen is "visible" when neither the drawer nor the widget panel is open. Use the existing `isDrawerOpen` and `isWidgetPanelOpen` state from `app/index.tsx`:

```ts
const isHomescreenVisible = !isDrawerOpen && !isWidgetPanelOpen;
useSystemBars(settings.state.homescreen, isHomescreenVisible);
```

**Step 3: Handle "auto" icon color**

For `"auto"` mode, default to `"light"` icons (since the app has a dark background). When we implement transparent window (wallpaper blur), this will need to adapt based on wallpaper luminance.

**Step 4: Commit**

```
feat: wire system bar hide/show and icon colors on homescreen
```

---

### Task 10: Wire Screen Orientation Lock (App-Wide)

**Required skills:** `building-native-ui` (for `expo-screen-orientation` API usage — `lockAsync`, `OrientationLock` enum, and proper placement in root layout)

**Files:**

- Modify: `apps/native/app/_layout.tsx`

**Step 1: Add orientation lock effect in root layout**

Read the `fixedRotation` setting from `SettingsContext` and apply the lock:

```tsx
import * as ScreenOrientation from "expo-screen-orientation";

// Inside the root layout component, after SettingsProvider is available:
useEffect(() => {
  if (settings.state.homescreen.fixedRotation) {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } else {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
  }
}, [settings.state.homescreen.fixedRotation]);
```

**Step 2: Handle provider nesting**

Since `SettingsContext` is provided inside `_layout.tsx`, the orientation lock effect needs to be in a child component that can access the context. Create a small `<OrientationLock />` component rendered inside the provider tree:

```tsx
function OrientationLock() {
  const settings = use(SettingsContext);
  useEffect(() => {
    /* lock logic */
  }, [settings?.state.homescreen.fixedRotation]);
  return null;
}
```

Place it inside the provider stack in `_layout.tsx`.

**Step 3: Commit**

```
feat: add app-wide screen orientation lock from settings
```

---

### Task 11: Validate Behavior and Regressions

**Required skills:** `vercel-react-native-skills` (for performance verification), `vercel-react-best-practices` (for ensuring no unnecessary re-renders)

**Step 1: Clock verification**

Verify:

- Homescreen clock shows live time updating every minute (no seconds by default)
- Enable "Show Seconds" in settings → clock updates every second
- Switch to "Analog" clock style → SVG clock renders with correct hand positions
- Switch back to "Digital" → TextInput clock renders
- Clock widget in widget panel also shows live time
- **Zero re-renders:** no console.log output from ClockDisplay after initial mount

**Step 2: Battery verification**

Verify:

- Battery widget in panel shows real percentage and charging state
- Battery indicator below clock respects 3 modes:
  - "Hide" → nothing shown
  - "Always" → percentage always visible
  - "Charging or low" → only shows when charging or battery < 15%
- Plug/unplug device → indicator and widget update in real time

**Step 3: Charging animation verification**

Verify:

- Plug in device → glow pulse appears at bottom of homescreen
- Unplug → glow fades out
- Disable "Charging Animation" in settings → no glow even when charging
- Re-enable → glow returns

**Step 4: System bars verification**

Verify:

- Enable "Hide Status Bar" → status bar disappears on homescreen
- Open settings → status bar reappears
- Return to homescreen → status bar hides again
- Same for navigation bar
- Icon color settings (Light/Dark/Auto) change icon appearance
- All combinations work together

**Step 5: Orientation lock verification**

Verify:

- Enable "Fixed Rotation" → app stays portrait when device rotates
- Disable → app rotates with device
- Setting persists across app restarts
- Works on both homescreen AND settings screens (app-wide)

**Step 6: Regression verification**

Verify:

- App drawer still opens/closes correctly (swipe up)
- Widget panel still opens/closes correctly (swipe down)
- Search bar still works
- Dock row still renders
- Settings navigation intact
- No performance regressions (smooth 60fps animations)
- No crashes from rapid setting toggling

---

### Acceptance Criteria

- Homescreen clock shows live time with zero JS re-renders (Reanimated shared value)
- Two clock styles selectable: Digital (default) and Analog (SVG)
- Show Seconds toggle works in settings
- Battery widget shows real data from `expo-battery`
- Battery indicator below clock with 3 visibility modes (hide/always/charging-or-low)
- Charging glow pulse animation when device is charging
- System bar hide/show and icon colors applied on homescreen, reverted elsewhere
- Screen orientation lock toggle works app-wide
- Wallpaper blur/dim settings disabled with "coming soon" note
- All settings persist across app restarts via MMKV
- No regressions in existing launcher functionality (drawer, widgets, search, dock)

---

### Implementation Notes

- Load `vercel-react-native-skills` before writing ANY Reanimated code — it has the performance patterns for shared values, derived values, and animated props
- Load `building-native-ui` before using ANY Expo SDK package — it has the API patterns and gotchas
- Load `heroui-native` before writing ANY styled component — use `className` tokens, not hardcoded colors
- The `useClock()` hook is the foundation — Tasks 3, 4, and 6 all depend on it
- `Animated.TextInput` pattern: set `editable={false}`, `pointerEvents="none"`, and remove all input styling (borders, underlines) to make it look like plain Text
- For analog clock SVG: use `Animated.createAnimatedComponent()` on SVG elements (`Line`, `Circle`) to drive rotation from shared values
- Battery level from `expo-battery` is 0-1 float — multiply by 100 for percentage display
- System bar changes are global side effects — always clean up / revert in the hook's cleanup function
- Do not modify any non-homescreen screens (settings, drawer, widget panel layout) except where explicitly stated
- Run `bun x ultracite fix` before each commit to format code
