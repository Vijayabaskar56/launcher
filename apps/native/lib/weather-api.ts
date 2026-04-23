import { fetch } from "react-native-nitro-fetch";

import type { WeatherProvider } from "@/types/settings";

export interface HourlyForecast {
  time: string;
  temperature: number;
  icon: WeatherIcon;
}

export interface DailyForecast {
  day: string;
  temperatureMin: number;
  temperatureMax: number;
  icon: WeatherIcon;
}

export interface WeatherData {
  temperature: number;
  temperatureHigh: number;
  temperatureLow: number;
  condition: string;
  icon: WeatherIcon;
  location: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export type WeatherIcon =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "snow"
  | "thunderstorm"
  | "fog";

// --- Met.no (free, no API key) ---

interface MetNoTimeseries {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature: number;
        relative_humidity?: number;
        wind_speed?: number;
      };
    };
    next_1_hours?: {
      summary: { symbol_code: string };
      details?: { precipitation_amount?: number };
    };
    next_6_hours?: {
      details: {
        air_temperature_max?: number;
        air_temperature_min?: number;
      };
      summary: { symbol_code: string };
    };
  };
}

interface MetNoResponse {
  properties: {
    timeseries: MetNoTimeseries[];
  };
}

const mapMetNoIcon = (symbolCode: string): WeatherIcon => {
  if (symbolCode.includes("thunder")) {
    return "thunderstorm";
  }
  if (symbolCode.includes("snow") || symbolCode.includes("sleet")) {
    return "snow";
  }
  if (symbolCode.includes("rain") || symbolCode.includes("drizzle")) {
    return "rain";
  }
  if (symbolCode.includes("fog")) {
    return "fog";
  }
  if (symbolCode.includes("cloudy") && !symbolCode.includes("fair")) {
    return "cloudy";
  }
  if (symbolCode.includes("partlycloudy") || symbolCode.includes("fair")) {
    return "partly-cloudy";
  }
  return "sunny";
};

const mapMetNoCondition = (symbolCode: string): string => {
  if (symbolCode.includes("thunder")) {
    return "Thunderstorm";
  }
  if (symbolCode.includes("snow")) {
    return "Snow";
  }
  if (symbolCode.includes("sleet")) {
    return "Sleet";
  }
  if (symbolCode.includes("heavyrain")) {
    return "Heavy Rain";
  }
  if (symbolCode.includes("rain") || symbolCode.includes("drizzle")) {
    return "Rain";
  }
  if (symbolCode.includes("fog")) {
    return "Fog";
  }
  if (symbolCode.includes("cloudy") && !symbolCode.includes("fair")) {
    return "Cloudy";
  }
  if (symbolCode.includes("partlycloudy")) {
    return "Partly Cloudy";
  }
  if (symbolCode.includes("fair")) {
    return "Fair";
  }
  return "Clear";
};

const buildDailyForecasts = (
  series: MetNoTimeseries[],
  nowTime: string
): DailyForecast[] => {
  const buckets = new Map<string, MetNoTimeseries[]>();
  for (const entry of series) {
    const d = new Date(entry.time);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const list = buckets.get(key) ?? [];
    list.push(entry);
    buckets.set(key, list);
  }

  const todayKey = (() => {
    const d = new Date(nowTime);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  })();
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daily: DailyForecast[] = [];

  for (const [key, entries] of buckets) {
    if (key === todayKey) {
      continue;
    }
    if (daily.length >= 3) {
      break;
    }
    const dayTemps = entries.map((e) => e.data.instant.details.air_temperature);
    const midday =
      entries.find((e) => new Date(e.time).getHours() === 12) ?? entries[0];
    const code =
      midday.data.next_6_hours?.summary.symbol_code ??
      midday.data.next_1_hours?.summary.symbol_code ??
      "clearsky_day";
    const date = new Date(entries[0].time);
    daily.push({
      day: DAY_NAMES[date.getDay()],
      icon: mapMetNoIcon(code),
      temperatureMax: Math.round(Math.max(...dayTemps)),
      temperatureMin: Math.round(Math.min(...dayTemps)),
    });
  }

  return daily;
};

const fetchMetNo = async (
  lat: number,
  lon: number
): Promise<Omit<WeatherData, "location">> => {
  const res = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
    {
      headers: {
        "User-Agent": "Launcher/1.0 github.com/launcher",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Met.no API error: ${res.status}`);
  }

  const data = (await res.json()) as MetNoResponse;
  const series = data.properties.timeseries;
  const [now] = series;
  const temp = Math.round(now.data.instant.details.air_temperature);

  const symbolCode =
    now.data.next_1_hours?.summary.symbol_code ??
    now.data.next_6_hours?.summary.symbol_code ??
    "clearsky_day";

  // Compute today's high/low from the next 24 hourly entries.
  const next24 = series.slice(0, 24);
  const temps24 = next24.map((t) => t.data.instant.details.air_temperature);
  const high = Math.round(Math.max(...temps24));
  const low = Math.round(Math.min(...temps24));

  // Hourly strip — next 3 entries after "now", on the hour.
  const hourly: HourlyForecast[] = series.slice(1, 4).map((entry) => {
    const code =
      entry.data.next_1_hours?.summary.symbol_code ??
      entry.data.next_6_hours?.summary.symbol_code ??
      "clearsky_day";
    const date = new Date(entry.time);
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    return {
      icon: mapMetNoIcon(code),
      temperature: Math.round(entry.data.instant.details.air_temperature),
      time: `${hh}:${mm}`,
    };
  });

  const daily = buildDailyForecasts(series, now.time);

  return {
    condition: mapMetNoCondition(symbolCode),
    daily,
    hourly,
    humidity: Math.round(now.data.instant.details.relative_humidity ?? 0),
    icon: mapMetNoIcon(symbolCode),
    precipitation: now.data.next_1_hours?.details?.precipitation_amount ?? 0,
    temperature: temp,
    temperatureHigh: high,
    temperatureLow: low,
    windSpeed: now.data.instant.details.wind_speed ?? 0,
  };
};

// --- OpenWeatherMap (requires API key) ---

interface OWMWeatherEntry {
  id: number;
  main: string;
  description: string;
}

interface OWMResponse {
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
  };
  weather: OWMWeatherEntry[];
  name: string;
}

const mapOWMIcon = (weatherId: number): WeatherIcon => {
  if (weatherId >= 200 && weatherId < 300) {
    return "thunderstorm";
  }
  if (weatherId >= 300 && weatherId < 400) {
    return "rain";
  }
  if (weatherId >= 500 && weatherId < 600) {
    return "rain";
  }
  if (weatherId >= 600 && weatherId < 700) {
    return "snow";
  }
  if (weatherId >= 700 && weatherId < 800) {
    return "fog";
  }
  if (weatherId === 800) {
    return "sunny";
  }
  if (weatherId === 801 || weatherId === 802) {
    return "partly-cloudy";
  }
  return "cloudy";
};

const mapOWMCondition = (main: string): string => {
  const mapping: Record<string, string> = {
    Clear: "Clear",
    Clouds: "Cloudy",
    Drizzle: "Drizzle",
    Rain: "Rain",
    Snow: "Snow",
    Thunderstorm: "Thunderstorm",
  };
  return mapping[main] ?? main;
};

const fetchOpenWeatherMap = async (
  lat: number,
  lon: number,
  apiKey: string
): Promise<Omit<WeatherData, "location">> => {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
  );

  if (!res.ok) {
    throw new Error(`OpenWeatherMap API error: ${res.status}`);
  }

  const data = (await res.json()) as OWMResponse;
  const [weather] = data.weather;

  return {
    condition: mapOWMCondition(weather.main),
    daily: [],
    hourly: [],
    humidity: 0,
    icon: mapOWMIcon(weather.id),
    precipitation: 0,
    temperature: Math.round(data.main.temp),
    temperatureHigh: Math.round(data.main.temp_max),
    temperatureLow: Math.round(data.main.temp_min),
    windSpeed: 0,
  };
};

// --- Geocoding (reverse lookup via Nominatim) ---

interface NominatimResult {
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
}

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          "User-Agent": "Launcher/1.0 github.com/launcher",
        },
      }
    );
    if (!res.ok) {
      return `${lat.toFixed(1)}, ${lon.toFixed(1)}`;
    }
    const data = (await res.json()) as NominatimResult;
    const addr = data.address;
    return (
      addr.city ??
      addr.town ??
      addr.village ??
      addr.municipality ??
      addr.state ??
      "Unknown"
    );
  } catch {
    return `${lat.toFixed(1)}, ${lon.toFixed(1)}`;
  }
};

// --- Public API ---

export const fetchWeather = async (
  provider: WeatherProvider,
  lat: number,
  lon: number,
  locationName?: string,
  apiKey?: string
): Promise<WeatherData | null> => {
  if (provider === "none") {
    return null;
  }

  const weatherData =
    provider === "openweathermap" && apiKey
      ? await fetchOpenWeatherMap(lat, lon, apiKey)
      : await fetchMetNo(lat, lon);

  const location = locationName ?? (await reverseGeocode(lat, lon));

  return { ...weatherData, location };
};
