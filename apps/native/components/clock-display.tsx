import { memo, use } from "react";
import { View, Text } from "react-native";

import { SettingsContext } from "@/context/settings";
import { useBattery } from "@/hooks/use-battery";
import { useClock } from "@/hooks/use-clock";
import type { BatteryIndicatorMode } from "@/types/settings";

import { AnalogClock } from "./clock-styles/analog-clock";
import { DigitalClock } from "./clock-styles/digital-clock";

export const ClockDisplay = memo(function ClockDisplay() {
  const settings = use(SettingsContext);
  const showSeconds = settings?.state.homescreen.showSeconds ?? false;
  const clockStyle = settings?.state.homescreen.clockStyle ?? "digital";
  const batteryMode: BatteryIndicatorMode =
    settings?.state.homescreen.batteryIndicator ?? "charging-or-low";

  const clock = useClock(showSeconds);
  const { level, isCharging, isLow } = useBattery();

  const showBattery =
    batteryMode === "always" ||
    (batteryMode === "charging-or-low" && (isCharging || isLow));

  return (
    <View className="items-center gap-2">
      {clockStyle === "analog" ? (
        <AnalogClock
          clock={clock}
          size="homescreen"
          showSeconds={showSeconds}
        />
      ) : (
        <DigitalClock clock={clock} size="homescreen" />
      )}
      {showBattery && (
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-muted-foreground">
            {isCharging ? "⚡" : "🔋"} {level}%
          </Text>
        </View>
      )}
    </View>
  );
});
