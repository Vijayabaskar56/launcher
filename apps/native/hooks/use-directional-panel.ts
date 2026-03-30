import { useState } from "react";
import {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export type SlideFrom = "top" | "bottom" | "left" | "right";

export function isHorizontal(dir: SlideFrom): boolean {
  "worklet";
  return dir === "left" || dir === "right";
}

interface UseDirectionalPanelConfig {
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
  screenHeight: number;
  screenWidth: number;
}

export function useDirectionalPanel({
  offset,
  slideFrom,
  screenHeight,
  screenWidth,
}: UseDirectionalPanelConfig) {
  const [isOpen, setIsOpen] = useState(false);

  useAnimatedReaction(
    () => offset.value < 10,
    (open, wasOpen) => {
      if (open !== wasOpen) {
        scheduleOnRN(setIsOpen, open);
      }
    }
  );

  const animatedStyle = useAnimatedStyle(() => {
    const dir = slideFrom.value;
    const off = offset.value;
    const size = isHorizontal(dir) ? screenWidth : screenHeight;
    const opacity = interpolate(off, [size, 0], [0, 1]);

    let translateX = 0;
    let translateY = 0;

    if (dir === "bottom") {
      translateY = off;
    } else if (dir === "top") {
      translateY = -off;
    } else if (dir === "right") {
      translateX = off;
    } else if (dir === "left") {
      translateX = -off;
    }

    return {
      opacity,
      transform: [{ translateX }, { translateY }],
    };
  });

  return { animatedStyle, isOpen };
}
