import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { memo, useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

interface SelectOption<T extends string> {
  label: string;
  value: T;
}

interface OptionPillProps {
  label: string;
  optionValue: string;
  isSelected: boolean;
  disabled: boolean;
  onValueChange: (value: string) => void;
  accentColor: string;
  accentForeground: string;
  surface: string;
  muted: string;
  smallRadius: number;
}

const OptionPill = memo(function OptionPill({
  label,
  optionValue,
  isSelected,
  disabled,
  onValueChange,
  accentColor,
  accentForeground,
  surface,
  muted,
  smallRadius,
}: OptionPillProps) {
  const handlePress = useCallback(() => {
    if (!disabled) {
      onValueChange(optionValue);
    }
  }, [disabled, onValueChange, optionValue]);

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      backgroundColor: isSelected ? accentColor : surface,
      borderColor: isSelected ? accentColor : "transparent",
      borderCurve: "continuous" as const,
      borderRadius: smallRadius,
      borderWidth: 1,
      opacity: pressed ? 0.7 : 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
    }),
    [isSelected, accentColor, surface, smallRadius]
  );

  return (
    <Pressable onPress={handlePress} style={getStyle}>
      <Text
        style={{
          color: isSelected ? accentForeground : muted,
          fontSize: 13,
          fontWeight: isSelected ? "600" : "500",
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

interface SelectPreferenceProps<T extends string> {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  summary?: string;
  value: T;
  options: SelectOption<T>[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
}

export const SelectPreference = <T extends string>({
  icon,
  title,
  summary,
  value,
  options,
  onValueChange,
  disabled = false,
}: SelectPreferenceProps<T>) => {
  const { smallRadius, accentColor, accentForeground, fontFamily } =
    useThemeOverrides();
  const [defaultBg, foreground, muted, surface] = useThemeColor([
    "default",
    "foreground",
    "muted",
    "surface",
  ] as const);

  const handleValueChange = useCallback(
    (v: string) => {
      onValueChange(v as T);
    },
    [onValueChange]
  );

  return (
    <View
      style={{
        gap: 12,
        opacity: disabled ? 0.4 : 1,
        paddingHorizontal: 16,
        paddingVertical: 13,
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: 14 }}>
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
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          paddingLeft: icon ? 50 : 0,
        }}
      >
        {options.map((option) => (
          <OptionPill
            key={option.value}
            label={option.label}
            optionValue={option.value}
            isSelected={value === option.value}
            disabled={disabled}
            onValueChange={handleValueChange}
            accentColor={accentColor}
            accentForeground={accentForeground}
            surface={surface}
            muted={muted}
            smallRadius={smallRadius}
          />
        ))}
      </View>
    </View>
  );
};
