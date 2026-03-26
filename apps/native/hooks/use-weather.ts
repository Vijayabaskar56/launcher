import { useCallback, useEffect, useRef, useState } from "react";

import { fetchWeather } from "@/lib/weather-api";
import type { WeatherData } from "@/lib/weather-api";
import type { WeatherProvider } from "@/types/settings";

// Default coordinates (San Francisco) — used when location is unavailable
const DEFAULT_LAT = 37.7749;
const DEFAULT_LON = -122.4194;

// Refresh interval: 30 minutes
const REFRESH_INTERVAL = 30 * 60 * 1000;

interface UseWeatherOptions {
  provider: WeatherProvider;
  autoLocation: boolean;
  manualLocation: string;
}

interface UseWeatherResult {
  data: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useWeather = ({
  provider,
  autoLocation,
  manualLocation,
}: UseWeatherOptions): UseWeatherResult => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (provider === "none") {
      setData(null);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      // For now, use default coordinates
      // eslint-disable-next-line no-warning-comments
      // TODO: Wire up expo-location for autoLocation support
      const lat = DEFAULT_LAT;
      const lon = DEFAULT_LON;
      const locationName =
        !autoLocation && manualLocation ? manualLocation : undefined;

      const result = await fetchWeather(provider, lat, lon, locationName);
      setData(result);
    } catch (error) {
      setFetchError(
        error instanceof Error ? error.message : "Failed to fetch weather"
      );
    } finally {
      setIsLoading(false);
    }
  }, [provider, autoLocation, manualLocation]);

  useEffect(() => {
    load();

    intervalRef.current = setInterval(load, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [load]);

  return { data, error: fetchError, isLoading, refresh: load };
};
