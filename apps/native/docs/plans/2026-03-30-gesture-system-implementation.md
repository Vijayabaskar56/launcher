# Gesture System Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task.
>
> - `creating-reanimated-animations` for gesture-driven animations, spring configs, useAnimatedStyle, entering/exiting transitions
> - `reanimated-skia-performance` for worklet-based gesture callbacks, shared value patterns, UI thread performance
> - `vercel-react-native-skills` for gesture handler composition, Reanimated shared values, native component patterns
> - `vercel-react-best-practices` for hook design, context boundaries, derived state, effect lifecycle
> - `heroui-native` for HeroUI component usage, `className` token classes, `useThemeColor` hook
> - `building-components` for accessible, composable settings components
> - `react-native-best-practices` for gesture handler best practices, performance patterns, New Architecture considerations

**Goal:** Replace the current hardcoded vertical-only pan gesture with a Kvaesitso-inspired configurable gesture system. Users can bind any of 6 gestures (swipe up/down/left/right, double tap, long press) to any action (search, notifications, app drawer, widgets, launch app, etc.) from a settings screen. The gesture detector prevents accidental triggers using directional locking, rubberband thresholds, velocity gating, and scroll-boundary awareness.

**Reference:** [Kvaesitso LauncherScaffold.kt](https://github.com/MM2-0/Kvaesitso/blob/main/app/ui/src/main/java/de/mm20/launcher2/ui/launcher/scaffold/LauncherScaffold.kt) — gesture detection, thresholds, directional locking, haptic feedback

---

### Product Decisions Locked

- **Gesture detection:** Unified detector with directional locking after touch slop — single `Gesture.Pan()` tracking both axes
- **Tap gestures:** Composed with pan via `Gesture.Exclusive(pan, doubleTap, longPress)` — RNGH handles priority
- **Activation model:** Rubberband + velocity — ~60dp drag threshold OR >500dp/s velocity to trigger
- **Scroll conflicts:** Boundary-aware — gestures only activate at scroll boundaries (isAtTop/isAtBottom)
- **Haptic feedback:** Full model — threshold crossing, long press detection, action completion
- **Animation styles:** 3 types — Rubberband (pull-to-reveal), Push (full-screen slide), ZoomIn (fade+scale for taps)
- **Action dispatch:** Registry mapping action IDs to handler functions
- **Launch app action:** Included — users pick any installed app to bind to a gesture
- **Settings UI:** Match Kvaesitso — gesture rows with icons, tapping opens bottom sheet with radio options
- **Platform-limited actions:** Shown with warning badges, not hidden
- **Drawer safety:** Always accessible via at least one gesture or dock
- **Widget targets:** Single widget panel (no left/right pages)
- **Default bindings:** Swipe Down → Notifications, Swipe Up → App Drawer, Double Tap → Lock Screen, all others → None

---

### Packages to Install

```bash
npx expo install expo-haptics
```

`expo-haptics` for haptic feedback. `react-native-gesture-handler` and `react-native-reanimated` are already installed.

---

### Task 1: Install expo-haptics

**Required skills:** `building-native-ui`

**Files:**

- Modify: `apps/native/package.json`

**Step 1: Install**

```bash
npx expo install expo-haptics
```

**Step 2: Verify**

Run `npx expo doctor` to confirm compatibility with Expo SDK.

**Step 3: Commit**

```
chore: install expo-haptics for gesture feedback
```

---

### Task 2: Extend Gesture Types with Launch App Action

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/types/settings.ts`

**Step 1: Add `launch-app` and `widgets` to GestureAction**

Extend the `GestureAction` type to include `launch-app` and `widgets`. Add a `LaunchAppGestureConfig` interface for storing the selected app's details:

```ts
export type GestureAction =
  | "none"
  | "search"
  | "notifications"
  | "quick-settings"
  | "app-drawer"
  | "widgets"
  | "recents"
  | "power-menu"
  | "lock-screen"
  | "launch-app";

export interface LaunchAppBinding {
  packageName: string; // Android package name or iOS bundle ID
  label: string; // Display name for the settings UI
}

export interface GestureSettings {
  swipeDown: GestureAction;
  swipeUp: GestureAction;
  swipeLeft: GestureAction;
  swipeRight: GestureAction;
  doubleTap: GestureAction;
  longPress: GestureAction;
  launchAppBindings: Record<string, LaunchAppBinding>; // keyed by gesture name
}
```

**Step 2: Update DEFAULT_SETTINGS**

Add `widgets` as a recognized action. Add empty `launchAppBindings: {}` to default gesture settings.

**Step 3: Commit**

```
feat: extend gesture types with launch-app and widgets actions
```

---

### Task 3: Build Gesture Action Registry

**Required skills:** `vercel-react-best-practices`, `vercel-react-native-skills`

**Files:**

- Create: `apps/native/lib/gesture-actions.ts`

**Step 1: Define the action registry**

Create a registry that maps `GestureAction` IDs to handler functions. Each handler receives a context object with navigation, settings, and shared values:

```ts
import type { GestureAction } from "@/types/settings";

interface GestureActionContext {
  openDrawer: () => void;
  openWidgetPanel: () => void;
  openSearch: () => void;
  openNotifications: () => void;
  openQuickSettings: () => void;
  openRecents: () => void;
  openPowerMenu: () => void;
  lockScreen: () => void;
  launchApp: (packageName: string) => void;
}

type GestureActionHandler = (ctx: GestureActionContext) => void;

const actionRegistry: Record<GestureAction, GestureActionHandler> = {
  none: () => {},
  search: (ctx) => ctx.openSearch(),
  notifications: (ctx) => ctx.openNotifications(),
  "quick-settings": (ctx) => ctx.openQuickSettings(),
  "app-drawer": (ctx) => ctx.openDrawer(),
  widgets: (ctx) => ctx.openWidgetPanel(),
  recents: (ctx) => ctx.openRecents(),
  "power-menu": (ctx) => ctx.openPowerMenu(),
  "lock-screen": (ctx) => ctx.lockScreen(),
  "launch-app": () => {}, // handled specially with package name
};

export function executeGestureAction(
  action: GestureAction,
  ctx: GestureActionContext,
  launchAppPackage?: string
): void;
```

**Step 2: Define animation style mapping**

Map each action to its preferred animation style:

```ts
export type GestureAnimationStyle = "rubberband" | "push" | "zoomIn";

export function getAnimationStyle(action: GestureAction): GestureAnimationStyle;
```

- Rubberband: `notifications`, `quick-settings`, `widgets`
- Push: `app-drawer`, `search`, `recents`
- ZoomIn: `lock-screen`, `power-menu`, `launch-app`
- None: `none`

**Step 3: Define permission requirements**

Map actions that need native module access to their requirements:

```ts
export interface ActionPermission {
  required: boolean;
  description: string;
  checkAvailable: () => boolean;
}

export function getActionPermission(
  action: GestureAction
): ActionPermission | null;
```

- `notifications` → Needs native module (IntentLauncher or custom module)
- `quick-settings` → Needs native module
- `recents` → Needs Accessibility service
- `power-menu` → Needs Accessibility service
- `lock-screen` → Needs Device Admin or Accessibility
- Others → No special permission

**Step 4: Commit**

```
feat: add gesture action registry with animation styles and permissions
```

---

### Task 4: Build Unified Gesture Detector Hook

**Required skills:** `creating-reanimated-animations`, `reanimated-skia-performance`, `vercel-react-native-skills`

**Files:**

- Create: `apps/native/hooks/use-homescreen-gestures.ts`

This is the core of the implementation — the Kvaesitso-equivalent gesture state machine running entirely on the UI thread.

**Step 1: Define gesture direction detection**

Implement `getSwipeDirection()` worklet that determines the dominant swipe direction by comparing X and Y offsets in quadrants (matching Kvaesitso's `getSwipeDirection()` at LauncherScaffold.kt:551-594):

```ts
type SwipeDirection = "up" | "down" | "left" | "right" | null;

function getSwipeDirection(
  offsetX: number,
  offsetY: number,
  touchSlop: number
): SwipeDirection;
```

- Compare absolute X vs Y to determine dominant axis
- Only resolve direction after both exceed touch slop (platform default ~10dp)
- Lock to the dominant axis once determined
- Check quadrants: (+x, +y) → right or down; (+x, -y) → right or up; etc.

**Step 2: Build the unified pan gesture**

Single `Gesture.Pan()` that:

- `onStart`: Reset direction, drag offset, threshold-crossed state
- `onUpdate`: After touch slop, determine and lock direction. Track drag progress as shared values. When drag exceeds 60dp threshold, trigger haptic via `runOnJS`. Apply rubberband physics (elastic resistance past threshold).
- `onEnd`: If threshold was crossed OR velocity > 500dp/s in the locked direction, fire the configured action via `runOnJS`. Otherwise, animate back to rest. Reset all state.

Key shared values:

```ts
const gestureDirection = useSharedValue<SwipeDirection>(null);
const dragProgress = useSharedValue(0); // 0 to 1, clamped
const thresholdCrossed = useSharedValue(false);
const isGestureActive = useSharedValue(false);
```

**Step 3: Compose with tap gestures**

```ts
const doubleTapGesture = Gesture.Tap()
  .numberOfTaps(2)
  .onEnd(() => {
    runOnJS(executeDoubleTap)();
  });

const longPressGesture = Gesture.LongPress()
  .minDuration(500)
  .onStart(() => {
    runOnJS(executeLongPress)();
  });

const composedGesture = Gesture.Exclusive(
  panGesture,
  doubleTapGesture,
  longPressGesture
);
```

**Step 4: Haptic feedback integration**

```ts
import * as Haptics from "expo-haptics";

function triggerThresholdHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

function triggerActionHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function triggerLongPressHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}
```

**Step 5: Return the composed gesture and animation values**

```ts
interface UseHomescreenGesturesResult {
  gesture: GestureType;
  dragProgress: SharedValue<number>; // 0-1 for animation driving
  gestureDirection: SharedValue<SwipeDirection>;
  isGestureActive: SharedValue<boolean>;
}
```

**Step 6: Commit**

```
feat: build unified gesture detector with directional locking and haptics
```

---

### Task 5: Build Gesture Animation System

**Required skills:** `creating-reanimated-animations`, `reanimated-skia-performance`

**Files:**

- Create: `apps/native/hooks/use-gesture-animations.ts`

**Step 1: Rubberband animation**

Elastic pull-to-reveal effect for notifications/widgets. The content follows the finger with increasing resistance:

```ts
function rubberband(distance: number, threshold: number): number {
  // Returns clamped distance with elastic resistance past threshold
  // At threshold: returns threshold
  // Past threshold: asymptotically approaches threshold * 1.5
  if (distance <= threshold) return distance;
  const overflow = distance - threshold;
  return threshold + overflow * (1 / (1 + overflow / (threshold * 0.5)));
}
```

Drive panel translateY from `dragProgress` shared value.

**Step 2: Push animation**

Full-screen slide transition. Panel slides in from the gesture direction following the finger 1:1 until threshold, then snaps open/closed:

- Swipe up → panel slides up from bottom
- Swipe down → panel slides down from top
- Swipe left/right → panel slides from corresponding edge

**Step 3: ZoomIn animation**

For tap-triggered actions. Fade in + scale from 0.9 to 1.0 over 200ms:

```ts
const zoomInStyle = useAnimatedStyle(() => ({
  opacity: withTiming(isActive.value ? 1 : 0, { duration: 200 }),
  transform: [
    { scale: withTiming(isActive.value ? 1 : 0.9, { duration: 200 }) },
  ],
}));
```

**Step 4: Export animation style factory**

```ts
function useGestureAnimation(
  style: GestureAnimationStyle,
  dragProgress: SharedValue<number>,
  direction: SharedValue<SwipeDirection>,
  screenHeight: number,
  screenWidth: number
): { animatedStyle: AnimatedStyle };
```

**Step 5: Commit**

```
feat: add rubberband, push, and zoomIn gesture animation styles
```

---

### Task 6: Refactor Homescreen to Use Configurable Gestures

**Required skills:** `vercel-react-native-skills`, `vercel-react-best-practices`, `creating-reanimated-animations`

**Files:**

- Modify: `apps/native/app/index.tsx`

This is the largest task — replacing the hardcoded pan gesture with the configurable system.

**Step 1: Replace the current pan gesture**

Remove the existing `Gesture.Pan()` at lines 93-137 and the `gestureDirection` shared value. Replace with the `useHomescreenGestures` hook:

```ts
const { gesture, dragProgress, gestureDirection, isGestureActive } =
  useHomescreenGestures({
    gestures: settings.state.gestures,
    actionContext: {
      openDrawer: () => {
        drawerTranslateY.value = withTiming(0, TIMING_CONFIG);
      },
      openWidgetPanel: () => {
        widgetPanelTranslateY.value = withTiming(0, TIMING_CONFIG);
      },
      openSearch: handleSearchActivate,
      openNotifications: () => {
        /* native module call */
      },
      openQuickSettings: () => {
        /* native module call */
      },
      openRecents: () => {
        /* native module call */
      },
      openPowerMenu: () => {
        /* native module call */
      },
      lockScreen: () => {
        /* native module call */
      },
      launchApp: (pkg) => {
        /* Linking or IntentLauncher */
      },
    },
    launchAppBindings: settings.state.gestures.launchAppBindings,
  });
```

**Step 2: Drive panel animations from gesture state**

Instead of directly setting `drawerTranslateY` in the pan handler, drive panel positions from `dragProgress` and `gestureDirection`:

```ts
const drawerAnimStyle = useAnimatedStyle(() => {
  if (gestureDirection.value === "up" && isGestureActive.value) {
    // Follow finger during gesture
    return {
      transform: [{ translateY: (1 - dragProgress.value) * screenHeight }],
    };
  }
  return { transform: [{ translateY: drawerTranslateY.value }] };
});
```

**Step 3: Wire action context handlers**

Implement the action context functions. For actions that need native modules (`notifications`, `quick-settings`, `recents`, `power-menu`, `lock-screen`), use `expo-intent-launcher` on Android or show a "not available" toast:

```ts
import * as IntentLauncher from "expo-intent-launcher";

openNotifications: () => {
  // Android: expand status bar via native module
  // iOS: not available — show toast
};
```

For `launch-app`:

```ts
import { Linking } from "react-native";

launchApp: (packageName: string) => {
  Linking.openURL(`package:${packageName}`);
  // Or use expo-intent-launcher for Android
};
```

**Step 4: Add horizontal gesture support**

The current homescreen only has vertical panels (drawer slides up, widgets slide down). For horizontal gestures, the widget panel or other panels need to support sliding from left/right. If the action is `widgets` bound to swipe-left, slide the widget panel in from the left edge.

**Step 5: Ensure drawer safety**

After gesture config is read, check if at least one gesture maps to `app-drawer`. If not, ensure the dock has a drawer access button or prevent unbinding the last drawer gesture.

**Step 6: Commit**

```
feat: refactor homescreen to use configurable gesture system
```

---

### Task 7: Add Scroll Boundary Awareness

**Required skills:** `vercel-react-native-skills`, `reanimated-skia-performance`

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`
- Modify: `apps/native/components/widget-panel.tsx`
- Modify: `apps/native/hooks/use-homescreen-gestures.ts`

**Step 1: Track scroll position in panels**

Add scroll position tracking to the app drawer and widget panel. Expose `isAtTop` and `isAtBottom` shared values:

```ts
const scrollY = useSharedValue(0);
const isAtTop = useDerivedValue(() => scrollY.value <= 0);
const isAtBottom = useDerivedValue(() => /* check against content height */);
```

Use `onScroll` with `useAnimatedScrollHandler` to update `scrollY`.

**Step 2: Pass scroll state to gesture detector**

The homescreen gesture detector should receive `isAtTop`/`isAtBottom` from the currently open panel. When the drawer is open and the user is scrolled partway through the app list, swipe-down should scroll the list — NOT open the widget panel.

```ts
useHomescreenGestures({
  // ...
  scrollBoundary: {
    isAtTop: drawerIsAtTop,
    isAtBottom: drawerIsAtBottom,
    isPanelOpen: isDrawerOpen || isWidgetPanelOpen,
  },
});
```

**Step 3: Gate gestures on scroll position**

In the gesture detector worklet, only allow:

- Swipe down when `isAtTop === true` (or no panel is open)
- Swipe up when `isAtBottom === true` (or no panel is open)
- Horizontal swipes always (they don't conflict with vertical scroll)

**Step 4: Commit**

```
feat: add scroll-boundary-aware gesture gating
```

---

### Task 8: Revamp Gesture Settings UI

**Required skills:** `heroui-native`, `building-components`, `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/app/settings/gestures.tsx`
- Create: `apps/native/components/settings/gesture-action-sheet.tsx`
- Create: `apps/native/components/settings/app-picker-sheet.tsx`

**Step 1: Redesign gesture settings rows**

Replace the current `SelectPreference` pill-based UI with Kvaesitso-style rows. Each row shows:

- **Icon:** Direction arrow (swipe-up, swipe-down, etc.) or tap icon
- **Title:** "Swipe Down", "Double Tap", etc.
- **Subtitle:** Current action name (e.g., "Open search", "Launch Google")
- **App icon:** If action is `launch-app`, show the bound app's icon on the right

Tapping a row opens the action bottom sheet.

```tsx
<GestureRow
  icon="swipe-down"
  title="Swipe Down"
  currentAction={gestures.swipeDown}
  appBinding={gestures.launchAppBindings?.swipeDown}
  onPress={() => openActionSheet("swipeDown")}
/>
```

**Step 2: Build gesture action bottom sheet**

A bottom sheet (using `@gorhom/bottom-sheet` or a simple Modal) with radio options matching Kvaesitso's picker:

- Do nothing
- Open notification drawer
- Open quick settings
- Turn off screen
- Open recent apps
- Show power menu
- Open search
- Widgets
- App Drawer
- Launch app → selecting this opens the app picker (Step 3)

Each option shows a radio button. Actions requiring permissions show a lock icon with description. Selecting an option immediately updates settings and closes the sheet.

**Step 3: Build app picker sheet**

When user selects "Launch app", open a secondary sheet showing installed apps:

- Search bar at top to filter
- Scrollable list of installed apps with icons and names
- Uses the same app list from the launcher's app data
- Selecting an app saves the binding and returns to the gesture settings

**Step 4: Update GESTURE_OPTIONS**

Add `widgets` and `launch-app` to the options list. Add human-readable descriptions for each action.

**Step 5: Commit**

```
feat: revamp gesture settings UI with action sheets and app picker
```

---

### Task 9: Add Permission Warnings

**Required skills:** `heroui-native`, `building-components`

**Files:**

- Modify: `apps/native/components/settings/gesture-action-sheet.tsx`

**Step 1: Check action availability**

For each action in the bottom sheet, call `getActionPermission()` from the action registry. If the action requires a permission/native module that isn't available:

- Show a warning icon (lock or exclamation) next to the action label
- Show a subtitle explaining what's needed: "Requires Accessibility service" or "Not available on iOS"
- Still allow selection — but show a confirmation dialog explaining the limitation

**Step 2: Handle failed gesture execution**

If a gesture fires an action that fails (e.g., `lock-screen` without Device Admin), show a toast/snackbar:

```
"Lock Screen requires additional permissions. Open Settings → Gestures to change this binding."
```

**Step 3: Commit**

```
feat: add permission warnings for platform-limited gesture actions
```

---

### Task 10: Validate Gesture System

**Step 1: Swipe gestures**

- Swipe up → configured action fires (default: app drawer slides up)
- Swipe down → configured action fires (default: notifications)
- Swipe left → configured action fires (default: none)
- Swipe right → configured action fires (default: none)
- Gestures don't interfere — no "jumping" between actions
- Directional locking works — diagonal swipe locks to dominant axis

**Step 2: Tap gestures**

- Double tap → configured action fires (default: lock screen)
- Long press → configured action fires (default: none)
- Taps don't interfere with pan gestures — if you start swiping, taps cancel

**Step 3: Threshold behavior**

- Small accidental touches (<60dp, low velocity) do NOT trigger any action
- Quick flicks (>500dp/s) trigger even with small drag distance
- Haptic fires exactly once when crossing 60dp threshold
- Rubberband resistance is visible past threshold

**Step 4: Scroll conflict**

- With app drawer open and scrolled partway: swipe down scrolls list, NOT triggering widget panel
- At top of drawer: swipe down dismisses drawer
- At bottom of drawer: swipe up does NOT re-open drawer

**Step 5: Settings UI**

- All 6 gesture rows display correct current action
- Tapping opens bottom sheet with all action options
- Selecting "Launch app" opens app picker
- Selected app icon and name display in gesture row
- Permission-limited actions show warning badges
- Changes persist after app restart

**Step 6: Animation styles**

- Rubberband: elastic feel when pulling notifications/widgets
- Push: smooth slide for drawer/search
- ZoomIn: fade+scale for tap-triggered actions
- All animations are interruptible (can cancel mid-gesture)

**Step 7: Edge cases**

- Binding same action to multiple gestures works
- Unbinding all drawer gestures shows dock access button
- Changing gesture config while on homescreen takes effect immediately
- Back button still dismisses open panels

---

### Acceptance Criteria

- Unified gesture detector with directional locking replaces hardcoded vertical pan
- 6 configurable gestures: swipe up/down/left/right, double tap, long press
- 10 action types including Launch App with app picker
- Rubberband threshold (60dp) + velocity gating (500dp/s) prevents accidental triggers
- Full haptic feedback model (threshold crossing, long press, action completion)
- 3 animation styles (rubberband, push, zoomIn) matched to action types
- Scroll-boundary-aware gesture gating prevents conflicts with scrollable content
- Kvaesitso-matching settings UI with bottom sheet action picker
- Permission warnings for platform-limited actions
- Drawer always accessible via at least one binding or dock
- No regressions in existing drawer/widget panel/search behavior
- Run `bun x ultracite fix` before each commit

---

### Implementation Notes

- All gesture detection runs on the UI thread via Reanimated worklets — no JS thread roundtrips during drag
- `runOnJS` is only used to fire the action handler after gesture completes and for haptic feedback
- The `expo-haptics` API must be called from JS thread — use `runOnJS(triggerHaptic)()` in worklets
- Touch slop uses the platform default (~10dp on Android, ~8pt on iOS) via `Gesture.Pan().minDistance()`
- The rubberband physics formula matches Kvaesitso: `threshold + overflow * (1 / (1 + overflow / (threshold * 0.5)))`
- `Gesture.Exclusive()` ensures pan takes priority over taps — if the finger moves, tap/longpress cancel
- For native actions (notifications, lock screen), initial implementation can show "Coming soon" toasts. Wire native modules in a follow-up task.
- `launchAppBindings` is a `Record<string, LaunchAppBinding>` keyed by gesture name (e.g., `"swipeRight"`) to support different apps per gesture

### Phase 2 (Future)

- Native module bridge for notification drawer, quick settings, recents, power menu, lock screen
- Pinch gesture for widget resize
- Custom gesture sensitivity slider in settings
- Gesture tutorial/onboarding overlay
- Per-gesture animation style override in settings
