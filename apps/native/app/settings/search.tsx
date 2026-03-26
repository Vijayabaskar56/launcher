import { use, useCallback } from "react";
import { ScrollView } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SwitchPreference } from "@/components/settings/switch-preference";
import { SettingsContext } from "@/context/settings";

export default function SearchSettings() {
  const settings = use(SettingsContext);

  const handleSearchAllApps = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ searchAllApps: v });
    },
    [settings]
  );
  const handleContactSearch = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ contactSearch: v });
    },
    [settings]
  );
  const handleContactCallOnTap = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ contactCallOnTap: v });
    },
    [settings]
  );
  const handleCalendarSearch = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ calendarSearch: v });
    },
    [settings]
  );
  const handleFileSearch = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ fileSearch: v });
    },
    [settings]
  );
  const handleShortcutSearch = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ shortcutSearch: v });
    },
    [settings]
  );
  const handleCalculator = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ calculator: v });
    },
    [settings]
  );
  const handleUnitConverter = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ unitConverter: v });
    },
    [settings]
  );
  const handleWikipediaSearch = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ wikipediaSearch: v });
    },
    [settings]
  );
  const handleWebsiteSearch = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ websiteSearch: v });
    },
    [settings]
  );
  const handleLocationSearch = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ locationSearch: v });
    },
    [settings]
  );
  const handleFilterBarEnabled = useCallback(
    (v: boolean) => {
      settings?.actions.updateSearch({ filterBarEnabled: v });
    },
    [settings]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const { search } = state;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory title="App Search">
        <SwitchPreference
          icon="apps"
          title="Search All Apps"
          summary="Include all installed apps in search"
          value={search.searchAllApps}
          onValueChange={handleSearchAllApps}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Content Search">
        <SwitchPreference
          icon="contacts"
          title="Contact Search"
          summary="Search contacts"
          value={search.contactSearch}
          onValueChange={handleContactSearch}
        />
        <SwitchPreference
          title="Call on Tap"
          summary="Call contact when tapped"
          value={search.contactCallOnTap}
          onValueChange={handleContactCallOnTap}
          disabled={!search.contactSearch}
        />
        <SwitchPreference
          icon="event"
          title="Calendar Search"
          summary="Search calendar events"
          value={search.calendarSearch}
          onValueChange={handleCalendarSearch}
        />
        <SwitchPreference
          icon="folder"
          title="File Search"
          summary="Search files"
          value={search.fileSearch}
          onValueChange={handleFileSearch}
        />
        <SwitchPreference
          icon="shortcut"
          title="Shortcut Search"
          summary="Search app shortcuts"
          value={search.shortcutSearch}
          onValueChange={handleShortcutSearch}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Tools">
        <SwitchPreference
          icon="calculate"
          title="Calculator"
          summary="Inline calculator in search"
          value={search.calculator}
          onValueChange={handleCalculator}
        />
        <SwitchPreference
          icon="straighten"
          title="Unit Converter"
          summary="Convert units in search"
          value={search.unitConverter}
          onValueChange={handleUnitConverter}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Web Search">
        <SwitchPreference
          icon="language"
          title="Wikipedia"
          summary="Search Wikipedia"
          value={search.wikipediaSearch}
          onValueChange={handleWikipediaSearch}
        />
        <SwitchPreference
          icon="public"
          title="Website Search"
          summary="Search websites"
          value={search.websiteSearch}
          onValueChange={handleWebsiteSearch}
        />
        <SwitchPreference
          icon="location-on"
          title="Location Search"
          summary="Search locations"
          value={search.locationSearch}
          onValueChange={handleLocationSearch}
        />
      </PreferenceCategory>

      <PreferenceCategory title="UI">
        <SwitchPreference
          icon="filter-list"
          title="Filter Bar"
          summary="Show filter bar in search results"
          value={search.filterBarEnabled}
          onValueChange={handleFilterBarEnabled}
        />
      </PreferenceCategory>
    </ScrollView>
  );
}
