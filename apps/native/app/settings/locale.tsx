import { use, useCallback } from "react";
import { ScrollView } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SelectPreference } from "@/components/settings/select-preference";
import { TextPreference } from "@/components/settings/text-preference";
import { SettingsContext } from "@/context/settings";
import { useResolvedLocale } from "@/hooks/use-locale";
import type {
  CalendarType,
  MeasurementSystem,
  TimeFormat,
} from "@/types/settings";

export default function LocaleSettings() {
  const settings = use(SettingsContext);
  const detected = useResolvedLocale();

  const handleTimeFormat = useCallback(
    (v: TimeFormat) => {
      settings?.actions.updateLocale({ timeFormat: v });
    },
    [settings]
  );
  const handleMeasurementSystem = useCallback(
    (v: MeasurementSystem) => {
      settings?.actions.updateLocale({ measurementSystem: v });
    },
    [settings]
  );
  const handlePrimaryCalendar = useCallback(
    (v: CalendarType) => {
      settings?.actions.updateLocale({ primaryCalendar: v });
    },
    [settings]
  );
  const handleSecondaryCalendar = useCallback(
    (v: CalendarType) => {
      settings?.actions.updateLocale({ secondaryCalendar: v });
    },
    [settings]
  );
  const handleTransliterator = useCallback(
    (v: string) => {
      settings?.actions.updateLocale({ transliterator: v });
    },
    [settings]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const { locale } = state;

  const systemTimeLabel = `System (${detected.timeFormat === "24h" ? "24-hour" : "12-hour"})`;
  const systemMeasurementLabel = `System (${detected.measurementSystem === "metric" ? "Metric" : detected.measurementSystem.toUpperCase()})`;
  const calendarLabel = {
    gregorian: "Gregorian",
    hijri: "Hijri",
    persian: "Persian",
  };
  const systemCalendarLabel = `System (${calendarLabel[detected.calendar]})`;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory
        title="Time & Measurement"
        description={`Detected: ${detected.languageCode}${detected.regionCode ? `-${detected.regionCode}` : ""}`}
      >
        <SelectPreference
          icon="access-time"
          title="Time Format"
          value={locale.timeFormat}
          options={[
            { label: "12-hour", value: "12h" as TimeFormat },
            { label: "24-hour", value: "24h" as TimeFormat },
            { label: systemTimeLabel, value: "system" as TimeFormat },
          ]}
          onValueChange={handleTimeFormat}
        />
        <SelectPreference
          icon="straighten"
          title="Measurement System"
          value={locale.measurementSystem}
          options={[
            { label: "Metric", value: "metric" as MeasurementSystem },
            { label: "UK", value: "uk" as MeasurementSystem },
            { label: "US", value: "us" as MeasurementSystem },
            {
              label: systemMeasurementLabel,
              value: "system" as MeasurementSystem,
            },
          ]}
          onValueChange={handleMeasurementSystem}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Calendar">
        <SelectPreference
          icon="calendar-today"
          title="Primary Calendar"
          value={locale.primaryCalendar}
          options={[
            { label: systemCalendarLabel, value: "system" as CalendarType },
            { label: "Gregorian", value: "gregorian" as CalendarType },
            { label: "Persian", value: "persian" as CalendarType },
            { label: "Hijri", value: "hijri" as CalendarType },
          ]}
          onValueChange={handlePrimaryCalendar}
        />
        <SelectPreference
          title="Secondary Calendar"
          value={locale.secondaryCalendar}
          options={[
            { label: "None", value: "none" as CalendarType },
            { label: systemCalendarLabel, value: "system" as CalendarType },
            { label: "Gregorian", value: "gregorian" as CalendarType },
            { label: "Persian", value: "persian" as CalendarType },
            { label: "Hijri", value: "hijri" as CalendarType },
          ]}
          onValueChange={handleSecondaryCalendar}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Text">
        <TextPreference
          icon="translate"
          title="Transliterator"
          value={locale.transliterator}
          onChangeText={handleTransliterator}
          placeholder="e.g. Latin-Cyrillic"
        />
      </PreferenceCategory>
    </ScrollView>
  );
}
