import {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import type { SwipeDirection } from "@/hooks/use-homescreen-gestures";
import type { GestureAnimationStyle } from "@/lib/gesture-actions";

// --- Rubberband physics for animation ---
// Elastic pull-to-reveal: content follows finger with increasing resistance

interface GestureAnimationConfig {
  style: GestureAnimationStyle;
  dragProgress: SharedValue<number>;
  direction: SharedValue<SwipeDirection>;
  isGestureActive: SharedValue<boolean>;
  rubberbandOffset: SharedValue<number>;
  screenHeight: number;
  screenWidth: number;
}

/**
 * Returns an animated style for the homescreen content based on the
 * active gesture. Used to provide visual feedback during gestures
 * (e.g., slight scale-down, opacity fade, translation peek).
 */
export function useHomescreenGestureStyle({
  dragProgress,
  direction,
  isGestureActive,
  rubberbandOffset,
}: Omit<GestureAnimationConfig, "style" | "screenWidth" | "screenHeight">) {
  return useAnimatedStyle(() => {
    if (!isGestureActive.value || direction.value === null) {
      return {
        opacity: 1,
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
      };
    }

    const progress = dragProgress.value;

    // Subtle fade and scale as user drags
    const opacity = interpolate(progress, [0, 1], [1, 0.85]);
    const scale = interpolate(progress, [0, 1], [1, 0.97]);

    // Slight translation in gesture direction (30% push-aside effect)
    const dir = direction.value;
    let translateX = 0;
    let translateY = 0;
    if (dir === "up") {
      translateY = -rubberbandOffset.value * 0.3;
    } else if (dir === "down") {
      translateY = rubberbandOffset.value * 0.3;
    } else if (dir === "left") {
      translateX = -rubberbandOffset.value * 0.3;
    } else if (dir === "right") {
      translateX = rubberbandOffset.value * 0.3;
    }

    return {
      opacity,
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });
}

/**
 * Returns the animated style for a panel being revealed by a swipe gesture.
 * Supports rubberband (elastic pull), push (slide in), and zoomIn (fade+scale).
 */
export function usePanelRevealStyle({
  animationStyle,
  dragProgress,
  direction,
  isGestureActive,
  panelDirection,
  screenHeight,
  isOpen,
}: {
  animationStyle: GestureAnimationStyle;
  dragProgress: SharedValue<number>;
  direction: SharedValue<SwipeDirection>;
  isGestureActive: SharedValue<boolean>;
  panelDirection: SwipeDirection;
  screenHeight: number;
  isOpen: SharedValue<boolean>;
}) {
  const isTargeted = useDerivedValue(
    () => isGestureActive.value && direction.value === panelDirection
  );

  return useAnimatedStyle(() => {
    // Panel is fully open
    if (isOpen.value) {
      return {
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }],
      };
    }

    // Not targeted by current gesture
    if (!isTargeted.value) {
      return {
        opacity: 0,
        transform: [{ translateY: screenHeight }, { scale: 1 }],
      };
    }

    const progress = dragProgress.value;

    switch (animationStyle) {
      case "rubberband": {
        // Elastic: panel peeks in proportional to drag
        const translateY = interpolate(
          progress,
          [0, 1],
          [screenHeight, screenHeight * 0.6]
        );
        const opacity = interpolate(progress, [0, 0.5, 1], [0, 0.3, 0.8]);
        return {
          opacity,
          transform: [{ translateY }, { scale: 1 }],
        };
      }

      case "push": {
        // Linear slide following the finger
        const translateY = interpolate(
          progress,
          [0, 1],
          [screenHeight, screenHeight * 0.4]
        );
        const opacity = interpolate(progress, [0, 0.3, 1], [0, 0.5, 1]);
        return {
          opacity,
          transform: [{ translateY }, { scale: 1 }],
        };
      }

      case "zoomIn": {
        // Fade + scale for tap-triggered reveals
        const opacity = withTiming(progress > 0.5 ? 1 : 0, {
          duration: 200,
        });
        const scale = interpolate(progress, [0, 1], [0.9, 1]);
        return {
          opacity,
          transform: [{ translateY: 0 }, { scale }],
        };
      }

      default: {
        return {
          opacity: 0,
          transform: [{ translateY: screenHeight }, { scale: 1 }],
        };
      }
    }
  });
}
