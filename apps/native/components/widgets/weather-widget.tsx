import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { use } from "react";
import { Text, View } from "react-native";

import { SettingsContext } from "@/context/settings";
import type { WidgetSize } from "@/context/widget-config";
import { useWeather } from "@/hooks/use-weather";
import { toast } from "@/lib/toast";
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
      openWeatherMapApiKey: "",
      weatherProvider: "met-no" as const,
    },
  };

  const { data, error, isLoading } = useWeather({
    apiKey: integrations.openWeatherMapApiKey,
    autoLocation: integrations.autoLocation,
    manualLocation: integrations.manualLocation,
    provider: integrations.weatherProvider,
  });

  if (error && !data) {
    toast.error("Weather unavailable", {
      description: error,
      duration: 4000,
    });
  }

  const isSmall = size === "small";
  const accentColor = useThemeColor("accent");
  const provider = integrations.weatherProvider;

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

  if (isSmall) {
    return (
      <WidgetCard opacity={opacity} size={size}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-foreground">
            {shortLocation}
          </Text>
          <WeatherIconView icon={data.icon} size={24} />
        </View>
        <Text
          className="text-3xl text-foreground font-extralight"
          style={{ letterSpacing: -2 }}
        >
          {data.temperature}°
        </Text>
      </WidgetCard>
    );
  }

  const providerLabel =
    provider === "openweathermap" ? "OpenWeatherMap" : "Met.no";

  return (
    <WidgetCard opacity={opacity} size={size}>
      {/* Header: location + provider tag */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1">
          <Ionicons name="business" size={18} color={accentColor} />
          <Text
            className="text-base font-semibold text-foreground"
            numberOfLines={1}
          >
            {data.location}
          </Text>
        </View>
        <View className="rounded-full bg-default/40 px-2 py-0.5">
          <Text className="text-[10px] text-muted-foreground">
            {providerLabel}
          </Text>
        </View>
      </View>

      {/* Main: big temp on the left, condition + icon on the right */}
      <View className="flex-row items-center justify-between mt-1">
        <Text
          className="text-5xl text-foreground font-extralight"
          style={{ letterSpacing: -2 }}
        >
          {data.temperature}°
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-muted-foreground">
            {data.condition}
          </Text>
          <WeatherIconView icon={data.icon} size={40} />
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row items-center justify-between mt-2">
        <View className="flex-row items-center gap-1">
          <Ionicons name="water-outline" size={14} color={accentColor} />
          <Text className="text-xs text-muted-foreground">
            {data.humidity}%
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="navigate-outline" size={14} color={accentColor} />
          <Text className="text-xs text-muted-foreground">
            {data.windSpeed.toFixed(1)} m/s
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="rainy-outline" size={14} color={accentColor} />
          <Text className="text-xs text-muted-foreground">
            {data.precipitation} mm
          </Text>
        </View>
      </View>

      {/* Hourly forecast strip */}
      {data.hourly.length > 0 && (
        <View className="flex-row gap-2 mt-2 pt-2 border-t border-default/30">
          {data.hourly.map((h) => (
            <View
              className="flex-1 items-center rounded-lg bg-default/30 px-2 py-1.5"
              key={h.time}
            >
              <WeatherIconView icon={h.icon} size={20} />
              <Text className="text-[10px] text-muted-foreground mt-0.5">
                {h.time}
              </Text>
              <Text className="text-xs text-foreground font-medium">
                {h.temperature}°
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Daily forecast row */}
      {data.daily.length > 0 && (
        <View className="flex-row gap-2 mt-2 pt-2 border-t border-default/30">
          {data.daily.map((d) => (
            <View
              className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-default/20 px-2 py-1.5"
              key={d.day}
            >
              <WeatherIconView icon={d.icon} size={18} />
              <View>
                <Text className="text-[10px] text-foreground font-medium">
                  {d.day}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  {d.temperatureMax}°/{d.temperatureMin}°
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </WidgetCard>
  );
};

export { WeatherWidget };
