import { openApplication } from "expo-intent-launcher";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, useWindowDimensions, View } from "react-native";
import { accessibilityActions } from "react-native-accessibility-actions";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { AppDrawer } from "@/components/app-drawer";
import { ChargingGlow } from "@/components/charging-glow";
import { ClockDisplay } from "@/components/clock-display";
import { DockRow } from "@/components/dock-row";
import { SearchBar } from "@/components/search-bar";
import { WidgetPanel } from "@/components/widget-panel";
import { LauncherConfigContext } from "@/context/launcher-config";
import { SettingsContext } from "@/context/settings";
import { isHorizontal } from "@/hooks/use-directional-panel";
import type { SlideFrom } from "@/hooks/use-directional-panel";
import { useHomescreenGestureStyle } from "@/hooks/use-gesture-animations";
import { useHomescreenGestures } from "@/hooks/use-homescreen-gestures";
import type { SwipeDirection } from "@/hooks/use-homescreen-gestures";
import { useSystemBars } from "@/hooks/use-system-bars";
import type { GestureActionContext } from "@/lib/gesture-actions";

const TIMING_CONFIG = { duration: 300, easing: Easing.out(Easing.cubic) };

function swipeToSlideFrom(swipeDir?: SwipeDirection): SlideFrom {
  // Panel emerges from the edge matching the swipe direction:
  // Swipe up → panel from bottom (pull up)
  // Swipe down → panel from top (pull down)
  // Swipe right → panel from right (pull from right edge)
  // Swipe left → panel from left (pull from left edge)
  switch (swipeDir) {
    case "up": {
      return "bottom";
    }
    case "down": {
      return "top";
    }
    case "left": {
      return "left";
    }
    case "right": {
      return "right";
    }
    default: {
      return "bottom";
    }
  }
}

function getScreenSize(
  dir: SlideFrom,
  screenWidth: number,
  screenHeight: number
): number {
  "worklet";
  return isHorizontal(dir) ? screenWidth : screenHeight;
}

export default function Home() {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const config = use(LauncherConfigContext);
  const settings = use(SettingsContext);
  const isTop = config?.state.searchBarPosition === "top";

  // Directional panel state
  const drawerOffset = useSharedValue(screenHeight);
  const drawerSlideFrom = useSharedValue<SlideFrom>("bottom");
  const widgetOffset = useSharedValue(screenHeight);
  const widgetSlideFrom = useSharedValue<SlideFrom>("top");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWidgetPanelOpen, setIsWidgetPanelOpen] = useState(false);

  // System bar control — homescreen only
  const isHomescreenVisible = !isDrawerOpen && !isWidgetPanelOpen;
  useSystemBars(
    settings?.state.homescreen ?? ({} as never),
    isHomescreenVisible
  );

  // Detect drawer open/close
  useAnimatedReaction(
    () => drawerOffset.value < 10,
    (isOpen, wasOpen) => {
      if (isOpen !== wasOpen) {
        scheduleOnRN(setIsDrawerOpen, isOpen);
      }
    }
  );

  // Detect widget panel open/close
  useAnimatedReaction(
    () => widgetOffset.value < 10,
    (isOpen, wasOpen) => {
      if (isOpen !== wasOpen) {
        scheduleOnRN(setIsWidgetPanelOpen, isOpen);
      }
    }
  );

  // Back button — animate panel back to origin edge
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isDrawerOpen) {
        const size = getScreenSize(
          drawerSlideFrom.value,
          screenWidth,
          screenHeight
        );
        drawerOffset.value = withTiming(size, TIMING_CONFIG);
        return true;
      }
      if (isWidgetPanelOpen) {
        const size = getScreenSize(
          widgetSlideFrom.value,
          screenWidth,
          screenHeight
        );
        widgetOffset.value = withTiming(size, TIMING_CONFIG);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [
    drawerOffset,
    drawerSlideFrom,
    widgetOffset,
    widgetSlideFrom,
    isDrawerOpen,
    isWidgetPanelOpen,
    screenHeight,
    screenWidth,
  ]);

  // Search always opens drawer from bottom
  const handleSearchActivate = useCallback(() => {
    const widgetSize = getScreenSize(
      widgetSlideFrom.value,
      screenWidth,
      screenHeight
    );
    widgetOffset.value = withTiming(widgetSize, TIMING_CONFIG);
    drawerSlideFrom.value = "bottom";
    cancelAnimation(drawerOffset);
    drawerOffset.value = screenHeight;
    requestAnimationFrame(() => {
      drawerOffset.value = withTiming(0, TIMING_CONFIG);
    });
  }, [
    drawerOffset,
    drawerSlideFrom,
    widgetOffset,
    widgetSlideFrom,
    screenHeight,
    screenWidth,
  ]);

  // Close a panel by animating it back to its origin
  const closeDrawer = useCallback(() => {
    const size = getScreenSize(
      drawerSlideFrom.value,
      screenWidth,
      screenHeight
    );
    drawerOffset.value = withTiming(size, TIMING_CONFIG);
  }, [drawerOffset, drawerSlideFrom, screenWidth, screenHeight]);

  const closeWidgetPanel = useCallback(() => {
    const size = getScreenSize(
      widgetSlideFrom.value,
      screenWidth,
      screenHeight
    );
    widgetOffset.value = withTiming(size, TIMING_CONFIG);
  }, [widgetOffset, widgetSlideFrom, screenWidth, screenHeight]);

  // --- Gesture action context ---
  const actionContext = useMemo<GestureActionContext>(
    () => ({
      launchApp: (packageName: string) => {
        openApplication(packageName);
      },
      lockScreen: () => {
        try {
          accessibilityActions.lockScreen();
        } catch {
          Alert.alert(
            "Lock Screen",
            "Enable the Accessibility Service in Settings to use this action.",
            [
              { style: "cancel", text: "Cancel" },
              {
                onPress: () => accessibilityActions.openAccessibilitySettings(),
                text: "Open Settings",
              },
            ]
          );
        }
      },
      openDrawer: (direction?: SwipeDirection) => {
        closeWidgetPanel();
        const from = swipeToSlideFrom(direction);
        const size = getScreenSize(from, screenWidth, screenHeight);
        drawerSlideFrom.value = from;
        cancelAnimation(drawerOffset);
        drawerOffset.value = size;
        requestAnimationFrame(() => {
          drawerOffset.value = withTiming(0, TIMING_CONFIG);
        });
      },
      openNotifications: () => {
        try {
          accessibilityActions.openNotifications();
        } catch {
          Alert.alert(
            "Notifications",
            "Enable the Accessibility Service in Settings to use this action.",
            [
              { style: "cancel", text: "Cancel" },
              {
                onPress: () => accessibilityActions.openAccessibilitySettings(),
                text: "Open Settings",
              },
            ]
          );
        }
      },
      openPowerMenu: () => {
        try {
          accessibilityActions.showPowerMenu();
        } catch {
          Alert.alert(
            "Power Menu",
            "Enable the Accessibility Service in Settings to use this action.",
            [
              { style: "cancel", text: "Cancel" },
              {
                onPress: () => accessibilityActions.openAccessibilitySettings(),
                text: "Open Settings",
              },
            ]
          );
        }
      },
      openQuickSettings: () => {
        try {
          accessibilityActions.openQuickSettings();
        } catch {
          Alert.alert(
            "Quick Settings",
            "Enable the Accessibility Service in Settings to use this action.",
            [
              { style: "cancel", text: "Cancel" },
              {
                onPress: () => accessibilityActions.openAccessibilitySettings(),
                text: "Open Settings",
              },
            ]
          );
        }
      },
      openRecents: () => {
        try {
          accessibilityActions.openRecents();
        } catch {
          Alert.alert(
            "Recents",
            "Enable the Accessibility Service in Settings to use this action.",
            [
              { style: "cancel", text: "Cancel" },
              {
                onPress: () => accessibilityActions.openAccessibilitySettings(),
                text: "Open Settings",
              },
            ]
          );
        }
      },
      openSearch: () => {
        handleSearchActivate();
      },
      openWidgetPanel: (direction?: SwipeDirection) => {
        closeDrawer();
        const from = swipeToSlideFrom(direction);
        const size = getScreenSize(from, screenWidth, screenHeight);
        widgetSlideFrom.value = from;
        cancelAnimation(widgetOffset);
        widgetOffset.value = size;
        requestAnimationFrame(() => {
          widgetOffset.value = withTiming(0, TIMING_CONFIG);
        });
      },
    }),
    [
      drawerOffset,
      drawerSlideFrom,
      widgetOffset,
      widgetSlideFrom,
      screenHeight,
      screenWidth,
      handleSearchActivate,
      closeDrawer,
      closeWidgetPanel,
    ]
  );

  // --- Configurable gesture system ---
  const gestureConfig = settings?.state.gestures ?? {
    doubleTap: "lock-screen" as const,
    launchAppBindings: {},
    longPress: "none" as const,
    swipeDown: "notifications" as const,
    swipeLeft: "none" as const,
    swipeRight: "none" as const,
    swipeUp: "app-drawer" as const,
  };

  const {
    gesture,
    dragProgress,
    gestureDirection,
    isGestureActive,
    rubberbandOffset,
  } = useHomescreenGestures({
    actionContext,
    gestures: gestureConfig,
    screenHeight,
    screenWidth,
  });

  // --- Homescreen content animation driven by gesture ---
  const gestureContentStyle = useHomescreenGestureStyle({
    direction: gestureDirection,
    dragProgress,
    isGestureActive,
    rubberbandOffset,
  });

  // Fade when panels are open
  const panelFadeStyle = useAnimatedStyle(() => {
    const drawerSize = getScreenSize(
      drawerSlideFrom.value,
      screenWidth,
      screenHeight
    );
    const widgetSize = getScreenSize(
      widgetSlideFrom.value,
      screenWidth,
      screenHeight
    );
    const drawerProgress = Math.max(
      0,
      Math.min(1, drawerOffset.value / drawerSize)
    );
    const widgetProgress = Math.max(
      0,
      Math.min(1, widgetOffset.value / widgetSize)
    );
    return {
      opacity: Math.min(drawerProgress, widgetProgress),
    };
  });

  const clockAreaPaddingTop = isTop ? insets.top + 80 : insets.top + 20;
  const dockAreaPaddingBottom = isTop ? insets.bottom + 16 : insets.bottom + 72;

  return (
    <View className="flex-1 bg-background">
      <SearchBar.Provider onActivate={handleSearchActivate}>
        <SearchBar.Frame>
          <View className="flex-row items-center bg-card border border-border rounded-full h-[52px] px-3 gap-2">
            <SearchBar.Icon />
            <SearchBar.Input />
            <SearchBar.Actions />
          </View>
          <SearchBar.Suggestions />
        </SearchBar.Frame>
        <GestureDetector gesture={gesture}>
          <Animated.View
            className="flex-1"
            style={[panelFadeStyle, gestureContentStyle]}
          >
            <View
              className="flex-1 items-center justify-center"
              style={{ paddingTop: clockAreaPaddingTop }}
            >
              <ClockDisplay />
            </View>
            <View
              className="px-4"
              style={{ paddingBottom: dockAreaPaddingBottom }}
            >
              <DockRow />
            </View>
          </Animated.View>
        </GestureDetector>

        <AppDrawer offset={drawerOffset} slideFrom={drawerSlideFrom} />
        <WidgetPanel offset={widgetOffset} slideFrom={widgetSlideFrom} />
      </SearchBar.Provider>
      <ChargingGlow />
    </View>
  );
}
