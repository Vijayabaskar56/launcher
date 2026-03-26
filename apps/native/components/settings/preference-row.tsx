import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

interface PreferenceRowProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  title: string;
  summary?: string;
  onPress?: () => void;
  showChevron?: boolean;
  right?: React.ReactNode;
  showSeparator?: boolean;
}

export const PreferenceRow = ({
  icon,
  iconColor,
  title,
  summary,
  onPress,
  showChevron = true,
  right,
  showSeparator = true,
}: PreferenceRowProps) => {
  const { smallRadius, fontFamily } = useThemeOverrides();
  const [surfaceHover, defaultBg, foreground, muted, border] = useThemeColor([
    "surface-hover",
    "default",
    "foreground",
    "muted",
    "border",
  ] as const);

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      alignItems: "center" as const,
      backgroundColor: pressed ? surfaceHover : "transparent",
      flexDirection: "row" as const,
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
    }),
    [surfaceHover]
  );

  return (
    <Pressable onPress={onPress} style={getStyle}>
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
          <MaterialIcons
            name={icon}
            size={20}
            color={iconColor ?? foreground}
          />
        </View>
      ) : null}
      <View
        style={{
          alignItems: "center",
          borderBottomColor: showSeparator ? border : "transparent",
          borderBottomWidth: showSeparator ? 0.5 : 0,
          flex: 1,
          flexDirection: "row",
          gap: 12,
          paddingBottom: showSeparator ? 0 : 0,
        }}
      >
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
        {right}
        {showChevron && !right ? (
          <MaterialIcons name="chevron-right" size={20} color={muted} />
        ) : null}
      </View>
    </Pressable>
  );
};
