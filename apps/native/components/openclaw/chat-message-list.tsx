import { useCallback, useMemo, useRef } from "react";
import { ScrollView, Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";
import { extractOpenClawMessageText } from "@/lib/openclaw/chat";
import type { OpenClawChatMessage } from "@/types/openclaw";

interface ChatMessageListProps {
  errorText?: string | null;
  isLoading?: boolean;
  messages: OpenClawChatMessage[];
  topicLabel: string;
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

export const ChatMessageList = ({
  errorText,
  isLoading = false,
  messages,
  topicLabel,
}: ChatMessageListProps) => {
  const { cardRadius, fontFamily } = useThemeOverrides();
  const scrollRef = useRef<ScrollView>(null);

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: extractOpenClawMessageText(message),
        timestamp: formatTimestamp(message.timestampMs),
      })),
    [messages]
  );

  const handleContentSizeChange = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text
          selectable
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          Loading conversation…
        </Text>
      </View>
    );
  }

  if (renderedMessages.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.08)",
            borderCurve: "continuous",
            borderRadius: cardRadius,
            borderWidth: 1,
            gap: 8,
            paddingHorizontal: 18,
            paddingVertical: 18,
          }}
        >
          <Text
            selectable
            style={{
              color: "#ffffff",
              fontFamily,
              fontSize: 18,
              fontWeight: "700",
              letterSpacing: -0.2,
            }}
          >
            {topicLabel}
          </Text>
          <Text
            selectable
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            No messages yet. Send the first prompt to start this topic.
          </Text>
          {errorText ? (
            <Text
              selectable
              style={{
                color: "rgba(255,255,255,0.62)",
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {errorText}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{
        gap: 14,
        paddingBottom: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
      }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={handleContentSizeChange}
    >
      {renderedMessages.map((message) => {
        const isUser = message.role === "user";

        return (
          <View
            key={message.id}
            style={{
              alignItems: isUser ? "flex-end" : "flex-start",
            }}
          >
            <View
              style={{
                backgroundColor: isUser
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(255,255,255,0.07)",
                borderColor: "rgba(255,255,255,0.08)",
                borderCurve: "continuous",
                borderRadius: cardRadius,
                borderWidth: 1,
                gap: 6,
                maxWidth: "88%",
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text
                selectable
                style={{
                  color: "#ffffff",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {message.text || "(non-text message)"}
              </Text>
              {message.timestamp ? (
                <Text
                  selectable
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 11,
                  }}
                >
                  {message.timestamp}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}

      {errorText ? (
        <Text
          selectable
          style={{
            color: "rgba(255,255,255,0.62)",
            fontSize: 12,
            lineHeight: 18,
            textAlign: "center",
          }}
        >
          {errorText}
        </Text>
      ) : null}
    </ScrollView>
  );
};
