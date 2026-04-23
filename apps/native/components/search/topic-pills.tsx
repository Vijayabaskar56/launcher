import { useThemeColor } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { TopicEditorSheet } from "@/components/openclaw/topic-editor-sheet";
import { useOpenClaw } from "@/context/openclaw";

import { Icon, ICON_MAP } from "../ui/icon";
import { IconButton } from "../ui/icon-button";

const Pill = ({
  topic,
  isSelected,
  onPress,
}: {
  topic: { id: string; label: string };
  isSelected: boolean;
  onPress: (id: string) => void;
}) => {
  const accent = useThemeColor("accent");
  const handlePress = useCallback(() => {
    onPress(topic.id);
  }, [onPress, topic.id]);

  return (
    <Pressable
      onPress={handlePress}
      style={[
        {
          alignItems: "center",
          borderColor: isSelected
            ? (accent as string)
            : "rgba(255,255,255,0.2)",
          borderCurve: "continuous",
          borderRadius: 20,
          borderWidth: 1.5,
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 8,
        },
        isSelected && {
          backgroundColor: "rgba(255,255,255,0.08)",
        },
      ]}
    >
      <Text
        style={{
          color: isSelected ? "#fff" : "rgba(255,255,255,0.7)",
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {topic.label}
      </Text>
    </Pressable>
  );
};

export const TopicPills = () => {
  const { actions, activeTopicId, topics } = useOpenClaw();
  const [editorOpen, setEditorOpen] = useState(false);

  const handleSelect = useCallback(
    (id: string) => {
      actions.setActiveTopic(id);
    },
    [actions]
  );

  const handleOpenEditor = useCallback(() => {
    setEditorOpen(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const visibleTopics = useMemo(
    () => topics.map((topic) => ({ id: topic.id, label: topic.label })),
    [topics]
  );

  return (
    <View className="flex-row items-center">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: "center",
          gap: 8,
          paddingRight: 4,
        }}
      >
        {visibleTopics.map((topic) => (
          <Pill
            key={topic.id}
            topic={topic}
            isSelected={activeTopicId === topic.id}
            onPress={handleSelect}
          />
        ))}
      </ScrollView>
      <IconButton accessibilityLabel="Edit topics" onPress={handleOpenEditor}>
        <Icon name={ICON_MAP.edit} size={16} />
      </IconButton>
      <TopicEditorSheet onClose={handleCloseEditor} visible={editorOpen} />
    </View>
  );
};
