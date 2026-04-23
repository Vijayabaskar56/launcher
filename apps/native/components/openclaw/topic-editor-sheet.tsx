import { MaterialIcons } from "@expo/vector-icons";
import {
  Button,
  Dialog,
  Input,
  Label,
  TextField,
  useThemeColor,
} from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { useOpenClaw } from "@/context/openclaw";
import { useThemeOverrides } from "@/context/theme-overrides";

interface TopicEditorSheetProps {
  onClose: () => void;
  visible: boolean;
}

const getTopicSubtitle = ({
  agentId,
  isBuiltIn,
}: {
  agentId?: string;
  isBuiltIn?: boolean;
}): string => {
  if (agentId) {
    return `Bound to ${agentId}`;
  }

  if (isBuiltIn) {
    return "Built-in general chat";
  }

  return "Launcher-managed local topic";
};

const AgentChip = ({
  active,
  handlePress,
  label,
}: {
  active: boolean;
  handlePress: () => void;
  label: string;
}) => (
  <Button onPress={handlePress} variant={active ? "primary" : "secondary"}>
    <Button.Label>{label}</Button.Label>
  </Button>
);

const TopicRow = ({
  border,
  cardRadius,
  fontFamily,
  foreground,
  handleDelete,
  label,
  muted,
  showDelete,
  surface,
  subtitle,
}: {
  border: string;
  cardRadius: number;
  fontFamily?: string;
  foreground: string;
  handleDelete?: () => void;
  label: string;
  muted: string;
  showDelete: boolean;
  surface: string;
  subtitle: string;
}) => (
  <View
    style={{
      alignItems: "center",
      backgroundColor: surface,
      borderColor: border,
      borderCurve: "continuous",
      borderRadius: cardRadius,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    }}
  >
    <View style={{ flex: 1, gap: 2 }}>
      <Text
        selectable
        style={{
          color: foreground,
          fontFamily,
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: muted,
          fontSize: 12,
          lineHeight: 17,
        }}
      >
        {subtitle}
      </Text>
    </View>
    {showDelete && handleDelete ? (
      <Button onPress={handleDelete} size="sm" variant="danger-soft">
        <MaterialIcons name="delete-outline" size={16} />
        <Button.Label>Delete</Button.Label>
      </Button>
    ) : null}
  </View>
);

export const TopicEditorSheet = ({
  onClose,
  visible,
}: TopicEditorSheetProps) => {
  const { actions, agents, connectionStatus, topics } = useOpenClaw();
  const [border, foreground, muted, surface] = useThemeColor([
    "border",
    "foreground",
    "muted",
    "surface",
  ] as const);
  const { cardRadius, fontFamily, smallRadius } = useThemeOverrides();

  const [draftLabel, setDraftLabel] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();

  const canBindAgent = connectionStatus === "connected" && agents.length > 0;

  const handleClose = useCallback(() => {
    setDraftLabel("");
    setEditorError(null);
    setSelectedAgentId(undefined);
    onClose();
  }, [onClose]);

  const handleCreateTopic = useCallback(async () => {
    if (!draftLabel.trim()) {
      return;
    }

    try {
      await actions.createTopic({
        agentId: selectedAgentId,
        label: draftLabel,
      });
      setDraftLabel("");
      setEditorError(null);
      setSelectedAgentId(undefined);
    } catch (error) {
      setEditorError(
        error instanceof Error ? error.message : "Failed to create topic."
      );
    }
  }, [actions, draftLabel, selectedAgentId]);

  const handleSelectNoAgent = useCallback(() => {
    setSelectedAgentId(undefined);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose();
      }
    },
    [handleClose]
  );

  const agentHandlers = useMemo(
    () =>
      Object.fromEntries(
        agents.map((agent) => [
          agent.id,
          () => {
            setSelectedAgentId(agent.id);
          },
        ])
      ) as Record<string, () => void>,
    [agents]
  );

  const deleteTopicHandlers = useMemo(
    () =>
      Object.fromEntries(
        topics
          .filter((topic) => !topic.isBuiltIn)
          .map((topic) => [
            topic.id,
            () => {
              actions.deleteTopic(topic.id);
            },
          ])
      ) as Record<string, () => void>,
    [actions, topics]
  );

  if (!visible) {
    return null;
  }

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal disableFullWindowOverlay>
        <Dialog.Overlay />
        <Dialog.Content
          style={{
            backgroundColor: surface,
            borderCurve: "continuous",
            borderRadius: 24,
            maxHeight: "80%",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <Dialog.Close variant="ghost" />
          <View style={{ gap: 4, paddingHorizontal: 24, paddingTop: 24 }}>
            <Dialog.Title
              style={{
                color: foreground,
                fontFamily,
                fontSize: 20,
                fontWeight: "700",
                letterSpacing: -0.3,
              }}
            >
              Edit Topics
            </Dialog.Title>
            <Dialog.Description
              style={{
                color: muted,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              Create local topics, pin one as active, and optionally bind new
              topics to an available agent.
            </Dialog.Description>
          </View>

          <ScrollView
            contentContainerStyle={{
              gap: 18,
              paddingBottom: 24,
              paddingHorizontal: 16,
              paddingTop: 18,
            }}
          >
            <View style={{ gap: 12 }}>
              <Text
                selectable
                style={{
                  color: foreground,
                  fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                New Topic
              </Text>
              <TextField>
                <View style={{ gap: 8 }}>
                  <Label>Label</Label>
                  <Input
                    onChangeText={setDraftLabel}
                    placeholder="topic name"
                    placeholderTextColor={muted}
                    style={{
                      backgroundColor: surface,
                      borderColor: border,
                      borderCurve: "continuous",
                      borderRadius: smallRadius,
                      borderWidth: 1,
                      color: foreground,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                    value={draftLabel}
                  />
                </View>
              </TextField>

              <View style={{ gap: 8 }}>
                <Text
                  selectable
                  style={{
                    color: foreground,
                    fontFamily,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Agent Binding
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  <AgentChip
                    active={!selectedAgentId}
                    handlePress={handleSelectNoAgent}
                    label="None"
                  />
                  {agents.map((agent) => (
                    <AgentChip
                      active={selectedAgentId === agent.id}
                      handlePress={agentHandlers[agent.id]}
                      key={agent.id}
                      label={
                        agent.emoji
                          ? `${agent.emoji} ${agent.name ?? agent.id}`
                          : (agent.name ?? agent.id)
                      }
                    />
                  ))}
                </View>
                <Text
                  selectable
                  style={{
                    color: muted,
                    fontSize: 12,
                    lineHeight: 17,
                  }}
                >
                  {canBindAgent
                    ? "Agent-bound topics stay fixed to that agent in v1."
                    : "Connect to OpenClaw first if you want to bind a topic to an agent."}
                </Text>
              </View>

              {editorError ? (
                <View
                  style={{
                    backgroundColor: surface,
                    borderColor: border,
                    borderCurve: "continuous",
                    borderRadius: cardRadius,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    selectable
                    style={{
                      color: muted,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    {editorError}
                  </Text>
                </View>
              ) : null}

              <Button
                isDisabled={draftLabel.trim().length === 0}
                onPress={handleCreateTopic}
                variant="primary"
              >
                <MaterialIcons name="add" size={18} color="#ffffff" />
                <Button.Label>Create Topic</Button.Label>
              </Button>
            </View>

            <View style={{ gap: 12 }}>
              <Text
                selectable
                style={{
                  color: foreground,
                  fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Existing Topics
              </Text>
              <View style={{ gap: 10 }}>
                {topics.map((topic) => (
                  <TopicRow
                    border={border}
                    cardRadius={cardRadius}
                    fontFamily={fontFamily}
                    foreground={foreground}
                    handleDelete={deleteTopicHandlers[topic.id]}
                    key={topic.id}
                    label={topic.label}
                    muted={muted}
                    showDelete={!topic.isBuiltIn}
                    subtitle={getTopicSubtitle(topic)}
                    surface={surface}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
