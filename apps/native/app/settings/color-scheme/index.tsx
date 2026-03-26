import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColor } from "heroui-native";
import { memo, use, useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { SettingsContext } from "@/context/settings";
import { useThemeOverrides } from "@/context/theme-overrides";
import type { ThemePreset } from "@/types/settings";
import { THEME_PRESETS } from "@/types/settings";

interface SchemeCardProps {
  id: ThemePreset;
  name: string;
  description: string;
  previewColors: readonly [string, string, string];
  isSelected: boolean;
  onSelect: (id: ThemePreset) => void;
}

const SchemeCard = memo(function SchemeCard({
  id,
  name,
  description,
  previewColors,
  isSelected,
  onSelect,
}: SchemeCardProps) {
  const { cardRadius, accentColor } = useThemeOverrides();
  const [surface, fg, muted, border] = useThemeColor([
    "surface",
    "foreground",
    "muted",
    "border",
  ] as const);

  const handlePress = useCallback(() => {
    onSelect(id);
  }, [onSelect, id]);

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      alignItems: "center" as const,
      backgroundColor: pressed ? surface : "transparent",
      borderColor: isSelected ? accentColor : "transparent",
      borderCurve: "continuous" as const,
      borderRadius: cardRadius,
      borderWidth: 2,
      flexDirection: "row" as const,
      gap: 14,
      marginHorizontal: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
    }),
    [surface, isSelected, accentColor, cardRadius]
  );

  return (
    <Pressable onPress={handlePress} style={getStyle}>
      <MaterialIcons
        name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
        size={24}
        color={isSelected ? accentColor : muted}
      />
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
    </Pressable>
  );
});

const ColorSchemeList = () => {
  const settings = use(SettingsContext);
  const router = useRouter();

  const handleSelect = useCallback(
    (id: ThemePreset) => {
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
      {THEME_PRESETS.map((preset) => (
        <SchemeCard
          key={preset.id}
          id={preset.id}
          name={preset.name}
          description={preset.description}
          previewColors={preset.previewColors}
          isSelected={currentPreset === preset.id}
          onSelect={handleSelect}
        />
      ))}
    </ScrollView>
  );
};

export default ColorSchemeList;
