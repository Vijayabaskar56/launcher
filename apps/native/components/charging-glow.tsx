import { memo, use } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { SettingsContext } from "@/context/settings";
import { useBattery } from "@/hooks/use-battery";

/**
 * Subtle glow pulse at the bottom of the homescreen when device is charging.
 * Uses Reanimated v4 CSS animations for zero-worklet overhead.
 */
export const ChargingGlow = memo(function ChargingGlow() {
  const settings = use(SettingsContext);
  const { isCharging } = useBattery();
  const { width } = useWindowDimensions();

  const enabled = settings?.state.homescreen.chargingAnimation ?? true;

  if (!enabled || !isCharging) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      exiting={FadeOut.duration(400)}
      pointerEvents="none"
      style={{
        // Reanimated v4 CSS animation — infinite glow pulse
        animationDuration: "2500ms",
        animationIterationCount: "infinite",
        animationName: {
          "50%": { opacity: 0.7 },
          from: { opacity: 0.3 },
          to: { opacity: 0.3 },
        },
        animationTimingFunction: "ease-in-out",
        bottom: 0,
        height: 80,
        left: 0,
        position: "absolute",
        width,
      }}
    >
      {/* Gradient-like effect using stacked semi-transparent views */}
      <View
        style={{
          backgroundColor: "rgba(99, 102, 241, 0.05)",
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          flex: 1,
        }}
      />
      <View
        style={{
          backgroundColor: "rgba(99, 102, 241, 0.15)",
          borderTopLeftRadius: 60,
          borderTopRightRadius: 60,
          bottom: 0,
          height: 40,
          left: 0,
          position: "absolute",
          right: 0,
        }}
      />
    </Animated.View>
  );
});
