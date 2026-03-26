import { use, useCallback } from "react";
import { ScrollView } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SelectPreference } from "@/components/settings/select-preference";
import { SliderPreference } from "@/components/settings/slider-preference";
import { SwitchPreference } from "@/components/settings/switch-preference";
import { SettingsContext } from "@/context/settings";
import type {
  BatteryIndicatorMode,
  ClockStyle,
  SearchBarPosition,
  SearchBarStyle,
  SystemBarIconColor,
} from "@/types/settings";

export default function HomescreenSettings() {
  const settings = use(SettingsContext);

  const handleClockStyle = useCallback(
    (v: ClockStyle) => {
      settings?.actions.updateHomescreen({ clockStyle: v });
    },
    [settings]
  );
  const handleShowSeconds = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ showSeconds: v });
    },
    [settings]
  );
  const handleBatteryIndicator = useCallback(
    (v: BatteryIndicatorMode) => {
      settings?.actions.updateHomescreen({ batteryIndicator: v });
    },
    [settings]
  );
  const handleFixedRotation = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ fixedRotation: v });
    },
    [settings]
  );
  const handleDockEnabled = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ dockEnabled: v });
    },
    [settings]
  );
  const handleDockRowCount = useCallback(
    (v: number) => {
      settings?.actions.updateHomescreen({ dockRowCount: v });
    },
    [settings]
  );
  const handleWidgetsEnabled = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ widgetsEnabled: v });
    },
    [settings]
  );
  const handleSearchBarStyle = useCallback(
    (v: SearchBarStyle) => {
      settings?.actions.updateHomescreen({ searchBarStyle: v });
    },
    [settings]
  );
  const handleSearchBarPosition = useCallback(
    (v: SearchBarPosition) => {
      settings?.actions.updateHomescreen({ searchBarPosition: v });
    },
    [settings]
  );
  const handleFixedSearchBar = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ fixedSearchBar: v });
    },
    [settings]
  );
  const handleWallpaperDim = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ wallpaperDim: v });
    },
    [settings]
  );
  const handleWallpaperBlur = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ wallpaperBlur: v });
    },
    [settings]
  );
  const handleWallpaperBlurRadius = useCallback(
    (v: number) => {
      settings?.actions.updateHomescreen({ wallpaperBlurRadius: v });
    },
    [settings]
  );
  const handleStatusBarIconColor = useCallback(
    (v: SystemBarIconColor) => {
      settings?.actions.updateHomescreen({ statusBarIconColor: v });
    },
    [settings]
  );
  const handleNavigationBarIconColor = useCallback(
    (v: SystemBarIconColor) => {
      settings?.actions.updateHomescreen({ navigationBarIconColor: v });
    },
    [settings]
  );
  const handleHideStatusBar = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ hideStatusBar: v });
    },
    [settings]
  );
  const handleHideNavigationBar = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ hideNavigationBar: v });
    },
    [settings]
  );
  const handleChargingAnimation = useCallback(
    (v: boolean) => {
      settings?.actions.updateHomescreen({ chargingAnimation: v });
    },
    [settings]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const { homescreen } = state;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory title="Clock">
        <SelectPreference
          icon="schedule"
          title="Clock Style"
          value={homescreen.clockStyle}
          options={[
            { label: "Digital", value: "digital" as ClockStyle },
            { label: "Analog", value: "analog" as ClockStyle },
          ]}
          onValueChange={handleClockStyle}
        />
        <SwitchPreference
          icon="timer"
          title="Show Seconds"
          summary="Display seconds in clock"
          value={homescreen.showSeconds}
          onValueChange={handleShowSeconds}
        />
        <SelectPreference
          icon="battery-std"
          title="Battery Indicator"
          value={homescreen.batteryIndicator}
          options={[
            { label: "Hidden", value: "hide" as BatteryIndicatorMode },
            {
              label: "Always visible",
              value: "always" as BatteryIndicatorMode,
            },
            {
              label: "Charging or low",
              value: "charging-or-low" as BatteryIndicatorMode,
            },
          ]}
          onValueChange={handleBatteryIndicator}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Layout">
        <SwitchPreference
          icon="screen-rotation"
          title="Fixed Rotation"
          summary="Lock screen orientation"
          value={homescreen.fixedRotation}
          onValueChange={handleFixedRotation}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Dock">
        <SwitchPreference
          icon="dock"
          title="Show Dock"
          summary="Display dock at the bottom"
          value={homescreen.dockEnabled}
          onValueChange={handleDockEnabled}
        />
        <SliderPreference
          title="Dock Rows"
          value={homescreen.dockRowCount}
          onValueChange={handleDockRowCount}
          minValue={1}
          maxValue={3}
          step={1}
          disabled={!homescreen.dockEnabled}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Widgets">
        <SwitchPreference
          icon="widgets"
          title="Enable Widgets"
          value={homescreen.widgetsEnabled}
          onValueChange={handleWidgetsEnabled}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Search Bar">
        <SelectPreference
          icon="search"
          title="Style"
          value={homescreen.searchBarStyle}
          options={[
            { label: "Transparent", value: "transparent" as SearchBarStyle },
            { label: "Solid", value: "solid" as SearchBarStyle },
            { label: "Hidden", value: "hidden" as SearchBarStyle },
          ]}
          onValueChange={handleSearchBarStyle}
        />
        <SelectPreference
          title="Position"
          value={homescreen.searchBarPosition}
          options={[
            { label: "Top", value: "top" as SearchBarPosition },
            { label: "Bottom", value: "bottom" as SearchBarPosition },
          ]}
          onValueChange={handleSearchBarPosition}
        />
        <SwitchPreference
          title="Fixed Search Bar"
          summary="Keep search bar always visible"
          value={homescreen.fixedSearchBar}
          onValueChange={handleFixedSearchBar}
        />
      </PreferenceCategory>

      <PreferenceCategory
        title="Wallpaper"
        description="Requires transparent window — coming soon"
      >
        <SwitchPreference
          icon="image"
          title="Dim Wallpaper"
          summary="Requires transparent window"
          value={homescreen.wallpaperDim}
          onValueChange={handleWallpaperDim}
          disabled
        />
        <SwitchPreference
          title="Blur Wallpaper"
          summary="Requires transparent window"
          value={homescreen.wallpaperBlur}
          onValueChange={handleWallpaperBlur}
          disabled
        />
        <SliderPreference
          title="Blur Radius"
          value={homescreen.wallpaperBlurRadius}
          onValueChange={handleWallpaperBlurRadius}
          minValue={0}
          maxValue={50}
          step={5}
          disabled={!homescreen.wallpaperBlur}
        />
      </PreferenceCategory>

      <PreferenceCategory title="System Bars">
        <SelectPreference
          icon="brightness-high"
          title="Status Bar Icons"
          value={homescreen.statusBarIconColor}
          options={[
            { label: "Auto", value: "auto" as SystemBarIconColor },
            { label: "Light", value: "light" as SystemBarIconColor },
            { label: "Dark", value: "dark" as SystemBarIconColor },
          ]}
          onValueChange={handleStatusBarIconColor}
        />
        <SelectPreference
          title="Navigation Bar Icons"
          value={homescreen.navigationBarIconColor}
          options={[
            { label: "Auto", value: "auto" as SystemBarIconColor },
            { label: "Light", value: "light" as SystemBarIconColor },
            { label: "Dark", value: "dark" as SystemBarIconColor },
          ]}
          onValueChange={handleNavigationBarIconColor}
        />
        <SwitchPreference
          title="Hide Status Bar"
          value={homescreen.hideStatusBar}
          onValueChange={handleHideStatusBar}
        />
        <SwitchPreference
          title="Hide Navigation Bar"
          value={homescreen.hideNavigationBar}
          onValueChange={handleHideNavigationBar}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Animations">
        <SwitchPreference
          icon="battery-charging-full"
          title="Charging Animation"
          summary="Show animation when charging"
          value={homescreen.chargingAnimation}
          onValueChange={handleChargingAnimation}
        />
      </PreferenceCategory>
    </ScrollView>
  );
}
