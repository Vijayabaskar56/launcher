import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { Easing, withTiming } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { isHorizontal } from "./use-directional-panel";
import type { SlideFrom } from "./use-directional-panel";

const TIMING_CONFIG = { duration: 300, easing: Easing.out(Easing.cubic) };

interface UseDirectionalDismissConfig {
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
  scrollOffset: SharedValue<number>;
  screenHeight: number;
  screenWidth: number;
}

export function useDirectionalDismiss({
  offset,
  slideFrom,
  scrollOffset,
  screenHeight,
  screenWidth,
}: UseDirectionalDismissConfig) {
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          "worklet";
          const dir = slideFrom.value;
          const horiz = isHorizontal(dir);

          // Determine dismiss delta based on direction
          // "bottom" dismisses on positive Y (swipe down)
          // "top" dismisses on negative Y (swipe up)
          // "right" dismisses on positive X (swipe right)
          // "left" dismisses on negative X (swipe left)
          let delta: number;
          if (dir === "bottom") {
            delta = event.translationY;
          } else if (dir === "top") {
            delta = -event.translationY;
          } else if (dir === "right") {
            delta = event.translationX;
          } else {
            delta = -event.translationX;
          } // "left"

          // For vertical panels, only dismiss when scrolled to top
          // For horizontal panels, always allow dismiss (no horizontal scroll conflict)
          if (!horiz && scrollOffset.value > 0) {
            return;
          }
          if (delta <= 0) {
            return;
          }

          offset.value = delta;
        })
        .onEnd((event) => {
          "worklet";
          const dir = slideFrom.value;
          const horiz = isHorizontal(dir);
          const size = horiz ? screenWidth : screenHeight;

          // Get velocity in the dismiss direction
          let velocity: number;
          if (dir === "bottom") {
            velocity = event.velocityY;
          } else if (dir === "top") {
            velocity = -event.velocityY;
          } else if (dir === "right") {
            velocity = event.velocityX;
          } else {
            velocity = -event.velocityX;
          }

          const shouldClose = offset.value > size * 0.25 || velocity > 500;

          offset.value = withTiming(shouldClose ? size : 0, TIMING_CONFIG);
        })
        .activeOffsetY([-10, 10])
        .activeOffsetX([-10, 10]),
    [offset, slideFrom, scrollOffset, screenHeight, screenWidth]
  );

  return panGesture;
}
