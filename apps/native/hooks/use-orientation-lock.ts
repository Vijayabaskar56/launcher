import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect } from "react";

export const useOrientationLock = (fixedRotation: boolean | null): void => {
  useEffect(() => {
    if (fixedRotation) {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    }
  }, [fixedRotation]);
};
