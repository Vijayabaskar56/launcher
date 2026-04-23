import { useRouter } from "expo-router";
import { Radio, RadioGroup, useThemeColor } from "heroui-native";
import { memo, use, useCallback } from "react";
import { ScrollView, Text, View } from "react-native";

import { SettingsContext } from "@/context/settings";
import { useThemeOverrides } from "@/context/theme-overrides";
import type { ThemePreset } from "@/types/settings";
import { THEME_PRESETS } from "@/types/settings";

interface SchemeCardProps {
  id: ThemePreset;
  name: string;
  description: string;
  previewColors: readonly [string, string, string];
}

const SchemeCard = memo(function SchemeCard({
  id,
  name,
  description,
  previewColors,
}: SchemeCardProps) {
  const { cardRadius } = useThemeOverrides();
  const [fg, muted, border] = useThemeColor([
    "foreground",
    "muted",
    "border",
  ] as const);

  return (
    <RadioGroup.Item
      value={id}
      style={{
        borderCurve: "continuous",
        borderRadius: cardRadius,
        gap: 14,
        marginHorizontal: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      <Radio />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: fg,
            fontSize: 16,
            fontWeight: "500",
            letterSpacing: -0.2,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            color: muted,
            fontSize: 13,
            letterSpacing: -0.1,
          }}
        >
          {description}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {previewColors.map((color) => (
          <View
            key={color}
            style={{
              backgroundColor: color,
              borderColor: border,
              borderCurve: "continuous",
              borderRadius: 6,
              borderWidth: 1,
              height: 28,
              width: 28,
            }}
          />
        ))}
      </View>
    </RadioGroup.Item>
  );
});

const ColorSchemeList = () => {
  const settings = use(SettingsContext);
  const router = useRouter();

  const handleSelect = useCallback(
    (value: string) => {
      const id = value as ThemePreset;
      settings?.actions.updateAppearance({ themePreset: id });
      router.push(`/settings/color-scheme/${id}` as never);
    },
    [settings, router]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const currentPreset = state.appearance.themePreset;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 8, paddingBottom: 40, paddingTop: 12 }}
    >
      <RadioGroup value={currentPreset} onValueChange={handleSelect}>
        {THEME_PRESETS.map((preset) => (
          <SchemeCard
            key={preset.id}
            id={preset.id}
            name={preset.name}
            description={preset.description}
            previewColors={preset.previewColors}
          />
        ))}
      </RadioGroup>
    </ScrollView>
  );
};

export default ColorSchemeList;
