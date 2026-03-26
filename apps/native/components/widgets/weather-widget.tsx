import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { use } from "react";
import { Text, View } from "react-native";

import { SettingsContext } from "@/context/settings";
import type { WidgetSize } from "@/context/widget-config";
import { useWeather } from "@/hooks/use-weather";
import type { WeatherIcon } from "@/lib/weather-api";

import { WidgetCard } from "./widget-card";

type IoniconName = keyof typeof Ionicons.glyphMap;

const WEATHER_ICONS: Record<WeatherIcon, IoniconName> = {
  cloudy: "cloudy",
  fog: "cloud-outline",
  "partly-cloudy": "partly-sunny",
  rain: "rainy",
  snow: "snow",
  sunny: "sunny",
  thunderstorm: "thunderstorm",
};

const WeatherIconView = ({
  icon,
  size,
}: {
  icon: WeatherIcon;
  size: number;
}) => {
  const color = useThemeColor("accent");
  return <Ionicons name={WEATHER_ICONS[icon]} size={size} color={color} />;
};

const WeatherWidget = function WeatherWidget({
  opacity,
  size = "medium",
}: {
  opacity?: number;
  size?: WidgetSize;
}) {
  const settings = use(SettingsContext);
  const { integrations } = settings?.state ?? {
    integrations: {
      autoLocation: true,
      manualLocation: "",
      weatherProvider: "met-no" as const,
    },
  };

  const { data, isLoading } = useWeather({
    autoLocation: integrations.autoLocation,
    manualLocation: integrations.manualLocation,
    provider: integrations.weatherProvider,
  });

  const isSmall = size === "small";

  if (isLoading && !data) {
    return (
      <WidgetCard opacity={opacity} size={size}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-foreground">
            Weather
          </Text>
        </View>
        <Text className="text-sm text-muted-foreground">Loading...</Text>
      </WidgetCard>
    );
  }

  if (!data) {
    return (
      <WidgetCard opacity={opacity} size={size}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-foreground">
            Weather
          </Text>
        </View>
        <Text className="text-sm text-muted-foreground">Unavailable</Text>
      </WidgetCard>
    );
  }

  const shortLocation =
    data.location.length > 6 ? data.location.slice(0, 5).trim() : data.location;

  return (
    <WidgetCard opacity={opacity} size={size}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-foreground">
          {isSmall ? shortLocation : data.location}
        </Text>
        <WeatherIconView icon={data.icon} size={isSmall ? 24 : 40} />
      </View>
      <View className="flex-row items-end gap-4">
        <Text
          className={`text-foreground font-extralight ${isSmall ? "text-3xl" : "text-5xl"}`}
          style={{ letterSpacing: -2 }}
        >
          {data.temperature}°
        </Text>
        {!isSmall && (
          <Text className="text-sm text-muted-foreground mb-1">
            {data.condition}
          </Text>
        )}
      </View>
      {!isSmall && (
        <View className="flex-row gap-4">
          <Text className="text-sm text-muted-foreground">
            H: {data.temperatureHigh}°
          </Text>
          <Text className="text-sm text-muted-foreground">
            L: {data.temperatureLow}°
          </Text>
        </View>
      )}
    </WidgetCard>
  );
};

export { WeatherWidget };
