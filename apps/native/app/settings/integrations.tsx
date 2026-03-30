import { use, useCallback } from "react";
import { ScrollView } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SelectPreference } from "@/components/settings/select-preference";
import { SwitchPreference } from "@/components/settings/switch-preference";
import { TextPreference } from "@/components/settings/text-preference";
import { SettingsContext } from "@/context/settings";
import type { SearchEngine, WeatherProvider } from "@/types/settings";

export default function IntegrationsSettings() {
  const settings = use(SettingsContext);

  const handleWeatherProvider = useCallback(
    (v: WeatherProvider) => {
      settings?.actions.updateIntegrations({ weatherProvider: v });
    },
    [settings]
  );
  const handleOpenWeatherMapApiKey = useCallback(
    (v: string) => {
      settings?.actions.updateIntegrations({ openWeatherMapApiKey: v });
    },
    [settings]
  );
  const handleAutoLocation = useCallback(
    (v: boolean) => {
      settings?.actions.updateIntegrations({ autoLocation: v });
    },
    [settings]
  );
  const handleManualLocation = useCallback(
    (v: string) => {
      settings?.actions.updateIntegrations({ manualLocation: v });
    },
    [settings]
  );
  const handleSearchEngine = useCallback(
    (v: SearchEngine) => {
      settings?.actions.updateIntegrations({ searchEngine: v });
    },
    [settings]
  );
  const handleCalendarEnabled = useCallback(
    (v: boolean) => {
      settings?.actions.updateIntegrations({ calendarEnabled: v });
    },
    [settings]
  );
  const handleMediaEnabled = useCallback(
    (v: boolean) => {
      settings?.actions.updateIntegrations({ mediaEnabled: v });
    },
    [settings]
  );
  const handleFileSearchEnabled = useCallback(
    (v: boolean) => {
      settings?.actions.updateIntegrations({ fileSearchEnabled: v });
    },
    [settings]
  );
  const handleContactSearchEnabled = useCallback(
    (v: boolean) => {
      settings?.actions.updateIntegrations({ contactSearchEnabled: v });
    },
    [settings]
  );
  const handleNextcloudEnabled = useCallback(
    (v: boolean) => {
      settings?.actions.updateIntegrations({ nextcloudEnabled: v });
    },
    [settings]
  );
  const handleNextcloudUrl = useCallback(
    (v: string) => {
      settings?.actions.updateIntegrations({ nextcloudUrl: v });
    },
    [settings]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const { integrations } = state;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory title="Weather">
        <SelectPreference
          icon="cloud"
          title="Weather Provider"
          value={integrations.weatherProvider}
          options={[
            {
              label: "OpenWeatherMap",
              value: "openweathermap" as WeatherProvider,
            },
            { label: "Met.no", value: "met-no" as WeatherProvider },
            { label: "None", value: "none" as WeatherProvider },
          ]}
          onValueChange={handleWeatherProvider}
        />
        <TextPreference
          icon="vpn-key"
          title="OpenWeatherMap API Key"
          value={integrations.openWeatherMapApiKey}
          onChangeText={handleOpenWeatherMapApiKey}
          placeholder="Enter your API key"
          disabled={integrations.weatherProvider !== "openweathermap"}
        />
        <SwitchPreference
          icon="my-location"
          title="Auto Location"
          summary="Automatically detect location"
          value={integrations.autoLocation}
          onValueChange={handleAutoLocation}
        />
        <TextPreference
          icon="location-on"
          title="Manual Location"
          value={integrations.manualLocation}
          onChangeText={handleManualLocation}
          placeholder="Enter city name"
          disabled={integrations.autoLocation}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Search">
        <SelectPreference
          icon="search"
          title="Web Search Engine"
          value={integrations.searchEngine}
          options={[
            { label: "Google", value: "google" as SearchEngine },
            { label: "DuckDuckGo", value: "duckduckgo" as SearchEngine },
            { label: "Bing", value: "bing" as SearchEngine },
          ]}
          onValueChange={handleSearchEngine}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Services">
        <SwitchPreference
          icon="event"
          title="Calendar"
          summary="Show calendar events"
          value={integrations.calendarEnabled}
          onValueChange={handleCalendarEnabled}
        />
        <SwitchPreference
          icon="music-note"
          title="Media"
          summary="Show media controls"
          value={integrations.mediaEnabled}
          onValueChange={handleMediaEnabled}
        />
        <SwitchPreference
          icon="folder"
          title="File Search"
          summary="Enable file search provider"
          value={integrations.fileSearchEnabled}
          onValueChange={handleFileSearchEnabled}
        />
        <SwitchPreference
          icon="contacts"
          title="Contact Search"
          summary="Enable contact search provider"
          value={integrations.contactSearchEnabled}
          onValueChange={handleContactSearchEnabled}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Cloud">
        <SwitchPreference
          icon="cloud-queue"
          title="Nextcloud/Owncloud"
          summary="Enable Nextcloud integration"
          value={integrations.nextcloudEnabled}
          onValueChange={handleNextcloudEnabled}
        />
        <TextPreference
          icon="link"
          title="Server URL"
          value={integrations.nextcloudUrl}
          onChangeText={handleNextcloudUrl}
          placeholder="https://cloud.example.com"
          disabled={!integrations.nextcloudEnabled}
        />
      </PreferenceCategory>
    </ScrollView>
  );
}
