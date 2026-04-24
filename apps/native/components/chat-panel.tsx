import { useRouter } from "expo-router";
import { Button, useThemeColor } from "heroui-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { openClawGateway } from "react-native-openclaw-gateway";
import Animated, { useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatMessageList } from "@/components/openclaw/chat-message-list";
import { useSearchBar } from "@/components/search-bar";
import { useOpenClaw } from "@/context/openclaw";
import { useDirectionalDismiss } from "@/hooks/use-directional-dismiss";
import { useDirectionalPanel } from "@/hooks/use-directional-panel";
import type { SlideFrom } from "@/hooks/use-directional-panel";
import {
  buildOpenClawSendParams,
  parseOpenClawChatHistory,
} from "@/lib/openclaw/chat";

interface ChatPanelProps {
  boundary?: {
    isAtBottom: SharedValue<boolean>;
    isAtTop: SharedValue<boolean>;
  };
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
}

const CHAT_PLACEHOLDER = "Message Claude";

const useChatPanelLogic = (isActive: boolean) => {
  const {
    activeTopicId,
    actions,
    connectionStatus,
    resolveTopicSessionKey,
    topics,
  } = useOpenClaw();

  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<
    ReturnType<typeof parseOpenClawChatHistory>["messages"]
  >([]);

  const topic = useMemo(
    () => topics.find((entry) => entry.id === activeTopicId) ?? topics[0],
    [activeTopicId, topics]
  );
  const topicId = topic?.id ?? null;
  const sessionKey = useMemo(
    () => (topicId ? resolveTopicSessionKey(topicId) : null),
    [resolveTopicSessionKey, topicId]
  );

  const loadHistory = useCallback(async () => {
    if (!sessionKey) {
      setErrorText("Unable to resolve topic session.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await openClawGateway.request(
        "chat.history",
        JSON.stringify({ limit: 100, sessionKey }),
        15_000
      );
      const history = parseOpenClawChatHistory(response, sessionKey);
      setMessages(history.messages);
      setErrorText(null);
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Failed to load conversation."
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionKey]);

  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      const trimmed = message.trim();
      if (!trimmed || !sessionKey || !topicId) {
        return false;
      }
      setIsSending(true);
      try {
        await openClawGateway.request(
          "chat.send",
          await buildOpenClawSendParams(sessionKey, trimmed),
          30_000
        );
        actions.setActiveTopic(topicId);
        await loadHistory();
        setErrorText(null);
        return true;
      } catch (error) {
        setErrorText(
          error instanceof Error ? error.message : "Failed to send message."
        );
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [actions, loadHistory, sessionKey, topicId]
  );

  useEffect(() => {
    if (!isActive || connectionStatus !== "connected") {
      return;
    }
    loadHistory();
  }, [isActive, connectionStatus, loadHistory]);

  return {
    connectionStatus,
    errorText,
    isLoading,
    isSending,
    messages,
    sendMessage,
    sessionKey,
    topic,
  };
};

export const ChatPanel = ({ boundary, offset, slideFrom }: ChatPanelProps) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const search = useSearchBar();
  const localIsAtTop = useSharedValue(true);
  const localIsAtBottom = useSharedValue(true);
  const panelIsAtTop = boundary?.isAtTop ?? localIsAtTop;
  const panelIsAtBottom = boundary?.isAtBottom ?? localIsAtBottom;

  const { animatedStyle, isOpen } = useDirectionalPanel({
    offset,
    screenHeight,
    screenWidth,
    slideFrom,
  });

  const {
    connectionStatus,
    errorText,
    isLoading,
    isSending,
    messages,
    sendMessage,
    topic,
  } = useChatPanelLogic(isOpen);

  const panGesture = useDirectionalDismiss({
    isAtBottom: panelIsAtBottom,
    isAtTop: panelIsAtTop,
    offset,
    screenHeight,
    screenWidth,
    slideFrom,
  });

  const searchActions = search?.actions;
  const searchText = search?.state.searchText ?? "";

  // Swap placeholder while panel is open
  useEffect(() => {
    if (!searchActions) {
      return;
    }
    if (isOpen) {
      searchActions.setPlaceholder(CHAT_PLACEHOLDER);
    } else {
      searchActions.setPlaceholder(null);
    }
  }, [isOpen, searchActions]);

  // Intercept submit while panel is open
  useEffect(() => {
    if (!isOpen || !search?.submitRef) {
      return;
    }
    const submitRef = search.submitRef;
    const previous = submitRef.current;
    submitRef.current = async () => {
      const text = searchText.trim();
      if (!text) {
        return;
      }
      const ok = await sendMessage(text);
      if (ok) {
        searchActions?.setSearchText("");
        search.meta.enrichedRef.current?.setValue("");
      }
    };
    return () => {
      submitRef.current = previous;
    };
  }, [isOpen, search, searchText, sendMessage, searchActions]);

  const router = useRouter();
  const handleOpenSettings = useCallback(() => {
    router.push("/settings/openclaw" as never);
  }, [router]);

  const contentPaddingTop = insets.top + 16;
  const contentPaddingBottom = insets.bottom + 120;

  const topicLabel = topic?.label ?? "Chat";
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");

  const body = (() => {
    if (!topic) {
      return (
        <View
          style={{
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text style={{ color: muted, fontSize: 14, textAlign: "center" }}>
            No chat topic configured.
          </Text>
        </View>
      );
    }
    if (connectionStatus !== "connected") {
      return (
        <View
          style={{
            flex: 1,
            gap: 12,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              color: foreground,
              fontSize: 20,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            OpenClaw connection required
          </Text>
          <Text
            style={{
              color: muted,
              fontSize: 14,
              lineHeight: 20,
              textAlign: "center",
            }}
          >
            Connect to the gateway before chatting with {topic.label}.
          </Text>
          <Button onPress={handleOpenSettings} variant="primary">
            <Button.Label>Open Connection Settings</Button.Label>
          </Button>
        </View>
      );
    }
    return (
      <ChatMessageList
        errorText={errorText}
        isLoading={isLoading || isSending}
        messages={messages}
        topicLabel={topicLabel}
      />
    );
  })();

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="absolute bottom-0 left-0 right-0 top-0 bg-background/80"
        style={[animatedStyle]}
      >
        <View
          style={{
            flex: 1,
            paddingBottom: contentPaddingBottom,
            paddingTop: contentPaddingTop,
          }}
        >
          {body}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};
