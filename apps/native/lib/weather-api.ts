import { fetch } from "react-native-nitro-fetch";

import type { WeatherProvider } from "@/types/settings";

export interface WeatherData {
  temperature: number;
  temperatureHigh: number;
  temperatureLow: number;
  condition: string;
  icon: WeatherIcon;
  location: string;
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
  data: {
    instant: {
      details: {
        air_temperature: number;
      };
    };
    next_1_hours?: {
      summary: { symbol_code: string };
    };
    next_6_hours?: {
      details: {
        air_temperature_max: number;
        air_temperature_min: number;
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
  const [now] = data.properties.timeseries;
  const temp = Math.round(now.data.instant.details.air_temperature);

  const symbolCode =
    now.data.next_1_hours?.summary.symbol_code ??
    now.data.next_6_hours?.summary.symbol_code ??
    "clearsky_day";

  const high = now.data.next_6_hours
    ? Math.round(now.data.next_6_hours.details.air_temperature_max)
    : temp;
  const low = now.data.next_6_hours
    ? Math.round(now.data.next_6_hours.details.air_temperature_min)
    : temp;

  return {
    condition: mapMetNoCondition(symbolCode),
    icon: mapMetNoIcon(symbolCode),
    temperature: temp,
    temperatureHigh: high,
    temperatureLow: low,
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
  locationName?: string
): Promise<WeatherData | null> => {
  if (provider === "none") {
    return null;
  }

  // Met.no is the only fully implemented provider (no API key needed)
  // OpenWeatherMap falls through to Met.no for now until an API key flow is added
  const weather = await fetchMetNo(lat, lon);
  const location = locationName ?? (await reverseGeocode(lat, lon));

  return { ...weather, location };
};
