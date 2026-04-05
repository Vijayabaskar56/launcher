import type { ViewStyle } from "react-native";

export const SHEET_TRANSLUCENT_BACKGROUND: ViewStyle = {
  backgroundColor: "rgba(30, 30, 30, 0.95)",
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
};

export const SHEET_TRANSLUCENT_HANDLE: ViewStyle = {
  backgroundColor: "rgba(255,255,255,0.3)",
  borderRadius: 999,
  height: 4,
  width: 40,
};
