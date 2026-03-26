import * as NavigationBar from "expo-navigation-bar";
import { setStatusBarHidden, setStatusBarStyle } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";

import type { HomescreenSettings } from "@/types/settings";

/**
 * Applies system bar settings when the homescreen is visible,
 * reverts to defaults when leaving (e.g., opening settings or drawer).
 */
export const useSystemBars = (
  settings: HomescreenSettings,
  isHomescreenVisible: boolean
) => {
  // Status bar visibility
  useEffect(() => {
    if (isHomescreenVisible) {
      setStatusBarHidden(settings.hideStatusBar, "fade");
    } else {
      setStatusBarHidden(false, "fade");
    }
  }, [isHomescreenVisible, settings.hideStatusBar]);

  // Status bar icon color
  useEffect(() => {
    if (isHomescreenVisible) {
      const style = settings.statusBarIconColor === "dark" ? "dark" : "light";
      setStatusBarStyle(style);
    } else {
      setStatusBarStyle("light");
    }
  }, [isHomescreenVisible, settings.statusBarIconColor]);

  // Navigation bar (Android only)
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    if (isHomescreenVisible) {
      if (settings.hideNavigationBar) {
        NavigationBar.setVisibilityAsync("hidden");
      } else {
        NavigationBar.setVisibilityAsync("visible");
      }
    } else {
      NavigationBar.setVisibilityAsync("visible");
    }
  }, [isHomescreenVisible, settings.hideNavigationBar]);

  // Navigation bar button style (Android only)
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    if (isHomescreenVisible) {
      const style =
        settings.navigationBarIconColor === "dark" ? "dark" : "light";
      NavigationBar.setButtonStyleAsync(style);
    } else {
      NavigationBar.setButtonStyleAsync("light");
    }
  }, [isHomescreenVisible, settings.navigationBarIconColor]);
};
