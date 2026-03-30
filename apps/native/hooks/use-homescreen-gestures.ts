import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import type { ComposedGesture } from "react-native-gesture-handler";
import { useSharedValue, withSpring } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { executeGestureAction } from "@/lib/gesture-actions";
import type { GestureActionContext } from "@/lib/gesture-actions";
import type { GestureSettings } from "@/types/settings";

export type SwipeDirection = "up" | "down" | "left" | "right" | null;

// --- Constants (matching Kvaesitso) ---
const RUBBERBAND_THRESHOLD = 60; // dp — drag distance before gesture activates
const MIN_FLING_VELOCITY = 500; // dp/s — quick flick threshold
const TOUCH_SLOP = 15; // dp — minimum movement before direction is determined

// --- Rubberband physics ---
function rubberband(distance: number, threshold: number): number {
  "worklet";
  if (distance <= threshold) {
    return distance;
  }
  const overflow = distance - threshold;
  return threshold + overflow * (1 / (1 + overflow / (threshold * 0.5)));
}

// --- Direction detection (Kvaesitso quadrant model) ---
function getSwipeDirection(offsetX: number, offsetY: number): SwipeDirection {
  "worklet";
  const absX = Math.abs(offsetX);
  const absY = Math.abs(offsetY);

  // Not enough movement to determine direction
  if (absX < TOUCH_SLOP && absY < TOUCH_SLOP) {
    return null;
  }

  // Dominant axis wins
  if (absX > absY) {
    return offsetX > 0 ? "right" : "left";
  }
  return offsetY > 0 ? "down" : "up";
}

// --- Haptic feedback (must run on JS thread) ---
function triggerThresholdHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

function triggerActionHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function triggerLongPressHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

// --- Hook ---

interface ScrollBoundary {
  isAtTop: SharedValue<boolean>;
  isAtBottom: SharedValue<boolean>;
  isPanelOpen: boolean;
}

interface UseHomescreenGesturesConfig {
  gestures: GestureSettings;
  actionContext: GestureActionContext;
  screenHeight: number;
  screenWidth: number;
  scrollBoundary?: ScrollBoundary;
}

export interface UseHomescreenGesturesResult {
  gesture: ComposedGesture;
  dragProgress: SharedValue<number>;
  gestureDirection: SharedValue<SwipeDirection>;
  isGestureActive: SharedValue<boolean>;
  rubberbandOffset: SharedValue<number>;
}

export function useHomescreenGestures({
  gestures,
  actionContext,
  scrollBoundary,
}: UseHomescreenGesturesConfig): UseHomescreenGesturesResult {
  const gestureDirection = useSharedValue<SwipeDirection>(null);
  const dragProgress = useSharedValue(0);
  const thresholdCrossed = useSharedValue(false);
  const isGestureActive = useSharedValue(false);
  const rubberbandOffset = useSharedValue(0);

  // Wrap action execution for scheduleOnRN
  const fireSwipeAction = useMemo(
    () => (direction: SwipeDirection) => {
      if (!direction) {
        return;
      }
      const keyMap: Record<string, keyof GestureSettings> = {
        down: "swipeDown",
        left: "swipeLeft",
        right: "swipeRight",
        up: "swipeUp",
      };
      const key = keyMap[direction];
      if (!key) {
        return;
      }
      const action = gestures[key];
      if (typeof action !== "string") {
        return;
      }
      const launchBinding =
        action === "launch-app" ? gestures.launchAppBindings[key] : undefined;
      triggerActionHaptic();
      executeGestureAction(
        action,
        actionContext,
        launchBinding?.packageName,
        direction
      );
    },
    [gestures, actionContext]
  );

  const fireDoubleTap = useMemo(
    () => () => {
      const action = gestures.doubleTap;
      if (action === "none") {
        return;
      }
      const launchBinding =
        action === "launch-app"
          ? gestures.launchAppBindings.doubleTap
          : undefined;
      triggerActionHaptic();
      executeGestureAction(action, actionContext, launchBinding?.packageName);
    },
    [gestures, actionContext]
  );

  const fireLongPress = useMemo(
    () => () => {
      const action = gestures.longPress;
      if (action === "none") {
        return;
      }
      const launchBinding =
        action === "launch-app"
          ? gestures.launchAppBindings.longPress
          : undefined;
      triggerLongPressHaptic();
      executeGestureAction(action, actionContext, launchBinding?.packageName);
    },
    [gestures, actionContext]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          "worklet";
          gestureDirection.value = null;
          dragProgress.value = 0;
          thresholdCrossed.value = false;
          isGestureActive.value = true;
          rubberbandOffset.value = 0;
        })
        .onUpdate((event) => {
          "worklet";
          // Determine direction if not yet locked
          if (gestureDirection.value === null) {
            const dir = getSwipeDirection(
              event.translationX,
              event.translationY
            );
            if (dir === null) {
              return;
            }

            // Check scroll boundary — don't activate if panel is open and not at edge
            if (scrollBoundary?.isPanelOpen) {
              if (dir === "down" && !scrollBoundary.isAtTop.value) {
                return;
              }
              if (dir === "up" && !scrollBoundary.isAtBottom.value) {
                return;
              }
            }

            gestureDirection.value = dir;
          }

          // Calculate drag distance along locked axis
          const dir = gestureDirection.value;
          let rawDistance = 0;
          if (dir === "up") {
            rawDistance = -event.translationY;
          } else if (dir === "down") {
            rawDistance = event.translationY;
          } else if (dir === "left") {
            rawDistance = -event.translationX;
          } else if (dir === "right") {
            rawDistance = event.translationX;
          }

          // Only track positive movement in the locked direction
          rawDistance = Math.max(0, rawDistance);

          // Apply rubberband physics
          const rubberbanded = rubberband(rawDistance, RUBBERBAND_THRESHOLD);
          rubberbandOffset.value = rubberbanded;
          dragProgress.value = Math.min(rawDistance / RUBBERBAND_THRESHOLD, 1);

          // Haptic at threshold crossing
          if (rawDistance >= RUBBERBAND_THRESHOLD && !thresholdCrossed.value) {
            thresholdCrossed.value = true;
            scheduleOnRN(triggerThresholdHaptic);
          } else if (
            rawDistance < RUBBERBAND_THRESHOLD &&
            thresholdCrossed.value
          ) {
            thresholdCrossed.value = false;
          }
        })
        .onEnd((event) => {
          "worklet";
          const dir = gestureDirection.value;
          if (dir === null) {
            isGestureActive.value = false;
            return;
          }

          // Check if gesture should fire: threshold crossed OR sufficient velocity
          let velocity = 0;
          if (dir === "up") {
            velocity = -event.velocityY;
          } else if (dir === "down") {
            velocity = event.velocityY;
          } else if (dir === "left") {
            velocity = -event.velocityX;
          } else if (dir === "right") {
            velocity = event.velocityX;
          }

          const shouldFire =
            thresholdCrossed.value || velocity > MIN_FLING_VELOCITY;

          if (shouldFire) {
            scheduleOnRN(fireSwipeAction, dir);
          }

          // Animate back to rest
          dragProgress.value = withSpring(0, {
            damping: 20,
            stiffness: 200,
          });
          rubberbandOffset.value = withSpring(0, {
            damping: 20,
            stiffness: 200,
          });
          gestureDirection.value = null;
          thresholdCrossed.value = false;
          isGestureActive.value = false;
        }),
    [
      gestureDirection,
      dragProgress,
      thresholdCrossed,
      isGestureActive,
      rubberbandOffset,
      scrollBoundary,
      fireSwipeAction,
    ]
  );

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(300)
        .onEnd(() => {
          "worklet";
          scheduleOnRN(fireDoubleTap);
        }),
    [fireDoubleTap]
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(500)
        .onStart(() => {
          "worklet";
          scheduleOnRN(fireLongPress);
        }),
    [fireLongPress]
  );

  // Pan takes priority. If finger moves, taps cancel.
  // Double tap takes priority over long press.
  const composedGesture = useMemo(
    () => Gesture.Exclusive(panGesture, doubleTapGesture, longPressGesture),
    [panGesture, doubleTapGesture, longPressGesture]
  );

  return {
    dragProgress,
    gesture: composedGesture,
    gestureDirection,
    isGestureActive,
    rubberbandOffset,
  };
}
