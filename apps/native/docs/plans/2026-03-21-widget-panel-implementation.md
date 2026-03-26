# Widget Panel Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out:
>
> - `building-native-ui` for the widget panel layout, section structure, and bottom-sheet interactions
> - `vercel-react-native-skills` for React Native list performance, scroll-gesture coordination, and interaction patterns
> - `vercel-react-best-practices` for React state boundaries, component structure, and derived state
> - `react-native-unistyles-v3` for all new styling, theme tokens, variants, and layout states
> - `reanimated-dnd` for drag-and-drop reordering in the Edit Widgets screen
> - `vercel-composition-patterns` for the widget panel and widget card component architecture
> - `voltra` for building native platform widgets (iOS home screen widgets, Android widgets) using Voltra JSX and JS APIs. Use `Voltra` from `voltra` for iOS widget UI. Use `VoltraAndroid` from `voltra/android` for Android widget UI. Do not write native Swift/Kotlin — use Voltra JS APIs exclusively. See `references/ios-widgets.md` and `references/android-widgets.md` for platform-specific rules.

**Goal:** Add a swipe-down widget panel to the launcher home screen, containing 5 built-in launcher widgets (Weather, Clock/Date, Calendar, Battery, Music) displayed as styled cards with mock data, plus an Edit Widgets stack screen for reordering and removing widgets.

**Reference Direction:** Match the existing drawer interaction model closely:

- swipe down on home screen opens widget panel (slides up from bottom)
- swipe up on home screen opens app drawer (slides down from top)
- scroll-to-top then swipe down closes the widget panel
- scroll-to-top then swipe up closes the app drawer
- only one panel can be open at a time (mutually exclusive)
- widget panel is full-screen, scrollable, with search bar floating on top

**Architecture:** Mirror the existing drawer architecture — a full-screen animated overlay driven by a shared `translateY` value, with its own pan gesture handler. Add a new `widgets/` component directory mirroring `app-drawer/`. The Edit Widgets screen is a standard Expo Router stack push.

**Tech Stack:** Expo Router, React Native, react-native-reanimated, react-native-gesture-handler, react-native-unistyles v3, expo-secure-store, react-native-reanimated-dnd, voltra (for native platform widgets)

---

### Product Decisions Locked

- Widget panel trigger: swipe down on home screen
- Widget panel animation: slides UP from bottom, 300ms, Easing.out(Easing.cubic)
- Widget panel size: full-screen overlay, scrollable
- Home screen during widget panel: fades out (same as drawer)
- Search bar: stays on top of widget panel (z-index 999)
- Widget panel header: kicker "Widgets" + title "My Widgets" (drawer-style section headers)
- Widget panel padding: matches drawer exactly (horizontal md, vertical with safe area insets)
- Widget card style: card background + border + xl border radius, configurable opacity (default opaque)
- Gesture inside panel: scroll-to-top then swipe down closes (same scroll-gate logic as drawer)
- Gesture on home screen: single Pan gesture with direction branching, winner-takes-all
- Panel mutual exclusion: auto-close the other panel when one opens
- 5 default widgets: Weather, Clock/Date, Calendar, Battery, Music
- Widget card content: styled cards with mock data (UI-only phase)
- Weather widget: city name, temperature (large), weather icon/emoji, condition text, high/low temps
- Clock/Date widget: current date and time display
- Calendar widget: mini calendar grid (current month) with today highlighted + next event
- Battery widget: percentage number + battery icon + "Charging" / "On Battery" status text
- Music widget: album art thumbnail, song name, artist, play/pause/skip buttons
- Widget card sizing: customizable per widget (defaults to full-width card)
- Edit Widgets screen: stack push (like Settings)
- Edit Widgets list: draggable list with drag handle + widget preview + delete icon per row
- Add widget button: only in Edit Widgets screen (not in widget panel)
- Customization bottom sheet: skipped for UI-only phase
- Third-party widget support: "Add Widget" button in Edit screen only (UI placeholder for now)
- Voltra integration: native platform widgets (iOS home screen widgets, Android home screen widgets) will be built using Voltra JSX APIs — no native Swift/Kotlin code

---

### Task 1: Add Widget Panel Gesture And Shared State To Home Screen

**Required skills:** `vercel-react-native-skills`, `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/app/index.tsx`

**Step 1: Replace the single-direction Pan gesture with a bidirectional handler**

The current `panGesture` only handles swipe up (activeOffsetY(-10)). Replace it with a single `Gesture.Pan()` that:

- On the first significant move, determines direction (up vs down)
- If `translationY < 0`: drive `drawerTranslateY` (existing drawer behavior)
- If `translationY > 0`: drive a new `widgetPanelTranslateY` shared value
- On end: snap to open or closed based on thresholds (same 20%/25% + velocity thresholds)
- Only trigger when neither panel is currently open (or when the home screen is fully visible)

**Step 2: Add `widgetPanelTranslateY` shared value**

Initialize to `screenHeight` (closed, panel is off-screen below). When open, value is `0` (panel covers screen).

Add a parallel `useAnimatedReaction` to track widget panel open/close state (same pattern as drawer).

**Step 3: Add mutual exclusion logic**

When opening the widget panel, snap `drawerTranslateY` to `screenHeight` (close drawer). When opening the drawer, snap `widgetPanelTranslateY` to `screenHeight` (close widget panel). Use `withTiming` for the auto-close animation.

**Step 4: Add home content fade for widget panel**

Apply the same opacity interpolation to `homeContent` for `widgetPanelTranslateY`:
`interpolate(widgetPanelTranslateY, [screenHeight, 0], [1, 0])`

Combine both interpolations so home content fades out when either panel opens.

**Step 5: Add back handler for widget panel**

Extend the existing `BackHandler` effect to also close the widget panel if it is open.

**Step 6: Render the widget panel component**

Add `<WidgetPanel translateY={widgetPanelTranslateY} />` alongside the existing `<AppDrawer />` inside the `SearchBar.Provider`.

---

### Task 2: Build The Widget Panel Component

**Required skills:** `building-native-ui`, `vercel-composition-patterns`, `react-native-unistyles-v3`, `vercel-react-native-skills`

**Files:**

- Create: `apps/native/components/widget-panel.tsx`
- Create: `apps/native/components/widgets/` subcomponents as needed

**Step 1: Create the widget panel container**

Mirror the `AppDrawer` architecture:

- Full-screen absolute-positioned `Animated.View`
- Driven by the `translateY` shared value
- Opacity interpolation: `interpolate(translateY, [screenHeight, 0], [0, 1])`
- Contains an `Animated.ScrollView` with the same scroll-gate logic for close gesture

**Step 2: Add the close-on-scroll-to-top gesture**

Inside the panel, add a `Gesture.Pan()` that only triggers when `scrollOffset.value <= 0` and `event.translationY > 0` (same pattern as `AppDrawer`). On end, snap to closed if threshold is met.

**Step 3: Add the section header**

Render a section header matching the drawer style:

- Kicker text: "Widgets"
- Title text: "My Widgets"
- Padding: same as drawer content area (paddingTop accounts for insets.top + search bar height + gap)

**Step 4: Add the scrollable widget list**

Render the 5 default widgets as styled cards in a vertical scroll flow. Each widget is a full-width card with the widget card style (card bg, border, xl radius).

**Step 5: Add "Edit Widgets" button at the bottom**

At the end of the widget list, add a button that navigates to the Edit Widgets screen via `router.push("/widgets/edit")`.

**Step 6: Handle back navigation reset**

When the widget panel closes, reset scroll position to top (same `useAnimatedReaction` pattern as drawer).

---

### Task 3: Build The 5 Default Widget Cards

**Required skills:** `building-native-ui`, `react-native-unistyles-v3`, `vercel-composition-patterns`

**Files:**

- Create: `apps/native/components/widgets/weather-widget.tsx`
- Create: `apps/native/components/widgets/clock-widget.tsx`
- Create: `apps/native/components/widgets/calendar-widget.tsx`
- Create: `apps/native/components/widgets/battery-widget.tsx`
- Create: `apps/native/components/widgets/music-widget.tsx`
- Create: `apps/native/components/widgets/widget-card.tsx` (shared wrapper)

**Step 1: Create a shared `WidgetCard` wrapper**

A reusable card component that provides:

- Card background color (from theme `colors.card`)
- Border (from theme `colors.border`)
- Border radius (from theme `borderRadius.xl`)
- Configurable opacity prop (default `1.0`)
- Consistent padding and spacing
- Optional title/label area

**Step 2: Build Weather widget**

Styled card with mock data:

- City name (e.g. "San Francisco")
- Large temperature number (e.g. "22°")
- Weather emoji/icon (e.g. "☀️")
- Condition text (e.g. "Sunny")
- High/low temps (e.g. "H: 25° L: 18°")

**Step 3: Build Clock/Date widget**

Styled card with mock data:

- Current time (e.g. "10:06")
- Current date with day name (e.g. "Saturday, March 21")
- Optional secondary info (e.g. "In 6 hours" or timezone)

**Step 4: Build Calendar widget**

Styled card with mock data:

- Mini calendar grid showing current month
- Today's date highlighted
- Next event preview (e.g. "Team Standup — 11:00 AM")

The mini calendar can be a simple 7-column grid of day numbers with the current day highlighted using the primary color.

**Step 5: Build Battery widget**

Styled card with mock data:

- Large battery percentage number (e.g. "87%")
- Battery icon (use a Text emoji or custom drawn icon)
- Status text (e.g. "On Battery" or "Charging")

**Step 6: Build Music widget**

Styled card with mock data:

- Album art placeholder (a colored square or rounded rectangle)
- Song name (e.g. "Blinding Lights")
- Artist name (e.g. "The Weeknd")
- Playback controls row: previous, play/pause, next (using Text emojis for UI-only)

**Step 7: Style all widgets consistently**

All widgets must:

- Use the shared `WidgetCard` wrapper
- Follow the existing theme tokens (colors, fontSize, spacing, borderRadius)
- Use `StyleSheet.create` from unistyles
- Feel like a direct extension of the current launcher visual language

---

### Task 4: Add Widget Panel Styles And Theme Tokens

**Required skills:** `react-native-unistyles-v3`, `building-native-ui`

**Files:**

- Modify: `apps/native/components/widget-panel.tsx` (styles)
- Modify: `apps/native/components/widgets/widget-card.tsx` (styles)

**Step 1: Add widget panel styles matching drawer patterns**

Create styles for:

- Panel container (absolute positioned, full screen, background color)
- Content area (padding matching drawer: insets.top + search bar clearance, horizontal md, bottom safe area)
- Section header (kicker + title, same as drawer)
- Scroll view (flex: 1)

**Step 2: Add widget card styles**

Create styles for:

- Card container (card bg, border, xl radius)
- Card content padding
- Card title/label text
- Card value/text hierarchy
- Widget-specific layout styles

**Step 3: Keep visual consistency with drawer**

The widget panel should feel like a sibling of the app drawer — same background, same section header style, same spacing rhythm. The only visual difference is the widget card content itself.

---

### Task 5: Build The Edit Widgets Screen

**Required skills:** `building-native-ui`, `reanimated-dnd`, `vercel-composition-patterns`, `react-native-unistyles-v3`

**Files:**

- Create: `apps/native/app/widgets/edit.tsx`
- Create: `apps/native/components/widgets/edit-widgets-list.tsx`

**Step 1: Create the Expo Router screen**

Add `app/widgets/edit.tsx` as a stack screen with:

- `headerShown: true`
- Title: "Edit Widgets"
- Standard back button to return to home

**Step 2: Build the draggable widget list**

Use `react-native-reanimated-dnd` to create a sortable list where each row contains:

- Drag handle (e.g. "⠿" or "⋮⋮" icon) on the left
- Widget preview (small card preview or icon + widget name) in the middle
- Delete/remove button (bin icon) on the right

**Step 3: Add "Add Widget" button at the bottom**

A button row at the bottom of the list that shows "Add Widget" with a "+" icon. For UI-only phase, this is a visual placeholder that does nothing when tapped.

**Step 4: Handle reorder persistence**

On drop completion, write the new widget order to storage (via a new widget config context or by extending the existing launcher config).

**Step 5: Handle widget removal**

Tapping the delete icon removes the widget from the list. The widget should be removed with an animation. At least 1 widget must remain (prevent removing all widgets).

---

### Task 6: Add Widget Configuration State

**Required skills:** `vercel-react-best-practices`

**Files:**

- Create: `apps/native/context/widget-config.tsx`
- Modify: `apps/native/app/_layout.tsx` (wrap provider)

**Step 1: Create a dedicated widget config store**

Do not overload the existing launcher config. Create a separate persisted store for widget concerns:

```ts
type WidgetConfigState = {
  widgetOrder: string[];
  widgetOpacity: number;
  activeWidgetIds: string[];
};
```

**Step 2: Add default widget definitions**

Define the 5 default widgets with stable IDs:

```ts
const DEFAULT_WIDGETS = [
  { id: "weather", label: "Weather" },
  { id: "clock", label: "Clock & Date" },
  { id: "calendar", label: "Calendar" },
  { id: "battery", label: "Battery" },
  { id: "music", label: "Music" },
] as const;
```

**Step 3: Persist widget order and opacity**

Use `expo-secure-store` (same as drawer metadata) to persist:

- Widget display order
- Widget card opacity
- Active widget IDs (which widgets are shown)

**Step 4: Provide derived selectors**

- Widgets in display order
- Active/inactive widget lists
- Widget opacity value

**Step 5: Wrap in the root layout**

Add `WidgetConfigProvider` inside the existing provider tree in `_layout.tsx`.

---

### Task 7: Connect Widget Panel To Configuration State

**Required skills:** `vercel-react-best-practices`, `vercel-react-native-skills`

**Files:**

- Modify: `apps/native/components/widget-panel.tsx`
- Modify: `apps/native/components/widgets/edit-widgets-list.tsx`

**Step 1: Read widget order from config**

The widget panel should render widgets in the order defined by `widgetConfig.state.widgetOrder`, filtering to only show widgets in `activeWidgetIds`.

**Step 2: Pass opacity to WidgetCard**

Each `WidgetCard` should receive the opacity value from `widgetConfig.state.widgetOpacity`.

**Step 3: Connect Edit screen to config actions**

The Edit Widgets screen should:

- Read widget order from config
- Call reorder action on drop
- Call remove action on delete
- Call add action on "Add Widget" tap (placeholder for now)

**Step 4: Navigate to Edit screen**

Wire the "Edit Widgets" button in the widget panel to `router.push("/widgets/edit")`.

---

### Task 8: Integrate Voltra For Native Platform Widgets (Future Phase)

**Required skills:** `voltra`

**Files:**

- Modify: `apps/native/app.json` (Voltra plugin config)
- Create: Voltra widget registration files (iOS and Android)
- Create: Widget definition files using Voltra JSX

**Note:** This task is a placeholder for the Voltra integration phase. The in-app widget panel (UI) is built with standard React Native components. Native home screen widgets (iOS WidgetKit, Android AppWidgets) will be built separately using Voltra.

**Step 1: Register widgets in Voltra plugin config**

Add widget entries to the Voltra plugin in `app.json`:

- Each of the 5 default widgets gets a registration entry
- Specify supported families (small, medium, large for iOS)
- Specify initial state paths

**Step 2: Build iOS widget UI with Voltra JSX**

For each widget, create a Voltra JSX tree using `Voltra` from `voltra`:

- Use `Voltra.VStack`, `Voltra.HStack`, `Voltra.Text`, `Voltra.Image` etc.
- Do not use plain React Native primitives inside Voltra widget trees
- Follow the same visual design as the in-app widget cards

**Step 3: Build Android widget UI with Voltra JSX**

For each widget, create a Voltra JSX tree using `VoltraAndroid` from `voltra/android`:

- Use Android-compatible Voltra components
- Do not use iOS Voltra components in Android widget code
- Follow Android widget design conventions

**Step 4: Add widget update APIs**

Use Voltra client APIs to update widget content:

- iOS: `updateWidget`, `scheduleWidget`, `reloadWidgets` from `voltra/client`
- Android: `updateAndroidWidget`, `reloadAndroidWidgets` from `voltra/android/client`

**Step 5: Add server-driven updates (optional)**

If real-time widget content is needed, set up `serverUpdate` with `createWidgetUpdateHandler` for push-based content delivery.

---

### Task 9: Validate Behavior, Performance, And Regressions

**Required skills:** `vercel-react-native-skills`, `vercel-react-best-practices`

**Step 1: Functional verification**

Verify:

- Swipe down on home screen opens widget panel
- Swipe up on home screen opens app drawer
- Both gestures work on the same home screen area without conflict
- Only one panel can be open at a time
- Widget panel shows all 5 default widgets with mock data
- Scroll-to-top then swipe down closes the widget panel
- Search bar stays visible on top of widget panel
- Home screen fades out when widget panel opens
- "Edit Widgets" navigates to the Edit screen
- Back button returns from Edit screen

**Step 2: Edit screen verification**

Verify:

- Widget list is draggable and reorderable
- Delete button removes a widget from the list
- At least 1 widget must remain
- "Add Widget" button is visible (placeholder)
- Widget order persists after relaunch
- Back navigation returns to home screen

**Step 3: Regression verification**

Verify:

- App drawer still opens/closes correctly
- Drawer search still works
- Drawer favorites/tags still work
- No crashes from gesture conflicts
- No performance regressions from the additional animated panel
- Back handler works for both panels

---

### Acceptance Criteria

- Swipe down on home screen opens widget panel (slides up from bottom)
- Widget panel is full-screen with scrollable content
- Search bar floats on top of widget panel
- 5 default widgets displayed as styled cards with mock data (Weather, Clock/Date, Calendar, Battery, Music)
- Widget cards use card background + border + xl radius with configurable opacity
- Panel header shows "Widgets" kicker + "My Widgets" title (drawer-style)
- Scroll-to-top then swipe down closes the widget panel
- Swipe up on home screen still opens app drawer
- Only one panel can be open at a time (mutual exclusion)
- Home screen fades out when either panel opens
- Edit Widgets screen accessible via button in widget panel
- Edit Widgets screen has draggable list with drag handle + preview + delete
- Widget order persists across app relaunches
- No regressions in existing drawer, search, or favorites functionality

---

### Implementation Notes

- Mirror the `AppDrawer` architecture for `WidgetPanel` — same shared value pattern, same gesture logic, same animation config
- Use a single bidirectional Pan gesture on the home screen instead of two separate gestures
- Keep widget config state in a dedicated store separate from launcher config and drawer metadata
- Use `react-native-reanimated-dnd` for the Edit screen reorder (same library already used in drawer edit sheet)
- Keep widget cards as pure presentational components with mock data for this phase
- Voltra native platform widgets are a separate future phase — the in-app panel uses standard React Native views
- Do not change unrelated launcher features (drawer, search, favorites, tags) in this phase

### Teting

- Use agent-devive to test the implement and make sure everythings is workign correctkly
- dev server is running in the tmux session you can reload laucnher and interbview with it via tmux
- load the agent device skils and use it validate your works
