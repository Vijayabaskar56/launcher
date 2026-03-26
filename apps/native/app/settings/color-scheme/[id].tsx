import { Stack, useLocalSearchParams } from "expo-router";
import { useThemeColor } from "heroui-native";
import { memo, use, useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SettingsContext } from "@/context/settings";
import { ACCENT_COLORS, THEME_PRESETS } from "@/types/settings";

interface AccentSwatchProps {
  color: string;
  name: string;
  isSelected: boolean;
  onSelect: (color: string) => void;
}

const AccentSwatch = memo(function AccentSwatch({
  color,
  name,
  isSelected,
  onSelect,
}: AccentSwatchProps) {
  const [fg, muted] = useThemeColor(["foreground", "muted"] as const);

  const handlePress = useCallback(() => {
    onSelect(color);
  }, [onSelect, color]);

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      alignItems: "center" as const,
      gap: 6,
      opacity: pressed ? 0.7 : 1,
    }),
    []
  );

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={`${name} accent color`}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      style={getStyle}
    >
      <View
        style={{
          backgroundColor: color,
          borderColor: isSelected ? fg : "transparent",
          borderCurve: "continuous",
          borderRadius: 22,
          borderWidth: isSelected ? 3 : 0,
          height: 44,
          width: 44,
        }}
      >
        {isSelected ? null : (
          <View
            style={{
              borderColor: "rgba(255, 255, 255, 0.15)",
              borderCurve: "continuous",
              borderRadius: 22,
              borderWidth: 1,
              height: "100%",
              width: "100%",
            }}
          />
        )}
      </View>
      <Text
        style={{
          color: isSelected ? fg : muted,
          fontSize: 10,
          fontWeight: isSelected ? "600" : "400",
          letterSpacing: -0.1,
        }}
      >
        {name}
      </Text>
    </Pressable>
  );
});

const ColorSchemeDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = use(SettingsContext);
  const muted = useThemeColor("muted");

  const handleSelectAccent = useCallback(
    (color: string) => {
      settings?.actions.updateAppearance({ accentColor: color });
    },
    [settings]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const preset = THEME_PRESETS.find((p) => p.id === id);
  const presetName = preset?.name ?? "Theme";
  const currentAccent = state.appearance.accentColor;

  return (
    <>
      <Stack.Screen options={{ title: presetName }} />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
      >
        <PreferenceCategory title="Accent Color">
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "center",
              paddingHorizontal: 12,
              paddingVertical: 16,
            }}
          >
            {ACCENT_COLORS.map((accent) => (
              <AccentSwatch
                key={accent.value}
                color={accent.value}
                name={accent.name}
                isSelected={
                  currentAccent.toLowerCase() === accent.value.toLowerCase()
                }
                onSelect={handleSelectAccent}
              />
            ))}
          </View>
        </PreferenceCategory>

        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              color: muted,
              fontSize: 12,
              letterSpacing: -0.1,
              lineHeight: 16,
              textAlign: "center",
            }}
          >
            Changes are applied instantly across the app.
          </Text>
        </View>
      </ScrollView>
    </>
  );
};

export default ColorSchemeDetail;
