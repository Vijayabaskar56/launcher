# Launcher UI Design

## Overview

Android-only home screen launcher app built with Expo (SDK 55), React Native 0.83, Reanimated, Gesture Handler, and Unistyles v3. This document covers the initial UI shell — gesture mechanics, layout, and mock placeholders. No real launcher functionality (app listing, launching) yet.

## Route Structure

Replace the existing drawer/tabs structure with:

```
app/
  _layout.tsx          Root Stack (no header, headerShown: false)
  index.tsx            Launcher home screen (single full-screen route)
  settings.tsx         Settings screen (Stack push)
```

Delete:

- `app/(drawer)/` (entire directory)
- `app/modal.tsx`

Keep:

- `app/+not-found.tsx`
- `app/+html.tsx`

## Components

All in `components/`:

| File                | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `search-bar.tsx`    | Floating search bar with inactive/active states + three-dot menu |
| `app-drawer.tsx`    | Animated full-screen panel with app grid                         |
| `app-icon.tsx`      | Single placeholder icon (circle + letter + label)                |
| `dock-row.tsx`      | Home screen dock (5-6 icons)                                     |
| `clock-display.tsx` | Static clock + subtitle placeholder                              |
| `popup-menu.tsx`    | Three-dot dropdown (Wallpaper, Settings, Help)                   |

## State Management

### Launcher Config Context

```ts
type LauncherConfig = {
  searchBarPosition: "top" | "bottom";
  gridColumns: number; // default 6, configurable later
};
```

- Backed by AsyncStorage for persistence
- Provided via React Context at root layout
- Settings screen reads/writes this context

### Animation State

- `drawerTranslateY` (Reanimated SharedValue) — from `SCREEN_HEIGHT` (closed) to `0` (open)
- Pan gesture on home screen drives the value
- Spring animation for snap (damping ~20, stiffness ~200)

## Screen Layout

### Home Screen (Drawer Closed)

When `searchBarPosition: 'top'`:

```
+----------------------------------+
| [Search bar - absolute, top]     |
|                                  |
|         [Clock: 10:06]           |
|        [In 6 hours]              |
|                                  |
|                                  |
|                                  |
|   [dock: 5-6 circular icons]    |
+----------------------------------+
```

When `searchBarPosition: 'bottom'`:

```
+----------------------------------+
|                                  |
|         [Clock: 10:06]           |
|        [In 6 hours]              |
|                                  |
|                                  |
|                                  |
|   [dock: 5-6 circular icons]    |
| [Search bar - absolute, bottom]  |
+----------------------------------+
```

### App Drawer (Drawer Open)

When `searchBarPosition: 'top'`:

```
+----------------------------------+
| [Search bar - absolute, top]     |
|                                  |
|  [A] [B] [C] [D] [E] [F]       |
|  [G] [H] [I] [J] [K] [L]       |
|  [M] [N] [O] [P] [Q] [R]       |
|  ... (scrollable FlatList)       |
|                                  |
+----------------------------------+
```

When `searchBarPosition: 'bottom'`:

```
+----------------------------------+
|                                  |
|  [A] [B] [C] [D] [E] [F]       |
|  [G] [H] [I] [J] [K] [L]       |
|  [M] [N] [O] [P] [Q] [R]       |
|  ... (scrollable FlatList)       |
|                                  |
| [Search bar - absolute, bottom]  |
+----------------------------------+
```

## Gesture & Animation

### Two States

- **Closed**: `drawerTranslateY = SCREEN_HEIGHT` (drawer off-screen below)
- **Open**: `drawerTranslateY = 0` (drawer fills screen)

### Pan Gesture (Home Screen)

- Swipe up: drawer animates in (translateY toward 0)
- Tracks finger during drag
- On release: snap open/closed based on velocity + distance threshold
- Spring animation config: `{ damping: 20, stiffness: 200 }`

### Pan Gesture (Drawer - Close)

- Swipe down: drawer animates out (translateY toward SCREEN_HEIGHT)
- Only triggers when inner FlatList scrollY === 0
- When FlatList scrollY > 0: normal scrolling behavior
- Requires Gesture.Simultaneous or Gesture.Race between pan and native scroll

### Crossfade

- Home content (clock, dock): `opacity = interpolate(translateY, [SCREEN_HEIGHT, 0], [1, 0])`
- Drawer: `opacity = interpolate(translateY, [SCREEN_HEIGHT, 0], [0, 1])`

### Search Bar

- `position: 'absolute'`, `zIndex: 999`
- Not affected by any animation
- Position determined by config context

## Search Bar Details

### Inactive State

```
[magnifying glass icon]  Search  ................  [three-dot menu]
```

### Active State (on tap)

```
[magnifying glass icon]  [TextInput]  [visibility icon]  [filter icon]  [three-dot menu]
```

- Tap on search bar: TextInput becomes editable, extra icons fade in
- Tap outside or back: deactivates, icons fade out
- Keyboard appears when active

### Three-Dot Popup Menu

- Absolutely positioned dropdown near the button
- Items: Wallpaper (placeholder), Settings (navigates to /settings), Help (placeholder)
- Dismiss on outside tap

## App Icon (Placeholder)

- Circular gray container (theme-driven color)
- Single letter centered inside (A through Z, repeated for 60 total)
- Label below: "App A", "App B", etc.
- Size responsive to grid columns

## Dock Row

- 5 circular placeholder icons
- Horizontal row with even spacing
- Letters: P, T, C, B, M (mimicking Phone, Tasks, Camera, Browser, Messages)
- Positioned above search bar (when bottom) or near bottom of screen (when top)
- Fades out when drawer opens

## Clock Display

- Static "10:06" in large bold text
- "In 6 hours" subtitle below
- Centered horizontally
- Upper portion of home screen
- Fades out when drawer opens

## Settings Screen

Stack screen pushed via `router.push('/settings')`.

Settings:

- **Search bar position**: Top / Bottom toggle
- **Grid columns**: Selector (4, 5, 6) — hardcoded to 6 for now, wired for future

Persisted via AsyncStorage.

## Theme Support

- Light and dark mode via Unistyles v3 adaptive themes (already configured)
- All colors referenced via `theme.colors.*`
- Theme switching follows system preference
- All components use `StyleSheet.create(theme => ...)` pattern

## Tech Stack

- Expo Router for navigation (Stack only)
- react-native-gesture-handler: Pan gesture for drawer
- react-native-reanimated: SharedValue, interpolate, spring animations
- react-native-unistyles v3: All styling, theme-reactive
- AsyncStorage: Settings persistence
- No external icon library for mock — using Text-based placeholders
