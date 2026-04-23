import {
  GestureStateManager,
  usePanGesture,
} from "react-native-gesture-handler";
import type { NativeGesture } from "react-native-gesture-handler";
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { isHorizontal } from "./use-directional-panel";
import type { SlideFrom } from "./use-directional-panel";

const TIMING_CONFIG = { duration: 300, easing: Easing.out(Easing.cubic) };
const DISMISS_TOUCH_SLOP = 12;

interface UseDirectionalDismissConfig {
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
  isAtTop: SharedValue<boolean>;
  isAtBottom: SharedValue<boolean>;
  screenHeight: number;
  scrollGesture?: NativeGesture | null;
  screenWidth: number;
}

export const useDirectionalDismiss = ({
  offset,
  slideFrom,
  isAtTop,
  isAtBottom,
  screenHeight,
  scrollGesture,
  screenWidth,
}: UseDirectionalDismissConfig) => {
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  const panGesture = usePanGesture({
    averageTouches: true,
    block: scrollGesture ?? undefined,
    manualActivation: true,
    onActivate: () => {
      cancelAnimation(offset);
    },
    onDeactivate: (event) => {
      const dir = slideFrom.value;
      const horiz = isHorizontal(dir);
      const size = horiz ? screenWidth : screenHeight;

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
    },
    onTouchesDown: (event) => {
      const [touch] = event.allTouches;
      if (!touch) {
        return;
      }
      touchStartX.value = touch.x;
      touchStartY.value = touch.y;
    },
    onTouchesMove: (event) => {
      const dir = slideFrom.value;
      const horiz = isHorizontal(dir);
      const [touch] = event.allTouches;

      if (!touch) {
        return;
      }

      const deltaX = touch.x - touchStartX.value;
      const deltaY = touch.y - touchStartY.value;
      let primaryDelta = -deltaX;
      if (dir === "bottom") {
        primaryDelta = deltaY;
      } else if (dir === "top") {
        primaryDelta = -deltaY;
      } else if (dir === "right") {
        primaryDelta = deltaX;
      }

      const crossDelta = horiz ? Math.abs(deltaY) : Math.abs(deltaX);
      let boundaryReady = true;
      if (!horiz) {
        boundaryReady = dir === "bottom" ? isAtTop.value : isAtBottom.value;
      }

      if (!boundaryReady) {
        return;
      }

      if (
        Math.abs(primaryDelta) < DISMISS_TOUCH_SLOP &&
        crossDelta < DISMISS_TOUCH_SLOP
      ) {
        return;
      }

      if (
        crossDelta > Math.abs(primaryDelta) &&
        crossDelta > DISMISS_TOUCH_SLOP
      ) {
        return;
      }

      if (primaryDelta <= 0) {
        return;
      }

      GestureStateManager.activate(event.handlerTag);
    },
    onUpdate: (event) => {
      const dir = slideFrom.value;

      let primaryChange: number;
      if (dir === "bottom") {
        primaryChange = event.changeY;
      } else if (dir === "top") {
        primaryChange = -event.changeY;
      } else if (dir === "right") {
        primaryChange = event.changeX;
      } else {
        primaryChange = -event.changeX;
      }

      offset.value = Math.max(0, offset.value + primaryChange);
    },
    simultaneousWith: scrollGesture ?? undefined,
  });

  return panGesture;
};
