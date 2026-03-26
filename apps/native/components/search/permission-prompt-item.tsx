import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import type { SearchResult } from "@/types/search";

const pressedStyle: ViewStyle = {
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.04)",
  flexDirection: "row",
  gap: 12,
  paddingHorizontal: 16,
  paddingVertical: 10,
};

const defaultStyle: ViewStyle = {
  ...pressedStyle,
  backgroundColor: "transparent",
};

const getPressableStyle = ({ pressed }: { pressed: boolean }) =>
  pressed ? pressedStyle : defaultStyle;

export const PermissionPromptItem = memo(function PermissionPromptItem({
  result,
}: {
  result: SearchResult;
}) {
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const handlePress = result.onPress;

  return (
    <Pressable onPress={handlePress} style={getPressableStyle}>
      <View
        style={{
          alignItems: "center",
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <Ionicons name="lock-closed-outline" size={22} color={muted} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text
          style={{
            color: foreground,
            fontSize: 15,
            fontWeight: "500",
            opacity: 0.7,
          }}
        >
          {result.title}
        </Text>
        {result.subtitle ? (
          <Text style={{ color: muted, fontSize: 13 }}>{result.subtitle}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});
