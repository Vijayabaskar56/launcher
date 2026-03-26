import { MaterialIcons } from "@expo/vector-icons";
import { Switch, useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

interface SwitchPreferenceProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  summary?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const SwitchPreference = ({
  icon,
  title,
  summary,
  value,
  onValueChange,
  disabled = false,
}: SwitchPreferenceProps) => {
  const { smallRadius, fontFamily } = useThemeOverrides();
  const [surfaceHover, defaultBg, foreground, muted] = useThemeColor([
    "surface-hover",
    "default",
    "foreground",
    "muted",
  ] as const);

  const handlePress = useCallback(() => {
    if (!disabled) {
      onValueChange(!value);
    }
  }, [disabled, onValueChange, value]);

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      alignItems: "center" as const,
      backgroundColor: pressed && !disabled ? surfaceHover : "transparent",
      flexDirection: "row" as const,
      gap: 14,
      opacity: disabled ? 0.4 : 1,
      paddingHorizontal: 16,
      paddingVertical: 13,
    }),
    [disabled, surfaceHover]
  );

  return (
    <Pressable onPress={handlePress} style={getStyle}>
      {icon ? (
        <View
          style={{
            alignItems: "center",
            backgroundColor: defaultBg,
            borderCurve: "continuous",
            borderRadius: smallRadius,
            height: 36,
            justifyContent: "center",
            width: 36,
          }}
        >
          <MaterialIcons name={icon} size={20} color={foreground} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: foreground,
            fontFamily,
            fontSize: 16,
            fontWeight: "500",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        {summary ? (
          <Text
            style={{
              color: muted,
              fontSize: 13,
              fontWeight: "400",
              letterSpacing: -0.1,
              lineHeight: 18,
            }}
          >
            {summary}
          </Text>
        ) : null}
      </View>
      <Switch
        isSelected={value}
        onSelectedChange={onValueChange}
        isDisabled={disabled}
      />
    </Pressable>
  );
};
