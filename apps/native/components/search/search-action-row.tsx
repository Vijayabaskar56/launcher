import { Ionicons } from "@expo/vector-icons";
import { Chip, useThemeColor } from "heroui-native";
import { memo } from "react";
import { ScrollView, View } from "react-native";

import type { SearchActionMatch } from "@/types/search";

type IoniconName = keyof typeof Ionicons.glyphMap;

const ActionPill = ({ action }: { action: SearchActionMatch }) => {
  const accent = useThemeColor("accent");
  const foreground = useThemeColor("foreground");
  const handlePress = action.onPress;

  return (
    <Chip
      onPress={handlePress}
      variant="secondary"
      color="default"
      className="bg-white/[0.04] px-3.5 py-2"
    >
      <Ionicons name={action.icon as IoniconName} size={16} color={accent} />
      <Chip.Label
        numberOfLines={1}
        style={{ color: foreground, fontSize: 13, fontWeight: "500" }}
      >
        {action.label}
      </Chip.Label>
    </Chip>
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
