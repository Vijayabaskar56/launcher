# Theme & Color Scheme Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task.
>
> - `building-native-ui` for route structure, stack navigation, scroll views, and screen layout patterns
> - `heroui-native` for HeroUI component usage, `className` token classes, `useThemeColor` hook, and theming API
> - `vercel-react-native-skills` for React Native performance patterns, pressable interactions, and list rendering
> - `vercel-react-best-practices` for React state boundaries, context design, derived state, and component structure
> - `vercel-composition-patterns` for compound component architecture and reusable selection patterns
> - `react-native-unistyles-v3` for any Unistyles-specific styling (variants, theme functions)

**Goal:** Implement a theme/color scheme system where users can pick from 3 built-in theme presets (Default, High Contrast, Black & White) and customize an accent color from 14 curated swatches. Migrate all settings UI from hardcoded `rgba()` colors to HeroUI Native semantic tokens so theme changes are visible throughout the app.

**Reference Direction:** Match the Kvaesitso color scheme UI pattern:

- Color Scheme List screen: cards with radio selection, color preview swatches, theme name
- Color Scheme Detail screen: accent color picker with swatch grid
- Instant live preview: theme changes apply immediately across the entire settings UI
- Persisted selection: theme and accent color survive app restarts
- `+` button in header for future custom theme creation (coming soon placeholder)

**Architecture:** HeroUI Native's CSS variable theming via Uniwind. Theme presets defined as CSS `@variant` blocks in `global.css`, registered in `metro.config.js` via `extraThemes`. Runtime switching via `Uniwind.setTheme()`. Accent color stored in settings context and applied via `useThemeColor` hook + inline style overrides. All settings components migrated from hardcoded colors to HeroUI `className` tokens (`bg-background`, `text-foreground`, `bg-surface`, etc.).

**Tech Stack:** Expo Router, HeroUI Native, Uniwind, Tailwind CSS v4 (oklch color space), react-native-mmkv, `useThemeColor` hook

---

### Product Decisions Locked

- **Theme presets (3):** Default (HeroUI stock), High Contrast, Black & White
- **Each preset has light + dark variants** (6 CSS variants total; Default uses built-in light/dark)
- **Accent colors (14):** Red, Orange, Amber, Yellow, Lime, Green, Teal, Cyan, Blue, Indigo (default), Violet, Purple, Pink, Rose
- **Accent picker location:** Inside Color Scheme Detail screen (not on Appearance page)
- **No three-dot menu** on scheme cards (future feature)
- **`+` header button:** Shows "coming soon" Alert when pressed
- **Navigation flow:** Appearance → Color Scheme List → Color Scheme Detail (accent picker)
- **Routes:** `settings/color-scheme/index.tsx`, `settings/color-scheme/[id].tsx`, `settings/color-scheme/_layout.tsx`
- **Settings UI migration:** All settings components and pages migrated from hardcoded `rgba()`/`#000000` to HeroUI token classes
- **No preview component:** The live settings UI itself serves as the theme preview
- **Persistence:** New `themePreset` field in `ThemeSettings`, applied via `Uniwind.setTheme()` on startup

---

### Task 1: Define Theme CSS Variants in global.css

**Required skills:** `heroui-native` (load and read the Colors and Theming docs for the complete list of required CSS variables and the `@variant` syntax)

**Files:**

- Modify: `apps/native/global.css`

**Step 1: Read HeroUI's default theme variables**

Before writing any CSS, load the `heroui-native` skill and read the complete Default Theme variable list from the HeroUI Colors documentation. Every custom variant must define ALL of these variables. The required tokens are:

- **Base:** `--background`, `--foreground`
- **Surface:** `--surface`, `--surface-foreground`, `--surface-secondary`, `--surface-secondary-foreground`, `--surface-tertiary`, `--surface-tertiary-foreground`
- **Overlay:** `--overlay`, `--overlay-foreground`
- **Muted:** `--muted`
- **Default:** `--default`, `--default-foreground`
- **Accent:** `--accent`, `--accent-foreground`
- **Form fields:** `--field-background`, `--field-foreground`, `--field-placeholder`, `--field-border`
- **Status:** `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, `--danger`, `--danger-foreground`
- **Components:** `--segment`, `--segment-foreground`
- **Misc:** `--border`, `--separator`, `--focus`, `--link`
- **Shadows:** `--surface-shadow`, `--overlay-shadow`, `--field-shadow`

**Step 2: Define High Contrast light variant**

Add `@variant high-contrast-light` inside `@layer theme { :root { ... } }`. High Contrast should:

- Use boosted contrast ratios (WCAG AAA target)
- Darker text on lighter backgrounds (light mode)
- Stronger borders and separators
- Keep the same accent hue as default but with higher chroma
- All colors in `oklch()` format

**Step 3: Define High Contrast dark variant**

Add `@variant high-contrast-dark`. Same principle but inverted:

- Brighter text on very dark backgrounds
- Surface colors with more separation from background
- Stronger borders

**Step 4: Define Black & White light variant**

Add `@variant bw-light`. Pure grayscale:

- Background: pure white `oklch(1 0 0)`
- Foreground: pure black `oklch(0 0 0)`
- Surfaces: near-white grays
- Accent: black (inverted feel)
- No color hues anywhere — zero chroma on all tokens

**Step 5: Define Black & White dark variant**

Add `@variant bw-dark`. Pure inverted grayscale:

- Background: pure black `oklch(0 0 0)`
- Foreground: pure white `oklch(1 0 0)`
- Surfaces: near-black grays
- Accent: white
- No color hues — zero chroma

**Important:** Do NOT modify the default `@variant light` and `@variant dark` — those come from `heroui-native/styles` and should remain untouched.

---

### Task 2: Register Custom Themes in Metro Config

**Required skills:** `heroui-native` (read the Theming docs section on custom themes and `extraThemes` registration)

**Files:**

- Modify: `apps/native/metro.config.js`

**Step 1: Add extraThemes to Uniwind config**

The Default theme's `light` and `dark` variants are already registered by HeroUI. Only register the 4 custom variants:

```js
module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  extraThemes: [
    "high-contrast-light",
    "high-contrast-dark",
    "bw-light",
    "bw-dark",
  ],
});
```

**Step 2: Verify themes compile**

After modifying metro config, restart the metro bundler to ensure all 6 theme variants are recognized. Check for any CSS compilation errors.

---

### Task 3: Update Settings Types and Constants

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/types/settings.ts`

**Step 1: Add ThemePreset type**

```typescript
export type ThemePreset = "default" | "high-contrast" | "black-and-white";
```

**Step 2: Add themePreset to ThemeSettings**

```typescript
export interface ThemeSettings {
  colorScheme: ColorScheme; // "light" | "dark" | "system" (stays)
  themePreset: ThemePreset; // NEW — which color scheme preset
  accentColor: string; // hex from 14 swatches (stays)
  fontFamily: string;
  cornerRadius: number;
  transparency: number;
}
```

**Step 3: Update DEFAULT_SETTINGS**

Add `themePreset: "default"` to `DEFAULT_SETTINGS.appearance`.

**Step 4: Add ACCENT_COLORS constant**

```typescript
export const ACCENT_COLORS = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Lime", value: "#84CC16" },
  { name: "Green", value: "#22C55E" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
  { name: "Rose", value: "#F43F5E" },
] as const;
```

**Step 5: Add THEME_PRESETS constant for UI rendering**

```typescript
export const THEME_PRESETS = [
  {
    id: "default" as ThemePreset,
    name: "Default",
    description: "Standard theme with balanced colors",
    previewColors: ["#000000", "#6366F1", "#ffffff"], // 3 key swatches
  },
  {
    id: "high-contrast" as ThemePreset,
    name: "High Contrast",
    description: "Enhanced contrast for accessibility",
    previewColors: ["#000000", "#818CF8", "#ffffff"],
  },
  {
    id: "black-and-white" as ThemePreset,
    name: "Black & White",
    description: "Pure monochrome, no color",
    previewColors: ["#000000", "#ffffff", "#666666"],
  },
] as const;
```

---

### Task 4: Apply Theme on Startup and Change

**Required skills:** `heroui-native` (read the Theming docs for `Uniwind.setTheme()` API and theme switching), `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/context/settings.tsx`

**Step 1: Import Uniwind**

```typescript
import { Uniwind } from "uniwind";
```

**Step 2: Create theme resolution helper**

Create a function that maps `themePreset` + `colorScheme` to a Uniwind theme name:

```typescript
function resolveThemeName(preset: ThemePreset, scheme: ColorScheme): string {
  // Resolve "system" to actual light/dark using Appearance API
  const resolvedMode =
    scheme === "system" ? (Appearance.getColorScheme() ?? "dark") : scheme;

  if (preset === "default") return resolvedMode; // "light" or "dark"
  if (preset === "high-contrast") return `high-contrast-${resolvedMode}`;
  if (preset === "black-and-white") return `bw-${resolvedMode}`;
  return resolvedMode;
}
```

**Step 3: Add useEffect in SettingsProvider**

Call `Uniwind.setTheme()` whenever `themePreset` or `colorScheme` changes:

```typescript
useEffect(() => {
  const themeName = resolveThemeName(
    state.appearance.themePreset,
    state.appearance.colorScheme
  );
  Uniwind.setTheme(themeName);
}, [state.appearance.themePreset, state.appearance.colorScheme]);
```

**Step 4: Apply on initial load**

Also call the theme resolution on initial mount (inside the same `useEffect` or a separate initialization block) so the correct theme is applied before the first render.

**Step 5: Listen for system appearance changes**

If `colorScheme` is `"system"`, listen to `Appearance.addChangeListener` and re-apply the theme when the OS switches between light/dark.

---

### Task 5: Create Color Scheme Route Layout

**Required skills:** `building-native-ui` (read references for Stack navigation, route structure, and header configuration)

**Files:**

- Create: `apps/native/app/settings/color-scheme/_layout.tsx`

**Step 1: Create a nested Stack navigator**

```tsx
import { Stack } from "expo-router";

export default function ColorSchemeLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "#000000" },
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerShown: true,
        headerStyle: { backgroundColor: "#000000" },
        headerTintColor: "#ffffff",
        headerTitleAlign: "center",
        headerTitleStyle: {
          color: "#ffffff",
          fontSize: 17,
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerRight: /* + button component */,
          title: "Color Scheme",
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
```

**Important:** Use `bg-background` className (after migration in Task 8) instead of hardcoded `#000000`. During implementation, use the HeroUI token approach for header colors via `useThemeColor`.

---

### Task 6: Build Color Scheme List Screen

**Required skills:** `building-native-ui`, `heroui-native` (for `className` tokens and `useThemeColor`), `vercel-react-native-skills` (for Pressable patterns and list rendering), `vercel-composition-patterns` (for the scheme card component)

**Files:**

- Create: `apps/native/app/settings/color-scheme/index.tsx`

**Step 1: Create the SchemeCard component**

Each card displays:

- **Left:** Radio indicator — filled circle (`MaterialIcons: radio-button-checked`) for selected, empty circle (`radio-button-unchecked`) for unselected
- **Center:** Theme name text
- **Right:** 3 color preview swatches (small 20x20 rounded squares showing key colors from that preset's `previewColors` array)
- **Tap behavior:** Selects the theme → calls `updateAppearance({ themePreset: id })` → navigates to detail screen

Use `Pressable` with press state feedback (`bg-surface` → `bg-surface-hover` on press).

**Step 2: Create the header right `+` button**

A `Pressable` with `MaterialIcons: add` that shows `Alert.alert("Coming Soon", "Custom themes will be available in a future update.")` when pressed.

**Step 3: Build the list screen**

- `ScrollView` with `contentInsetAdjustmentBehavior="automatic"`
- Use `className="flex-1 bg-background"` for the scroll view
- Map over `THEME_PRESETS` and render a `SchemeCard` for each
- Cards wrapped in a container with `className="bg-surface"` and `borderRadius: 16`, `borderCurve: "continuous"`
- Read current `themePreset` from `SettingsContext` to determine which card is selected

**Step 4: Navigate on tap**

When a card is tapped:

1. Select the preset (update settings)
2. Navigate to detail: `router.push(\`/settings/color-scheme/\${preset.id}\`)`

---

### Task 7: Build Color Scheme Detail Screen (Accent Picker)

**Required skills:** `building-native-ui`, `heroui-native` (for `useThemeColor` and token classes), `vercel-react-native-skills` (for interaction patterns), `vercel-react-best-practices` (for state handling)

**Files:**

- Create: `apps/native/app/settings/color-scheme/[id].tsx`

**Step 1: Set up the screen**

- Read `id` from `useLocalSearchParams()`
- Find the matching preset from `THEME_PRESETS` to display the name
- Set the stack header title to the preset name via `<Stack.Screen options={{ title: presetName }} />`
- `ScrollView` with `className="flex-1 bg-background"` and `contentInsetAdjustmentBehavior="automatic"`

**Step 2: Build the "Accent Color" section**

Use `PreferenceCategory` with title "Accent Color".

**Step 3: Build the accent swatch grid**

- Render `ACCENT_COLORS` as a grid of circular swatches
- Layout: `flexDirection: "row"`, `flexWrap: "wrap"`, `gap: 12`, `paddingHorizontal: 16`
- Each swatch: 44x44 circle (`borderRadius: 22`, `borderCurve: "continuous"`)
- Background color: the swatch's hex value
- Selected swatch: white border ring (3px) with slight gap (use `borderWidth: 3`, `borderColor: foreground`)
- Unselected swatch: subtle border (`borderWidth: 1`, `borderColor: "rgba(255,255,255,0.1)"`)
- Tap: `updateAppearance({ accentColor: swatch.value })`

**Step 4: Read current accent from context**

Read `state.appearance.accentColor` from `SettingsContext` to determine which swatch is selected.

**Step 5: Add a "Preview" info text (optional)**

Below the swatch grid, add a subtle muted text: "Changes are applied instantly across the app."

---

### Task 8: Migrate Settings Components to HeroUI Tokens

**Required skills:** `heroui-native` (load and read the Colors docs, Styling docs, and `useThemeColor` hook reference), `vercel-react-native-skills`

**Files:**

- Modify: `apps/native/components/settings/preference-category.tsx`
- Modify: `apps/native/components/settings/preference-row.tsx`
- Modify: `apps/native/components/settings/switch-preference.tsx`
- Modify: `apps/native/components/settings/select-preference.tsx`
- Modify: `apps/native/components/settings/slider-preference.tsx`
- Modify: `apps/native/components/settings/text-preference.tsx`

**Migration rules:**

For each component, replace hardcoded colors with HeroUI semantic tokens:

| Hardcoded value                                | Replace with                                          |
| ---------------------------------------------- | ----------------------------------------------------- |
| `backgroundColor: "#000000"`                   | `className="bg-background"`                           |
| `color: "rgba(255, 255, 255, 0.9)"`            | `className="text-foreground"`                         |
| `color: "rgba(255, 255, 255, 0.5)"` or `0.4`   | `className="text-muted"`                              |
| `color: "rgba(255, 255, 255, 0.35)"` or `0.25` | `className="text-muted"` (or use `opacity` modifier)  |
| `backgroundColor: "rgba(255, 255, 255, 0.06)"` | `className="bg-surface"` or `className="bg-default"`  |
| `backgroundColor: "rgba(255, 255, 255, 0.08)"` | `className="bg-default"`                              |
| `backgroundColor: "rgba(255, 255, 255, 0.15)"` | `className="bg-default-hover"` or use `useThemeColor` |
| `borderColor: "rgba(255, 255, 255, 0.06)"`     | `className="border-border"`                           |
| `borderColor: "rgba(255, 255, 255, 0.2)"`      | `className="border-border-secondary"`                 |
| `color: "#ffffff"` on icons                    | Use `useThemeColor("foreground")` for dynamic color   |

**For press states (dynamic backgroundColor):**

Use `useThemeColor` hook to get resolved colors for `Pressable` `style` callbacks:

```tsx
const [surface, surfaceHover] = useThemeColor(["surface", "surfaceHover"]);

<Pressable
  style={({ pressed }) => ({
    backgroundColor: pressed ? surfaceHover : "transparent",
  })}
>
```

**Step 1: Migrate PreferenceCategory**

- Section title text: `className="text-muted"` with uppercase styling
- Description text: `className="text-muted"` with lower opacity
- Card container: `className="bg-surface"` with `borderRadius: 16`

**Step 2: Migrate PreferenceRow**

- Icon container: `className="bg-default"`
- Icon color: `useThemeColor("foreground")`
- Title: `className="text-foreground"`
- Summary: `className="text-muted"`
- Chevron: `useThemeColor("muted")`
- Press state: `useThemeColor(["surface", "surfaceHover"])`

**Step 3: Migrate SwitchPreference**

Same token pattern as PreferenceRow. Full row is a Pressable.

**Step 4: Migrate SelectPreference**

- Selected chip: `className="bg-accent"` or `useThemeColor("accent")` for border
- Unselected chip: `className="bg-default"`
- Selected text: `className="text-accent-foreground"`
- Unselected text: `className="text-muted"`

**Step 5: Migrate SliderPreference**

- Value badge: `className="bg-default"`
- Value text: `className="text-muted"`, use `fontVariant: ["tabular-nums"]`
- Title text: `className="text-foreground"`

**Step 6: Migrate TextPreference**

- Input container: `className="bg-default"` with `border-border`
- Input text: `className="text-foreground"`
- Placeholder: use `useThemeColor("fieldPlaceholder")`

---

### Task 9: Migrate All Settings Pages to HeroUI Tokens

**Required skills:** `heroui-native`, `building-native-ui`

**Files (12 pages):**

- Modify: `apps/native/app/settings/index.tsx`
- Modify: `apps/native/app/settings/appearance.tsx`
- Modify: `apps/native/app/settings/homescreen.tsx`
- Modify: `apps/native/app/settings/icons.tsx`
- Modify: `apps/native/app/settings/search.tsx`
- Modify: `apps/native/app/settings/gestures.tsx`
- Modify: `apps/native/app/settings/integrations.tsx`
- Modify: `apps/native/app/settings/locale.tsx`
- Modify: `apps/native/app/settings/plugins.tsx`
- Modify: `apps/native/app/settings/backup.tsx`
- Modify: `apps/native/app/settings/debug.tsx`
- Modify: `apps/native/app/settings/about.tsx`

**Step 1: Replace ScrollView backgrounds**

On every page, replace:

```tsx
style={{ backgroundColor: "#000000", flex: 1 }}
```

with:

```tsx
className = "flex-1 bg-background";
```

**Step 2: Replace inline-styled local components**

Pages like `backup.tsx`, `debug.tsx`, `about.tsx`, and `plugins.tsx` have local components (`BackupAction`, `DebugAction`, `AboutRow`, `AboutLink`) with hardcoded colors. Apply the same migration rules from Task 8.

**Step 3: Update settings index page**

The settings index has colored icon backgrounds per category (e.g., `iconBg="#8B5CF6"`). These decorative colors can stay hardcoded — they are brand accents, not theme-dependent. But the card backgrounds, text colors, separator colors, and chevrons should all use tokens.

**Step 4: Update settings layout**

Modify `apps/native/app/settings/_layout.tsx`:

- Use `useThemeColor("background")` for `headerStyle.backgroundColor` and `contentStyle.backgroundColor`
- Use `useThemeColor("foreground")` for `headerTintColor` and `headerTitleStyle.color`

---

### Task 10: Update Appearance Page — Add Color Scheme Navigation

**Required skills:** `building-native-ui`, `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/app/settings/appearance.tsx`

**Step 1: Replace inline Color Scheme selector with navigation row**

Remove the `SelectPreference` for Color Scheme. Replace with a `PreferenceRow` that navigates:

```tsx
<PreferenceRow
  icon="palette"
  title="Color Scheme"
  summary={currentPresetName} // resolved from THEME_PRESETS
  onPress={() => router.push("/settings/color-scheme")}
/>
```

**Step 2: Keep Light/Dark/System selector**

The `SelectPreference` for `colorScheme` (Light/Dark/System) stays on the Appearance page — this controls dark mode, which is separate from which theme preset is active.

**Step 3: Keep Corner Radius and Transparency sliders**

These stay as-is on the Appearance page.

---

### Task 11: Register Color Scheme Routes in Settings Layout

**Required skills:** `building-native-ui`

**Files:**

- Modify: `apps/native/app/settings/_layout.tsx`

**Step 1: Add color-scheme route**

```tsx
<Stack.Screen name="color-scheme" options={{ headerShown: false }} />
```

The `headerShown: false` is important because the color-scheme directory has its own `_layout.tsx` with its own Stack navigator and header configuration.

---

### Task 12: Handle Accent Color at Runtime

**Required skills:** `heroui-native` (for `useThemeColor` patterns), `vercel-react-best-practices` (for context design)

**Files:**

- Create: `apps/native/context/accent-color.tsx` (or extend existing settings context)

**Step 1: Determine accent color application strategy**

The accent color from user selection needs to override the theme's `--accent` token. Two approaches:

**Option A (preferred):** Create an `AccentColorProvider` that wraps the app and provides the selected accent hex + a computed foreground (white for all 14 saturated swatches). Components that render accent-colored elements read from this context via a `useAccentColor()` hook and apply via inline `style`.

**Option B:** If Uniwind supports runtime CSS variable overrides, dynamically set `--accent` and `--accent-foreground`. This would make `className="bg-accent"` work automatically. Investigate `Uniwind` API for this capability.

**Step 2: Apply accent color to key UI elements**

Components that should use the user's accent color:

- `SelectPreference` selected chip background and border
- `Switch` component track color (if customizable via HeroUI)
- Any `bg-accent` or `text-accent-foreground` usage
- Color scheme list — selected card accent border

**Step 3: Persist and restore**

The accent color is already in `ThemeSettings.accentColor` and persisted via MMKV. On startup, the `AccentColorProvider` reads from settings context and provides the value.

---

### Task 13: Validate Behavior and Regressions

**Required skills:** `vercel-react-native-skills`, `vercel-react-best-practices`

**Step 1: Theme switching verification**

Verify:

- App launches with Default dark theme applied
- Go to Settings → Appearance → Color Scheme
- 3 preset cards visible with radio selection and preview swatches
- Selecting "High Contrast" → settings UI immediately updates (text brighter, surfaces more separated)
- Selecting "Black & White" → pure monochrome UI, no color hues
- Selecting "Default" → returns to standard HeroUI theme

**Step 2: Accent color verification**

Verify:

- Tap a preset card → navigate to detail screen
- 14 accent swatches displayed in a grid
- Current accent (Indigo) has a selection ring
- Tapping a different swatch → accent-colored UI elements update immediately
- Selected swatch ring moves to the new color

**Step 3: Light/Dark mode verification**

Verify:

- On Appearance page, toggling Light/Dark/System changes the mode
- Theme preset + mode combination works (e.g., High Contrast + Light, Black & White + Dark)
- System mode follows OS preference

**Step 4: Persistence verification**

Verify:

- Select "High Contrast" preset + "Teal" accent
- Kill and restart the app
- App launches with High Contrast theme and Teal accent applied

**Step 5: Token migration verification**

Verify:

- All settings pages render correctly with the new token-based styling
- No hardcoded `#000000` or `rgba(255, 255, 255, ...)` remaining in settings components
- Theme changes are visible across all 12 settings pages
- Press states still work on all interactive elements
- Disabled states still dim correctly

**Step 6: Regression verification**

Verify:

- App drawer still opens/closes correctly
- Widget panel still works
- Home screen is unaffected
- No crashes from theme switching
- Performance remains smooth (no re-render storms)

---

### Acceptance Criteria

- 3 built-in theme presets selectable from a dedicated Color Scheme List screen
- 14 accent color swatches selectable from Color Scheme Detail screen
- Theme changes apply instantly and visibly across all settings UI
- Light/Dark/System mode toggle works in combination with any preset
- `+` button shows "coming soon" when pressed
- Selections persist across app restarts via MMKV
- All settings components use HeroUI semantic tokens (`bg-background`, `text-foreground`, `bg-surface`, etc.)
- No hardcoded color values remain in settings components or pages
- Navigation: Appearance → Color Scheme List → Color Scheme Detail works correctly with proper back navigation
- No regressions in existing launcher functionality (drawer, widgets, home screen)

---

### Implementation Notes

- Load the `heroui-native` skill before writing ANY CSS or component code — it contains the complete variable list and theming API
- Load `building-native-ui` before creating any new routes or screens — it has the route structure and Stack navigation patterns
- Use `oklch()` color space for all CSS variable values (HeroUI convention)
- Use `useThemeColor()` hook (from `heroui-native`) for any inline style that needs a theme color — do not use `className` inside `style` callbacks
- Use `className` for static styling, `style` with `useThemeColor` for dynamic/press states
- The settings index page's colored icon backgrounds (purple, blue, cyan, etc.) are decorative and should NOT be themeable — keep those hardcoded
- Keep the `headerTitleAlign: "center"` on all stack navigators (matches Kvaesitso reference)
- All new Pressable components should use `borderCurve: "continuous"` for rounded corners (Apple HIG)
- Do not change any non-settings screens (home, drawer, widgets) in this phase
- Schema migration: since we're adding `themePreset` to settings, ensure `lib/storage.ts` default-merge handles the new field for existing users

### Testing

- Use the dev server to test theme switching in real-time
- Test on both iOS and Android to verify Uniwind theme switching works cross-platform
- Verify all 6 theme variants render correctly (Default light/dark, High Contrast light/dark, B&W light/dark)
- Verify all 14 accent colors display correctly and have sufficient contrast
- Test rapid theme switching (tap between presets quickly) — should not crash or lag
