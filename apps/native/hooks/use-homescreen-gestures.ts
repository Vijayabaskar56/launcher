import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import {
  useExclusiveGestures,
  useLongPressGesture,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import { useSharedValue, withSpring } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { executeGestureAction } from "@/lib/gesture-actions";
import type { GestureActionContext } from "@/lib/gesture-actions";
import type { GestureSettings } from "@/types/settings";

export type SwipeDirection = "up" | "down" | "left" | "right" | null;

// --- Constants (matching Kvaesitso) ---
// Drag distance before gesture activates.
const RUBBERBAND_THRESHOLD = 60;
// Quick flick threshold in dp/s.
const MIN_FLING_VELOCITY = 500;
// Minimum movement before direction is determined.
const TOUCH_SLOP = 15;

// --- Rubberband physics ---
const rubberband = (distance: number, threshold: number): number => {
  "worklet";
  if (distance <= threshold) {
    return distance;
  }
  const overflow = distance - threshold;
  return threshold + overflow * (1 / (1 + overflow / (threshold * 0.5)));
};

// --- Direction detection (Kvaesitso quadrant model) ---
const getSwipeDirection = (
  offsetX: number,
  offsetY: number
): SwipeDirection => {
  "worklet";
  const absX = Math.abs(offsetX);
  const absY = Math.abs(offsetY);

  if (absX < TOUCH_SLOP && absY < TOUCH_SLOP) {
    return null;
  }

  if (absX > absY) {
    return offsetX > 0 ? "right" : "left";
  }
  return offsetY > 0 ? "down" : "up";
};

// --- Haptic feedback (must run on JS thread) ---
const triggerThresholdHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

const triggerActionHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

const triggerLongPressHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

interface ScrollBoundary {
  isAtTop: SharedValue<boolean>;
  isAtBottom: SharedValue<boolean>;
  isPanelOpen: boolean;
}

interface UseHomescreenGesturesConfig {
  gestures: GestureSettings;
  actionContext: GestureActionContext;
  scrollBoundary?: ScrollBoundary;
}

export interface UseHomescreenGesturesResult {
  gesture: ReturnType<typeof useExclusiveGestures>;
  dragProgress: SharedValue<number>;
  gestureDirection: SharedValue<SwipeDirection>;
  isGestureActive: SharedValue<boolean>;
  rubberbandOffset: SharedValue<number>;
}

const isDirectionEnabled = (
  direction: Exclude<SwipeDirection, null>,
  options: {
    hasSwipeDown: boolean;
    hasSwipeLeft: boolean;
    hasSwipeRight: boolean;
    hasSwipeUp: boolean;
  }
) => {
  "worklet";
  if (direction === "down") {
    return options.hasSwipeDown;
  }
  if (direction === "left") {
    return options.hasSwipeLeft;
  }
  if (direction === "right") {
    return options.hasSwipeRight;
  }
  return options.hasSwipeUp;
};

const isBoundaryReadyForDirection = (
  direction: Exclude<SwipeDirection, null>,
  scrollBoundary?: ScrollBoundary
) => {
  "worklet";
  if (!scrollBoundary?.isPanelOpen) {
    return true;
  }
  if (direction === "down") {
    return scrollBoundary.isAtTop.value;
  }
  if (direction === "up") {
    return scrollBoundary.isAtBottom.value;
  }
  return true;
};

const getPositiveDistanceForDirection = (
  direction: Exclude<SwipeDirection, null>,
  translationX: number,
  translationY: number
) => {
  "worklet";
  if (direction === "up") {
    return Math.max(0, -translationY);
  }
  if (direction === "down") {
    return Math.max(0, translationY);
  }
  if (direction === "left") {
    return Math.max(0, -translationX);
  }
  return Math.max(0, translationX);
};

const getDirectionalVelocity = (
  direction: Exclude<SwipeDirection, null>,
  velocityX: number,
  velocityY: number
) => {
  "worklet";
  if (direction === "up") {
    return -velocityY;
  }
  if (direction === "down") {
    return velocityY;
  }
  if (direction === "left") {
    return -velocityX;
  }
  return velocityX;
};

export const useHomescreenGestures = ({
  gestures,
  actionContext,
  scrollBoundary,
}: UseHomescreenGesturesConfig): UseHomescreenGesturesResult => {
  const hasSwipeDown = gestures.swipeDown !== "none";
  const hasSwipeLeft = gestures.swipeLeft !== "none";
  const hasSwipeRight = gestures.swipeRight !== "none";
  const hasSwipeUp = gestures.swipeUp !== "none";
  const gestureDirection = useSharedValue<SwipeDirection>(null);
  const dragProgress = useSharedValue(0);
  const thresholdCrossed = useSharedValue(false);
  const isGestureActive = useSharedValue(false);
  const rubberbandOffset = useSharedValue(0);

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
    [actionContext, gestures]
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
    [actionContext, gestures]
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
    [actionContext, gestures]
  );

  const panGesture = usePanGesture({
    averageTouches: true,
    maxPointers: 1,
    minDistance: TOUCH_SLOP,
    onActivate: () => {
      gestureDirection.value = null;
      dragProgress.value = 0;
      thresholdCrossed.value = false;
      isGestureActive.value = true;
      rubberbandOffset.value = 0;
    },
    onDeactivate: (event) => {
      const direction = gestureDirection.value;
      if (direction === null) {
        isGestureActive.value = false;
        return;
      }

      const velocity = getDirectionalVelocity(
        direction,
        event.velocityX,
        event.velocityY
      );
      const shouldFire =
        thresholdCrossed.value || velocity > MIN_FLING_VELOCITY;

      if (shouldFire) {
        scheduleOnRN(fireSwipeAction, direction);
      }

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
    },
    onUpdate: (event) => {
      if (gestureDirection.value === null) {
        const nextDirection = getSwipeDirection(
          event.translationX,
          event.translationY
        );
        if (nextDirection === null) {
          return;
        }

        if (
          !isDirectionEnabled(nextDirection, {
            hasSwipeDown,
            hasSwipeLeft,
            hasSwipeRight,
            hasSwipeUp,
          })
        ) {
          return;
        }

        if (!isBoundaryReadyForDirection(nextDirection, scrollBoundary)) {
          return;
        }

        gestureDirection.value = nextDirection;
      }

      const direction = gestureDirection.value;
      if (direction === null) {
        return;
      }

      const rawDistance = getPositiveDistanceForDirection(
        direction,
        event.translationX,
        event.translationY
      );
      const rubberbanded = rubberband(rawDistance, RUBBERBAND_THRESHOLD);

      rubberbandOffset.value = rubberbanded;
      dragProgress.value = Math.min(rawDistance / RUBBERBAND_THRESHOLD, 1);

      if (rawDistance >= RUBBERBAND_THRESHOLD && !thresholdCrossed.value) {
        thresholdCrossed.value = true;
        scheduleOnRN(triggerThresholdHaptic);
      } else if (rawDistance < RUBBERBAND_THRESHOLD && thresholdCrossed.value) {
        thresholdCrossed.value = false;
      }
    },
  });

  const doubleTapGesture = useTapGesture({
    maxDuration: 300,
    numberOfTaps: 2,
    onDeactivate: (_event, success) => {
      if (success) {
        scheduleOnRN(fireDoubleTap);
      }
    },
  });

  const longPressGesture = useLongPressGesture({
    minDuration: 500,
    onActivate: () => {
      scheduleOnRN(fireLongPress);
    },
  });

  const gesture = useExclusiveGestures(
    panGesture,
    doubleTapGesture,
    longPressGesture
  );

  return {
    dragProgress,
    gesture,
    gestureDirection,
    isGestureActive,
    rubberbandOffset,
  };
};
