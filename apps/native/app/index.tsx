import { use, useCallback, useEffect, useState } from "react";
import { BackHandler, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDrawer } from "@/components/app-drawer";
import { ChargingGlow } from "@/components/charging-glow";
import { ClockDisplay } from "@/components/clock-display";
import { DockRow } from "@/components/dock-row";
import { SearchBar } from "@/components/search-bar";
import { WidgetPanel } from "@/components/widget-panel";
import { LauncherConfigContext } from "@/context/launcher-config";
import { SettingsContext } from "@/context/settings";
import { useSystemBars } from "@/hooks/use-system-bars";

const TIMING_CONFIG = { duration: 300, easing: Easing.out(Easing.cubic) };

export default function Home() {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const drawerTranslateY = useSharedValue(screenHeight);
  const widgetPanelTranslateY = useSharedValue(screenHeight);
  const gestureDirection = useSharedValue<"none" | "down" | "up">("none");
  const config = use(LauncherConfigContext);
  const settings = use(SettingsContext);
  const isTop = config?.state.searchBarPosition === "top";

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWidgetPanelOpen, setIsWidgetPanelOpen] = useState(false);

  // System bar control — homescreen only
  const isHomescreenVisible = !isDrawerOpen && !isWidgetPanelOpen;
  useSystemBars(
    settings?.state.homescreen ?? ({} as never),
    isHomescreenVisible
  );

  useAnimatedReaction(
    () => drawerTranslateY.value < 10,
    (isOpen, wasOpen) => {
      if (isOpen !== wasOpen) {
        runOnJS(setIsDrawerOpen)(isOpen);
      }
    },
    [screenHeight]
  );

  useAnimatedReaction(
    () => widgetPanelTranslateY.value < 10,
    (isOpen, wasOpen) => {
      if (isOpen !== wasOpen) {
        runOnJS(setIsWidgetPanelOpen)(isOpen);
      }
    },
    [screenHeight]
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isDrawerOpen) {
        drawerTranslateY.value = withTiming(screenHeight, TIMING_CONFIG);
        return true;
      }
      if (isWidgetPanelOpen) {
        widgetPanelTranslateY.value = withTiming(screenHeight, TIMING_CONFIG);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [
    drawerTranslateY,
    widgetPanelTranslateY,
    isDrawerOpen,
    isWidgetPanelOpen,
    screenHeight,
  ]);

  const handleSearchActivate = useCallback(() => {
    widgetPanelTranslateY.value = withTiming(screenHeight, TIMING_CONFIG);
    drawerTranslateY.value = withTiming(0, TIMING_CONFIG);
  }, [drawerTranslateY, widgetPanelTranslateY, screenHeight]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      "worklet";
      gestureDirection.value = "none";
    })
    .onUpdate((event) => {
      "worklet";
      if (gestureDirection.value === "none") {
        if (event.translationY < -10) {
          gestureDirection.value = "up";
          widgetPanelTranslateY.value = withTiming(screenHeight, TIMING_CONFIG);
        } else if (event.translationY > 10) {
          gestureDirection.value = "down";
          drawerTranslateY.value = withTiming(screenHeight, TIMING_CONFIG);
        }
        return;
      }

      if (gestureDirection.value === "up") {
        const next = screenHeight + event.translationY;
        drawerTranslateY.value = Math.max(0, next);
      } else if (gestureDirection.value === "down") {
        const next = screenHeight - event.translationY;
        widgetPanelTranslateY.value = Math.max(0, next);
      }
    })
    .onEnd((event) => {
      "worklet";
      if (gestureDirection.value === "up") {
        const shouldOpen =
          event.translationY < -screenHeight * 0.2 || event.velocityY < -500;
        drawerTranslateY.value = withTiming(
          shouldOpen ? 0 : screenHeight,
          TIMING_CONFIG
        );
      } else if (gestureDirection.value === "down") {
        const shouldOpen =
          event.translationY > screenHeight * 0.2 || event.velocityY > 500;
        widgetPanelTranslateY.value = withTiming(
          shouldOpen ? 0 : screenHeight,
          TIMING_CONFIG
        );
      }
      gestureDirection.value = "none";
    });

  const homeContentStyle = useAnimatedStyle(() => {
    const drawerFade = interpolate(
      drawerTranslateY.value,
      [screenHeight, 0],
      [1, 0]
    );
    const widgetFade = interpolate(
      widgetPanelTranslateY.value,
      [screenHeight, 0],
      [1, 0]
    );
    return {
      opacity: Math.min(drawerFade, widgetFade),
    };
  });

  const clockAreaPaddingTop = isTop ? insets.top + 80 : insets.top + 20;
  const dockAreaPaddingBottom = isTop ? insets.bottom + 16 : insets.bottom + 72;

  return (
    <View className="flex-1 bg-background">
      <SearchBar.Provider onActivate={handleSearchActivate}>
        <SearchBar.Frame>
          <SearchBar.Icon />
          <SearchBar.Input />
          <SearchBar.Actions />
        </SearchBar.Frame>
        <GestureDetector gesture={panGesture}>
          <Animated.View className="flex-1" style={[homeContentStyle]}>
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

        <AppDrawer translateY={drawerTranslateY} />
        <WidgetPanel translateY={widgetPanelTranslateY} />
      </SearchBar.Provider>
      <ChargingGlow />
    </View>
  );
}
