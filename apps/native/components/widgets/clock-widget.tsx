import { memo, use } from "react";
import { Text, View } from "react-native";

import { DigitalClock } from "@/components/clock-styles/digital-clock";
import { SettingsContext } from "@/context/settings";
import type { WidgetSize } from "@/context/widget-config";
import { useClock } from "@/hooks/use-clock";

import { WidgetCard } from "./widget-card";

const ClockWidget = memo(function ClockWidget({
  opacity,
  size = "medium",
}: {
  opacity?: number;
  size?: WidgetSize;
}) {
  const settings = use(SettingsContext);
  const showSeconds = settings?.state.homescreen.showSeconds ?? false;
  const isSmall = size === "small";
  const clock = useClock(showSeconds);

  return (
    <WidgetCard opacity={opacity} size={size}>
      <DigitalClock clock={clock} size={isSmall ? "widget-small" : "widget"} />
      {!isSmall && (
        <View className="flex-row items-center gap-1.5">
          <Text className="text-lg font-semibold text-foreground">
            {clock.dateString}
          </Text>
        </View>
      )}
    </WidgetCard>
  );
});

export { ClockWidget };
