import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { memo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import type { SearchActionMatch } from "@/types/search";

type IoniconName = keyof typeof Ionicons.glyphMap;

const pillPressedStyle: ViewStyle = {
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.08)",
  borderRadius: 20,
  flexDirection: "row",
  gap: 6,
  paddingHorizontal: 14,
  paddingVertical: 8,
};

const pillDefaultStyle: ViewStyle = {
  ...pillPressedStyle,
  backgroundColor: "rgba(255,255,255,0.04)",
};

const getPillStyle = ({ pressed }: { pressed: boolean }) =>
  pressed ? pillPressedStyle : pillDefaultStyle;

const ActionPill = ({ action }: { action: SearchActionMatch }) => {
  const accent = useThemeColor("accent");
  const foreground = useThemeColor("foreground");
  const handlePress = action.onPress;

  return (
    <Pressable onPress={handlePress} style={getPillStyle}>
      <Ionicons name={action.icon as IoniconName} size={16} color={accent} />
      <Text
        numberOfLines={1}
        style={{ color: foreground, fontSize: 13, fontWeight: "500" }}
      >
        {action.label}
      </Text>
    </Pressable>
  );
};

export const SearchActionRow = memo(function SearchActionRow({
  actions,
}: {
  actions: SearchActionMatch[];
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={{ paddingVertical: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {actions.map((action) => (
          <ActionPill key={`${action.type}-${action.label}`} action={action} />
        ))}
      </ScrollView>
    </View>
  );
});
