import { memo } from "react";
import { Text, View } from "react-native";

import type { WidgetSize } from "@/context/widget-config";
import { useBattery } from "@/hooks/use-battery";

import { Icon, ICON_MAP } from "../ui/icon";
import { WidgetCard } from "./widget-card";

const BatteryWidget = memo(function BatteryWidget({
  opacity,
  size = "medium",
}: {
  opacity?: number;
  size?: WidgetSize;
}) {
  const isSmall = size === "small";
  const { level, statusText } = useBattery();

  return (
    <WidgetCard opacity={opacity} size={size}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-1">
          <Text
            className={`text-foreground font-extralight tabular-nums ${isSmall ? "text-3xl" : "text-5xl"}`}
            style={{ letterSpacing: -2 }}
          >
            {level}%
          </Text>
          {!isSmall && (
            <Text className="text-sm font-semibold text-muted-foreground">
              {statusText}
            </Text>
          )}
        </View>
        <View className="items-center justify-center">
          <View className="border-2 border-border rounded-sm h-12 w-20 items-center justify-center">
            <Icon name={ICON_MAP.battery} size={isSmall ? 24 : 32} />
          </View>
        </View>
      </View>
    </WidgetCard>
  );
});

export { BatteryWidget };
