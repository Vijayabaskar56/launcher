import { useRouter } from "expo-router";
import { use, useCallback } from "react";
import { ScrollView } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { PreferenceRow } from "@/components/settings/preference-row";
import { SelectPreference } from "@/components/settings/select-preference";
import { SliderPreference } from "@/components/settings/slider-preference";
import { SettingsContext } from "@/context/settings";
import type { ColorScheme, FontFamily } from "@/types/settings";
import { FONT_FAMILIES, THEME_PRESETS } from "@/types/settings";

export default function AppearanceSettings() {
  const settings = use(SettingsContext);
  const router = useRouter();

  const handleNavigateColorScheme = useCallback(() => {
    router.push("/settings/color-scheme" as never);
  }, [router]);

  const handleColorSchemeChange = useCallback(
    (v: ColorScheme) => {
      settings?.actions.updateAppearance({ colorScheme: v });
    },
    [settings]
  );

  const handleFontFamilyChange = useCallback(
    (v: FontFamily) => {
      settings?.actions.updateAppearance({ fontFamily: v });
    },
    [settings]
  );

  const handleCornerRadiusChange = useCallback(
    (v: number) => {
      settings?.actions.updateAppearance({ cornerRadius: v });
    },
    [settings]
  );

  const formatCornerRadius = useCallback((v: number) => `${v}px`, []);

  const handleTransparencyChange = useCallback(
    (v: number) => {
      settings?.actions.updateAppearance({ transparency: v / 100 });
    },
    [settings]
  );

  const formatTransparency = useCallback((v: number) => `${v}%`, []);

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const { appearance } = state;

  const currentPresetName =
    THEME_PRESETS.find((p) => p.id === appearance.themePreset)?.name ??
    "Default";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory title="Theme">
        <PreferenceRow
          icon="palette"
          title="Color Scheme"
          summary={currentPresetName}
          onPress={handleNavigateColorScheme}
        />
        <SelectPreference
          icon="brightness-6"
          title="Appearance"
          summary="Light, dark, or follow system"
          value={appearance.colorScheme}
          options={[
            { label: "Light", value: "light" as ColorScheme },
            { label: "Dark", value: "dark" as ColorScheme },
            { label: "System", value: "system" as ColorScheme },
          ]}
          onValueChange={handleColorSchemeChange}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Typography">
        <SelectPreference
          icon="text-fields"
          title="Font Family"
          value={appearance.fontFamily}
          options={FONT_FAMILIES.map((f) => ({
            label: f.label,
            value: f.id as FontFamily,
          }))}
          onValueChange={handleFontFamilyChange}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Shape">
        <SliderPreference
          title="Corner Radius"
          value={appearance.cornerRadius}
          onValueChange={handleCornerRadiusChange}
          minValue={0}
          maxValue={24}
          step={2}
          formatValue={formatCornerRadius}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Effects">
        <SliderPreference
          title="Transparency"
          value={Math.round(appearance.transparency * 100)}
          onValueChange={handleTransparencyChange}
          minValue={0}
          maxValue={100}
          step={5}
          formatValue={formatTransparency}
        />
      </PreferenceCategory>
    </ScrollView>
  );
}
