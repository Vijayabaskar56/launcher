import { useCallback, useRef } from "react";
import type { NativeGesture } from "react-native-gesture-handler";

export const useScrollDismissHandoff = () => {
  const scrollGestureRef = useRef<NativeGesture | null>(null);

  const handleScrollGestureUpdate = useCallback((gesture: NativeGesture) => {
    const currentGesture = scrollGestureRef.current;
    if (currentGesture?.handlerTag !== gesture.handlerTag) {
      scrollGestureRef.current = gesture;
    }
  }, []);

  return {
    handleScrollGestureUpdate,
  };
};
