import type { HybridObject } from "react-native-nitro-modules";

export interface AccessibilityActions extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  lockScreen(): void;
  openNotifications(): void;
  openQuickSettings(): void;
  openRecents(): void;
  showPowerMenu(): void;
  readonly isAccessibilityEnabled: boolean;
  openAccessibilitySettings(): void;
}
