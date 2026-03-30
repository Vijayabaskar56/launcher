# Directional Panel Animation Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task. **Do NOT reload a skill if it is already loaded in the current conversation context** — check what's already loaded before invoking the Skill tool. Only load skills that are new for the current task.
>
> - `creating-reanimated-animations` for withTiming, useAnimatedStyle, interpolate, shared value animation patterns
> - `reanimated-skia-performance` for worklet-based shared value mutations, UI thread performance
> - `react-native-best-practices` → `references/gestures/SKILL.md` for Pan gesture composition, activeOffsetX/failOffsetY, direction locking, dismiss gestures
> - `react-native-best-practices` → `references/gestures/continuous-gestures.md` for Pan direction lock, fling with decay
> - `react-native-best-practices` → `references/gestures/gesture-composition.md` for Pan inside ScrollView, cross-component gesture relations
> - `vercel-react-native-skills` for Reanimated shared values, animation performance, native component patterns
> - `vercel-react-best-practices` for hook design, derived state, effect lifecycle

**Goal:** Make panels slide from the correct edge based on swipe direction, matching Kvaesitso's directional model. Currently both AppDrawer and WidgetPanel always slide up from the bottom regardless of which gesture triggered them. After this change, swipe-right opens a panel from the left edge, swipe-down opens from the top, etc. Dismiss gestures reverse the direction.

**Reference Direction:** Match Kvaesitso's `LauncherScaffold.kt` directional model:

- Swipe up → panel slides from bottom
- Swipe down → panel slides from top
- Swipe left → panel slides from right
- Swipe right → panel slides from left
- Dismiss = reverse swipe back toward origin edge
- Home content slides 30% in swipe direction + fades ("push aside" effect)
- Back button animates panel back to origin edge

**Architecture:** Each panel receives a `slideFrom` shared value (`'top'|'bottom'|'left'|'right'`) and an `offset` shared value. The offset represents position along one axis — positive = off-screen at origin, zero = fully visible. The axis (X or Y) is derived from `slideFrom`. Panels compute their own `translateX`/`translateY` from these two values. Dismiss pan gestures read `slideFrom` to know which axis and direction to track.

---

### Product Decisions Locked

- **Direction-aware panels** — AppDrawer and WidgetPanel each receive `slideFrom` + `offset` shared values
- **Single axis per open** — panel uses either translateX or translateY, never both simultaneously
- **Reverse dismiss** — if panel slid from left, dismiss by swiping left (pushing it back)
- **Home "push aside" effect** — home content translates 30% in the swipe direction + fades
- **Back button** — animates panel back to origin edge (same animation as swipe dismiss)
- **No horizontal scroll conflict** — panels only have vertical ScrollViews; horizontal dismiss won't conflict
- **Shared values for direction** — `drawerSlideFrom` and `widgetSlideFrom` set by gesture system before triggering open
- **isOpen detection** — uses `offset < 10` (same threshold as current `translateY < 10`)

### Directional Offset Model

| slideFrom | Off-screen position   | Visible position | Axis                     | Dismiss direction |
| --------- | --------------------- | ---------------- | ------------------------ | ----------------- |
| `bottom`  | offset = screenHeight | offset = 0       | Y (translateY = +offset) | Swipe down        |
| `top`     | offset = screenHeight | offset = 0       | Y (translateY = -offset) | Swipe up          |
| `right`   | offset = screenWidth  | offset = 0       | X (translateX = +offset) | Swipe right       |
| `left`    | offset = screenWidth  | offset = 0       | X (translateX = -offset) | Swipe left        |

The `offset` is always a positive number representing distance from visible position. The sign and axis are derived from `slideFrom`. This simplifies the animation math — panels only track one number.

---

### Task 1: Create Directional Panel Utility Hook

**Required skills:** `creating-reanimated-animations`, `vercel-react-best-practices`

**Files:**

- Create: `apps/native/hooks/use-directional-panel.ts`

**Step 1: Define the SlideFrom type and utility hook**

```ts
export type SlideFrom = "top" | "bottom" | "left" | "right";

interface UseDirectionalPanelConfig {
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
  screenHeight: number;
  screenWidth: number;
}

interface UseDirectionalPanelResult {
  animatedStyle: AnimatedStyle;
  isOpen: boolean; // JS-thread state for React rendering
}
```

**Step 2: Compute animated style from offset + slideFrom**

```ts
// In a useAnimatedStyle:
const dir = slideFrom.value;
const off = offset.value;

if (dir === "bottom") return { transform: [{ translateY: off }] };
if (dir === "top") return { transform: [{ translateY: -off }] };
if (dir === "right") return { transform: [{ translateX: off }] };
if (dir === "left") return { transform: [{ translateX: -off }] };
```

Also compute opacity: `interpolate(offset, [screenSize, 0], [0, 1])` where screenSize is screenHeight for vertical, screenWidth for horizontal.

**Step 3: Track isOpen state**

Use `useAnimatedReaction` to detect `offset.value < 10` and sync to JS thread via `scheduleOnRN`.

**Step 4: Commit**

```
feat: add useDirectionalPanel hook for axis-aware panel animation
```

---

### Task 2: Create Directional Dismiss Gesture Hook

**Required skills:** `react-native-best-practices` → `references/gestures/continuous-gestures.md`, `react-native-best-practices` → `references/gestures/gesture-composition.md`

**Files:**

- Create: `apps/native/hooks/use-directional-dismiss.ts`

**Step 1: Build a dismiss Pan gesture that reads slideFrom**

The dismiss gesture must:

- Track the correct axis based on `slideFrom` (X for left/right, Y for top/bottom)
- Only activate when the user swipes **toward the origin edge** (reverse of open direction)
- Respect scroll position — only activate when scrolled to the appropriate edge
- Use `activeOffsetX`/`activeOffsetY` and `failOffsetX`/`failOffsetY` for direction locking

```ts
interface UseDirectionalDismissConfig {
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
  scrollOffset: SharedValue<number>;
  screenHeight: number;
  screenWidth: number;
}
```

**Step 2: Dismiss direction logic**

| slideFrom | Dismiss on                          | Pan config                                   |
| --------- | ----------------------------------- | -------------------------------------------- |
| `bottom`  | Swipe down (positive translationY)  | `activeOffsetY(10)`, `failOffsetX([-5, 5])`  |
| `top`     | Swipe up (negative translationY)    | `activeOffsetY(-10)`, `failOffsetX([-5, 5])` |
| `right`   | Swipe right (positive translationX) | `activeOffsetX(10)`, `failOffsetY([-5, 5])`  |
| `left`    | Swipe left (negative translationX)  | `activeOffsetX(-10)`, `failOffsetY([-5, 5])` |

Since `slideFrom` is a shared value (can change between opens), the pan gesture must be configured broadly and the direction check done in `onUpdate`:

```ts
// In onUpdate worklet:
const dir = slideFrom.value;
const isVertical = dir === "top" || dir === "bottom";
const dismissPositive = dir === "bottom" || dir === "right";

if (isVertical) {
  const delta = dismissPositive ? event.translationY : -event.translationY;
  if (scrollOffset.value <= 0 && delta > 0) {
    offset.value = delta;
  }
} else {
  // horizontal
  const delta = dismissPositive ? event.translationX : -event.translationX;
  if (delta > 0) {
    offset.value = delta;
  }
}
```

**Step 3: onEnd — snap open or closed**

```ts
const screenSize = isVertical ? screenHeight : screenWidth;
const shouldClose = offset.value > screenSize * 0.25 || velocity > 500;
offset.value = withTiming(shouldClose ? screenSize : 0, TIMING_CONFIG);
```

**Step 4: Commit**

```
feat: add useDirectionalDismiss hook for reverse-direction panel dismiss
```

---

### Task 3: Refactor AppDrawer to Use Directional Props

**Required skills:** `creating-reanimated-animations`, `vercel-react-native-skills`

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`

**Step 1: Change props from `translateY` to `offset` + `slideFrom`**

```ts
interface AppDrawerProps {
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
}
```

**Step 2: Replace the internal animatedStyle**

Remove the current:

```ts
const animatedStyle = useAnimatedStyle(() => ({
  opacity: interpolate(translateY.value, [screenHeight, 0], [0, 1]),
  transform: [{ translateY: translateY.value }],
}));
```

Replace with `useDirectionalPanel({ offset, slideFrom, screenHeight, screenWidth })`.

**Step 3: Replace the dismiss pan gesture**

Remove the current pan gesture that only tracks Y axis. Replace with `useDirectionalDismiss({ offset, slideFrom, scrollOffset, screenHeight, screenWidth })`.

**Step 4: Update the reset-on-close reaction**

Currently detects `translateY.value > screenHeight - 10`. Change to detect `offset.value > screenSize - 10` where screenSize depends on `slideFrom`.

**Step 5: Commit**

```
feat: refactor AppDrawer to use directional offset and slideFrom props
```

---

### Task 4: Refactor WidgetPanel to Use Directional Props

**Required skills:** `creating-reanimated-animations`, `vercel-react-native-skills`

**Files:**

- Modify: `apps/native/components/widget-panel.tsx`

**Step 1: Same prop changes as AppDrawer**

```ts
interface WidgetPanelProps {
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
}
```

**Step 2: Replace animatedStyle with useDirectionalPanel**

**Step 3: Replace dismiss pan with useDirectionalDismiss**

**Step 4: Update reset-on-close reaction**

**Step 5: Commit**

```
feat: refactor WidgetPanel to use directional offset and slideFrom props
```

---

### Task 5: Refactor Home Screen to Wire Directional Panels

**Required skills:** `vercel-react-best-practices`, `creating-reanimated-animations`

**Files:**

- Modify: `apps/native/app/index.tsx`

**Step 1: Replace translateY shared values with offset + slideFrom**

Remove:

```ts
const drawerTranslateY = useSharedValue(screenHeight);
const widgetPanelTranslateY = useSharedValue(screenHeight);
```

Add:

```ts
const drawerOffset = useSharedValue(screenHeight);
const drawerSlideFrom = useSharedValue<SlideFrom>("bottom");
const widgetOffset = useSharedValue(screenHeight);
const widgetSlideFrom = useSharedValue<SlideFrom>("top");
```

**Step 2: Map swipe direction to slideFrom**

Create a helper that converts the gesture's swipe direction to the panel's slideFrom:

```ts
function swipeToSlideFrom(swipeDir: SwipeDirection): SlideFrom {
  // Panel slides from the OPPOSITE edge
  switch (swipeDir) {
    case "up":
      return "bottom";
    case "down":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
    default:
      return "bottom";
  }
}
```

**Step 3: Update GestureActionContext to accept direction**

Change `openDrawer` and `openWidgetPanel` to accept a `SwipeDirection` parameter:

```ts
export interface GestureActionContext {
  openDrawer: (direction?: SwipeDirection) => void;
  openWidgetPanel: (direction?: SwipeDirection) => void;
  // ... rest unchanged
}
```

Update the action handlers:

```ts
openDrawer: (direction) => {
  const from = swipeToSlideFrom(direction ?? "up");
  const size = (from === "left" || from === "right") ? screenWidth : screenHeight;
  drawerSlideFrom.value = from;
  // Close widget panel first
  widgetOffset.value = withTiming(
    (widgetSlideFrom.value === "left" || widgetSlideFrom.value === "right")
      ? screenWidth : screenHeight,
    TIMING_CONFIG
  );
  // Open drawer
  drawerOffset.value = size; // start off-screen
  drawerOffset.value = withTiming(0, TIMING_CONFIG);
},
```

**Step 4: Update isOpen detection**

Replace `drawerTranslateY.value < 10` with `drawerOffset.value < 10`.

**Step 5: Update back button handler**

```ts
if (isDrawerOpen) {
  const size =
    drawerSlideFrom.value === "left" || drawerSlideFrom.value === "right"
      ? screenWidth
      : screenHeight;
  drawerOffset.value = withTiming(size, TIMING_CONFIG);
  return true;
}
```

**Step 6: Update panelFadeStyle**

The home content fade should still work — interpolate from `drawerOffset` and `widgetOffset`:

```ts
const panelFadeStyle = useAnimatedStyle(() => {
  const drawerSize =
    drawerSlideFrom.value === "left" || drawerSlideFrom.value === "right"
      ? screenWidth
      : screenHeight;
  const widgetSize =
    widgetSlideFrom.value === "left" || widgetSlideFrom.value === "right"
      ? screenWidth
      : screenHeight;
  const drawerFade = interpolate(drawerOffset.value, [drawerSize, 0], [1, 0]);
  const widgetFade = interpolate(widgetOffset.value, [widgetSize, 0], [1, 0]);
  return { opacity: Math.min(drawerFade, widgetFade) };
});
```

**Step 7: Update JSX**

```tsx
<AppDrawer offset={drawerOffset} slideFrom={drawerSlideFrom} />
<WidgetPanel offset={widgetOffset} slideFrom={widgetSlideFrom} />
```

**Step 8: Commit**

```
feat: wire directional panel animations in homescreen
```

---

### Task 6: Pass Direction from Gesture Hook to Actions

**Required skills:** `react-native-best-practices` → `references/gestures/SKILL.md`

**Files:**

- Modify: `apps/native/hooks/use-homescreen-gestures.ts`
- Modify: `apps/native/lib/gesture-actions.ts`

**Step 1: Update GestureActionContext**

In `lib/gesture-actions.ts`, change `openDrawer` and `openWidgetPanel` to accept an optional direction:

```ts
export interface GestureActionContext {
  openDrawer: (direction?: SwipeDirection) => void;
  openWidgetPanel: (direction?: SwipeDirection) => void;
  // ... rest unchanged
}
```

Import `SwipeDirection` from `use-homescreen-gestures`.

**Step 2: Update executeGestureAction to pass direction**

```ts
export function executeGestureAction(
  action: GestureAction,
  ctx: GestureActionContext,
  launchAppPackage?: string,
  direction?: SwipeDirection
): void {
  if (action === "launch-app" && launchAppPackage) {
    ctx.launchApp(launchAppPackage);
    return;
  }
  if (action === "app-drawer") {
    ctx.openDrawer(direction);
    return;
  }
  if (action === "widgets") {
    ctx.openWidgetPanel(direction);
    return;
  }
  actionRegistry[action](ctx);
}
```

**Step 3: Update fireSwipeAction in use-homescreen-gestures.ts**

Pass the swipe direction through to `executeGestureAction`:

```ts
const fireSwipeAction = useMemo(() => {
  return (direction: SwipeDirection) => {
    // ... existing logic ...
    executeGestureAction(
      action,
      actionContext,
      launchBinding?.packageName,
      direction
    );
  };
}, [gestures, actionContext]);
```

**Step 4: Commit**

```
feat: pass swipe direction from gesture hook to action handlers
```

---

### Task 7: Update Home Content "Push Aside" Animation

**Required skills:** `creating-reanimated-animations`

**Files:**

- Modify: `apps/native/hooks/use-gesture-animations.ts`

**Step 1: Add directional slide to useHomescreenGestureStyle**

Currently the home content only translates vertically. Update to slide in the gesture direction:

```ts
const dir = direction.value;
let translateX = 0;
let translateY = 0;

if (dir === "up") translateY = -rubberbandOffset.value * 0.3;
else if (dir === "down") translateY = rubberbandOffset.value * 0.3;
else if (dir === "left") translateX = -rubberbandOffset.value * 0.3;
else if (dir === "right") translateX = rubberbandOffset.value * 0.3;

return {
  opacity,
  transform: [{ translateX }, { translateY }, { scale }],
};
```

**Step 2: Commit**

```
feat: add directional slide to homescreen push-aside animation
```

---

### Task 8: Update Search Activation Path

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/app/index.tsx`

**Step 1: Update handleSearchActivate**

The search bar activation opens the drawer (since search is inside the drawer). It should pass a direction:

```ts
const handleSearchActivate = useCallback(() => {
  // Close widget panel
  const widgetSize = ...;
  widgetOffset.value = withTiming(widgetSize, TIMING_CONFIG);
  // Open drawer from bottom (search always opens upward)
  drawerSlideFrom.value = "bottom";
  drawerOffset.value = screenHeight;
  drawerOffset.value = withTiming(0, TIMING_CONFIG);
}, [...]);
```

**Step 2: Commit**

```
feat: update search activation to use directional panel offset
```

---

### Task 9: Validate Directional Panel System

**Step 1: Swipe up → App drawer slides from bottom**

- Default binding. Drawer appears from bottom edge. Dismiss by swiping down.

**Step 2: Swipe down → Widget panel slides from top**

- Change swipeDown to "widgets" in settings. Widget panel slides down from top. Dismiss by swiping up.

**Step 3: Swipe right → Panel slides from left**

- Bind swipeRight to "app-drawer". Drawer slides in from left edge. Dismiss by swiping left.

**Step 4: Swipe left → Panel slides from right**

- Bind swipeLeft to "widgets". Widget panel slides in from right edge. Dismiss by swiping right.

**Step 5: Back button**

- Open panel from any direction. Press back. Panel animates back to origin edge.

**Step 6: Search activation**

- Tap search bar. Drawer slides from bottom (always). Search input focuses.

**Step 7: No collision**

- Bind swipeUp to drawer, swipeDown to widgets. Swipe up → drawer from bottom. Swipe down → widgets from top. They never fight.

**Step 8: Dismiss + scroll**

- Open drawer from bottom. Scroll the app list. Swipe down at top of list → dismisses. Swipe down while scrolled → scrolls the list (no dismiss).

**Step 9: Horizontal dismiss**

- Open drawer from left (via swipe-right). Swipe left → dismisses. Vertical scrolling inside still works (failOffsetY).

---

### Acceptance Criteria

- Panels slide from the edge **opposite** to the swipe direction (Kvaesitso model)
- Horizontal swipes (left/right) use `translateX`; vertical swipes (up/down) use `translateY`
- Dismiss gestures work in reverse direction with axis-appropriate tracking
- Back button animates panel to origin edge
- Home content slides 30% in swipe direction + fades during gesture
- Scroll-aware dismiss — only triggers at scroll boundary
- Search activation always opens drawer from bottom
- No regressions in existing drawer/widget panel functionality
- Run `bun x ultracite fix` before each commit

---

### Implementation Notes

- The `offset` shared value is always positive (distance from visible). The axis and sign are derived from `slideFrom` in the animated style. This keeps the animation math simple — one number, one direction.
- `slideFrom` is a shared value (not a plain prop) so it can be read in worklets and change between panel opens without remounting.
- The dismiss gesture uses a single `Gesture.Pan()` with both `activeOffsetX` and `activeOffsetY` — the direction check happens in `onUpdate` based on `slideFrom.value`, not via gesture config, since `slideFrom` can change.
- All existing panel behavior (scroll tracking, action menus, edit sheets) continues to work since we only changed the animation layer, not the content.
- `scheduleOnRN` replaces `runOnJS` throughout (Reanimated 4 / react-native-worklets pattern).
