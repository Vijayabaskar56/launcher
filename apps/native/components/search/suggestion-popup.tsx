import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { memo } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import type {
  CommandSuggestion,
  EmojiSuggestion,
  FilterSuggestion,
  PersonSuggestion,
  Suggestion,
} from "@/types/enriched-search";

type IoniconName = keyof typeof Ionicons.glyphMap;

function PersonRow({
  data,
  onPress,
}: {
  data: PersonSuggestion;
  onPress: () => void;
}) {
  const foreground = useThemeColor("foreground");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? "rgba(127,127,127,0.12)" : "transparent",
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
      })}
    >
      {data.icon ? (
        <Image
          source={{ uri: data.icon }}
          style={{ borderRadius: 14, height: 28, width: 28 }}
        />
      ) : (
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(127,127,127,0.16)",
            borderRadius: 14,
            height: 28,
            justifyContent: "center",
            width: 28,
          }}
        >
          <Text style={{ color: foreground, fontSize: 13, fontWeight: "600" }}>
            {data.name.charAt(0)}
          </Text>
        </View>
      )}
      <Text style={{ color: foreground, fontSize: 15 }}>{data.name}</Text>
    </Pressable>
  );
}

function FilterRow({
  data,
  onPress,
}: {
  data: FilterSuggestion;
  onPress: () => void;
}) {
  const foreground = useThemeColor("foreground");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? "rgba(127,127,127,0.12)" : "transparent",
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
      })}
    >
      <Ionicons name={data.icon as IoniconName} size={20} color={foreground} />
      <Text style={{ color: foreground, fontSize: 15 }}>{data.label}</Text>
    </Pressable>
  );
}

function EmojiRow({
  data,
  onPress,
}: {
  data: EmojiSuggestion;
  onPress: () => void;
}) {
  const muted = useThemeColor("muted");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? "rgba(127,127,127,0.12)" : "transparent",
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
      })}
    >
      <Text style={{ fontSize: 22 }}>{data.emoji}</Text>
      <Text style={{ color: muted, fontSize: 14 }}>:{data.shortcode}:</Text>
    </Pressable>
  );
}

function CommandRow({
  data,
  onPress,
}: {
  data: CommandSuggestion;
  onPress: () => void;
}) {
  const accent = useThemeColor("accent");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: pressed ? "rgba(127,127,127,0.12)" : "transparent",
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
      })}
    >
      <Ionicons name={data.icon as IoniconName} size={20} color={accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: foreground, fontSize: 15, fontWeight: "500" }}>
          {data.command}
        </Text>
        <Text style={{ color: muted, fontSize: 12 }}>{data.label}</Text>
      </View>
    </Pressable>
  );
}

function SuggestionItem({
  suggestion,
  onSelect,
}: {
  suggestion: Suggestion;
  onSelect: (s: Suggestion) => void;
}) {
  const handlePress = () => onSelect(suggestion);

  switch (suggestion.type) {
    case "person": {
      return <PersonRow data={suggestion.data} onPress={handlePress} />;
    }
    case "filter": {
      return <FilterRow data={suggestion.data} onPress={handlePress} />;
    }
    case "emoji": {
      return <EmojiRow data={suggestion.data} onPress={handlePress} />;
    }
    case "command": {
      return <CommandRow data={suggestion.data} onPress={handlePress} />;
    }
    default: {
      return null;
    }
  }
}

export const SuggestionPopup = memo(function SuggestionPopup({
  suggestions,
  onSelect,
}: {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      exiting={FadeOut.duration(80)}
      className="bg-background/80 border border-border/40"
      style={{
        borderCurve: "continuous",
        borderRadius: 20,
        marginHorizontal: 4,
        overflow: "hidden",
      }}
    >
      {suggestions.map((s) => (
        <SuggestionItem
          key={`${s.type}-${(s as { data: { id?: string } }).data.id ?? s.label ?? s.type}`}
          suggestion={s}
          onSelect={onSelect}
        />
      ))}
    </Animated.View>
  );
});
