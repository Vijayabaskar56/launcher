import { MaterialIcons } from "@expo/vector-icons";
import { Input, TextField, useThemeColor } from "heroui-native";
import { Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

interface TextPreferenceProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TextPreference = ({
  icon,
  title,
  value,
  onChangeText,
  placeholder,
  disabled = false,
}: TextPreferenceProps) => {
  const { smallRadius } = useThemeOverrides();
  const [defaultBg, foreground, surface, border, muted] = useThemeColor([
    "default",
    "foreground",
    "surface",
    "border",
    "muted",
  ] as const);

  return (
    <View
      style={{
        gap: 10,
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
        <Text
          style={{
            color: foreground,
            fontSize: 16,
            fontWeight: "500",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ paddingLeft: icon ? 50 : 0 }}>
        <TextField isDisabled={disabled}>
          <Input
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            style={{
              backgroundColor: surface,
              borderColor: border,
              borderCurve: "continuous",
              borderRadius: smallRadius,
              borderWidth: 1,
              color: foreground,
              fontSize: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
            placeholderTextColor={muted}
          />
        </TextField>
      </View>
    </View>
  );
};
