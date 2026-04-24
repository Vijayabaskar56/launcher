import { LegendList } from "@legendapp/list";
import { Card, useThemeColor } from "heroui-native";
import { memo, useCallback, useMemo, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { MarkdownMessage } from "@/components/openclaw/markdown-message";
import { useThemeOverrides } from "@/context/theme-overrides";
import { extractOpenClawMessageText } from "@/lib/openclaw/chat";
import type { OpenClawChatMessage } from "@/types/openclaw";

interface ChatMessageListProps {
  errorText?: string | null;
  isLoading?: boolean;
  messages: OpenClawChatMessage[];
  topicLabel: string;
}

interface RenderedMessage {
  id: string;
  role: OpenClawChatMessage["role"];
  text: string;
  timestamp: string | null;
}

const formatTimestamp = (timestampMs?: number): string | null => {
  if (!timestampMs) {
    return null;
  }

  return new Date(timestampMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const MessageBubble = memo(
  ({
    message,
    accent,
    accentForeground,
    border,
    foreground,
    muted,
    surface,
  }: {
    message: RenderedMessage;
    accent: string;
    accentForeground: string;
    border: string;
    foreground: string;
    muted: string;
    surface: string;
  }) => {
    const isUser = message.role === "user";
    const bubbleColor = isUser ? accent : surface;
    const textColor = isUser ? accentForeground : foreground;
    const timestampColor = isUser ? `${accentForeground}B3` : muted;

    return (
      <View
        style={{
          alignItems: isUser ? "flex-end" : "flex-start",
          paddingVertical: 6,
        }}
      >
        <View
          style={{
            backgroundColor: bubbleColor,
            borderBottomLeftRadius: isUser ? 20 : 6,
            borderBottomRightRadius: isUser ? 6 : 20,
            borderColor: isUser ? "transparent" : border,
            borderCurve: "continuous",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderWidth: isUser ? 0 : 1,
            gap: 4,
            maxWidth: "86%",
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <MarkdownMessage
            text={message.text || "(non-text message)"}
            color={textColor}
            linkColor={isUser ? accentForeground : accent}
            mutedColor={muted}
          />
          {message.timestamp ? (
            <Text
              selectable
              style={{
                color: timestampColor,
                fontSize: 10,
                letterSpacing: 0.2,
                marginTop: 2,
              }}
            >
              {message.timestamp}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }
);
MessageBubble.displayName = "MessageBubble";

export const ChatMessageList = ({
  errorText,
  isLoading = false,
  messages,
  topicLabel,
}: ChatMessageListProps) => {
  const { fontFamily } = useThemeOverrides();
  const [accent, accentForeground, border, foreground, muted, surface] =
    useThemeColor([
      "accent",
      "accent-foreground",
      "border",
      "foreground",
      "muted",
      "surface",
    ] as const);
  const listRef = useRef<React.ComponentRef<typeof LegendList>>(null);

  const renderedMessages = useMemo<RenderedMessage[]>(
    () =>
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: extractOpenClawMessageText(message),
        timestamp: formatTimestamp(message.timestampMs),
      })),
    [messages]
  );

  const keyExtractor = useCallback((item: RenderedMessage) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: RenderedMessage }) => (
      <MessageBubble
        message={item}
        accent={accent}
        accentForeground={accentForeground}
        border={border}
        foreground={foreground}
        muted={muted}
        surface={surface}
      />
    ),
    [accent, accentForeground, border, foreground, muted, surface]
  );

  if (isLoading && renderedMessages.length === 0) {
    return (
      <View
        style={{
          alignItems: "center",
          flex: 1,
          gap: 10,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <ActivityIndicator color={accent} />
        <Text
          style={{ color: muted, fontFamily, fontSize: 13, letterSpacing: 0.2 }}
        >
          Loading conversation…
        </Text>
      </View>
    );
  }

  if (renderedMessages.length === 0) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
      >
        <Card
          variant="transparent"
          className="bg-surface/70 rounded-3xl p-5 gap-2"
        >
          <Text
            selectable
            style={{
              color: foreground,
              fontFamily,
              fontSize: 20,
              fontWeight: "700",
              letterSpacing: -0.3,
            }}
          >
            {topicLabel}
          </Text>
          <Text
            selectable
            style={{ color: muted, fontSize: 14, lineHeight: 20 }}
          >
            No messages yet. Send the first prompt to start this topic.
          </Text>
          {errorText ? (
            <Text
              selectable
              style={{
                color: muted,
                fontSize: 12,
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              {errorText}
            </Text>
          ) : null}
        </Card>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LegendList
        ref={listRef}
        data={renderedMessages}
        estimatedItemSize={120}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: 16,
          paddingHorizontal: 16,
          paddingTop: 16,
        }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition
        alignItemsAtEnd
      />
      {errorText ? (
        <View style={{ alignItems: "center", paddingBottom: 6 }}>
          <Text
            selectable
            style={{
              color: muted,
              fontSize: 12,
              lineHeight: 18,
              textAlign: "center",
            }}
          >
            {errorText}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
