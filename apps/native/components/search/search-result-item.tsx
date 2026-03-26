import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { memo } from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import type { SearchResult } from "@/types/search";

type IoniconName = keyof typeof Ionicons.glyphMap;

const ResultIcon = ({
  icon,
  iconType,
  size = 36,
}: {
  icon?: string;
  iconType?: string;
  size?: number;
}) => {
  const muted = useThemeColor("muted");

  if (icon && iconType === "uri") {
    return (
      <Image
        source={{ uri: icon }}
        style={{ borderRadius: 8, height: size, width: size }}
      />
    );
  }

  if (icon && (iconType === "ionicon" || !iconType)) {
    return <Ionicons name={icon as IoniconName} size={22} color={muted} />;
  }

  return <Ionicons name="help-circle-outline" size={22} color={muted} />;
};

const resultPressedStyle: ViewStyle = {
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.04)",
  flexDirection: "row",
  gap: 12,
  paddingHorizontal: 16,
  paddingVertical: 10,
};

const resultDefaultStyle: ViewStyle = {
  ...resultPressedStyle,
  backgroundColor: "transparent",
};

const getResultPressableStyle = ({ pressed }: { pressed: boolean }) =>
  pressed ? resultPressedStyle : resultDefaultStyle;

export const SearchResultItem = memo(function SearchResultItem({
  result,
}: {
  result: SearchResult;
}) {
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const handlePress = result.onPress;
  const handleLongPress = result.onLongPress;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={getResultPressableStyle}
    >
      <View
        style={{
          alignItems: "center",
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <ResultIcon icon={result.icon} iconType={result.iconType} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            color: foreground,
            fontSize: 15,
            fontWeight: "500",
          }}
        >
          {result.title}
        </Text>
        {result.subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              color: muted,
              fontSize: 13,
            }}
          >
            {result.subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});
