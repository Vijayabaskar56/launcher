import { useEffect } from "react";
import { BackHandler } from "react-native";

export const useHardwareBackPress = (
  handler: () => boolean,
  deps?: React.DependencyList
): void => {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? []);
};
