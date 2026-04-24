import { useCallback, useState } from "react";
import type { NativeGesture } from "react-native-gesture-handler";

export const useScrollDismissHandoff = () => {
  const [scrollGesture, setScrollGesture] = useState<NativeGesture | null>(
    null
  );

  const handleScrollGestureUpdate = useCallback((gesture: NativeGesture) => {
    setScrollGesture((currentGesture) =>
      currentGesture?.handlerTag === gesture.handlerTag
        ? currentGesture
        : gesture
    );
  }, []);

  return {
    handleScrollGestureUpdate,
    scrollGesture,
  };
};
