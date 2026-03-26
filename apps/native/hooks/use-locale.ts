import { getCalendars, getLocales } from "expo-localization";

import type {
  CalendarType,
  MeasurementSystem,
  TimeFormat,
} from "@/types/settings";

type ResolvedCalendar = Exclude<CalendarType, "system" | "none">;

interface ResolvedLocale {
  timeFormat: "12h" | "24h";
  measurementSystem: "metric" | "uk" | "us";
  calendar: ResolvedCalendar;
  languageCode: string;
  regionCode: string | null;
}

const getUses24HourClock = (): boolean => {
  const calendars = getCalendars();
  return calendars[0]?.uses24hourClock ?? false;
};

const getSystemCalendar = (): ResolvedCalendar => {
  const calendars = getCalendars();
  const cal = calendars[0]?.calendar;
  if (cal === "persian") {
    return "persian";
  }
  if (
    cal === "islamic" ||
    cal === "islamic-civil" ||
    cal === "islamic-rgsa" ||
    cal === "islamic-tbla" ||
    cal === "islamic-umalqura"
  ) {
    return "hijri";
  }
  return "gregorian";
};

const getSystemMeasurement = (): "metric" | "uk" | "us" => {
  const locales = getLocales();
  const sys = locales[0]?.measurementSystem;
  if (sys === "us") {
    return "us";
  }
  if (sys === "uk") {
    return "uk";
  }
  return "metric";
};

export const useResolvedLocale = (): ResolvedLocale => {
  const locales = getLocales();
  const [primary] = locales;

  return {
    calendar: getSystemCalendar(),
    languageCode: primary?.languageCode ?? "en",
    measurementSystem: getSystemMeasurement(),
    regionCode: primary?.regionCode ?? null,
    timeFormat: getUses24HourClock() ? "24h" : "12h",
  };
};

/**
 * Resolves a "system" setting to its actual value using device locale.
 */
export const resolveTimeFormat = (setting: TimeFormat): "12h" | "24h" => {
  if (setting !== "system") {
    return setting;
  }
  return getUses24HourClock() ? "24h" : "12h";
};

export const resolveMeasurementSystem = (
  setting: MeasurementSystem
): "metric" | "uk" | "us" => {
  if (setting !== "system") {
    return setting;
  }
  return getSystemMeasurement();
};

export const resolveCalendar = (
  setting: CalendarType
): ResolvedCalendar | "none" => {
  if (setting !== "system") {
    return setting;
  }
  return getSystemCalendar();
};
