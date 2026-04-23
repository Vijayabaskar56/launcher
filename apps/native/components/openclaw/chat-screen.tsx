import { useRouter } from "expo-router";
import { Button } from "heroui-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { openClawGateway } from "react-native-openclaw-gateway";

import { ChatComposer } from "@/components/openclaw/chat-composer";
import { ChatMessageList } from "@/components/openclaw/chat-message-list";
import { useOpenClaw } from "@/context/openclaw";
import {
  buildOpenClawSendParams,
  parseOpenClawChatHistory,
} from "@/lib/openclaw/chat";

interface ChatScreenProps {
  topicId: string;
}

function useChatScreenLogic(topicId: string) {
  const router = useRouter();
  const {
    activeTopicId,
    actions,
    connectionStatus,
    pendingResumeIntent,
    resolveTopicSessionKey,
    topics,
  } = useOpenClaw();
  const [composerText, setComposerText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<
    ReturnType<typeof parseOpenClawChatHistory>["messages"]
  >([]);
  const hasAutoSentResume = useRef(false);

  const topic = useMemo(
    () => topics.find((entry) => entry.id === topicId),
    [topicId, topics]
  );
  const sessionKey = useMemo(
    () => resolveTopicSessionKey(topicId),
    [resolveTopicSessionKey, topicId]
  );

  const loadHistory = useCallback(async () => {
    if (!sessionKey) {
      setIsLoading(false);
      setErrorText("Unable to resolve this topic session.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await openClawGateway.request(
        "chat.history",
        JSON.stringify({
          limit: 100,
          sessionKey,
        }),
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
      const trimmedMessage = message.trim();
      if (!trimmedMessage || !sessionKey) {
        return false;
      }

      setIsSending(true);
      try {
        await openClawGateway.request(
          "chat.send",
          await buildOpenClawSendParams(sessionKey, trimmedMessage),
          30_000
        );
        setComposerText("");
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
    if (!topic) {
      setIsLoading(false);
      setErrorText("This topic no longer exists.");
      return;
    }

    if (activeTopicId !== topic.id) {
      actions.setActiveTopic(topic.id);
    }
  }, [actions, activeTopicId, topic]);

  useEffect(() => {
    if (connectionStatus !== "connected") {
      setIsLoading(false);
      return;
    }

    loadHistory();
  }, [connectionStatus, loadHistory]);

  useEffect(() => {
    if (
      !pendingResumeIntent ||
      pendingResumeIntent.topicId !== topicId ||
      connectionStatus !== "connected" ||
      hasAutoSentResume.current
    ) {
      return;
    }

    hasAutoSentResume.current = true;

    const autoSend = async () => {
      const accepted = await sendMessage(pendingResumeIntent.message);
      if (accepted) {
        actions.clearPendingResume();
      } else {
        hasAutoSentResume.current = false;
      }
    };

    autoSend();
  }, [actions, connectionStatus, pendingResumeIntent, sendMessage, topicId]);

  return {
    composerText,
    connectionStatus,
    errorText,
    handleOpenSettings: useCallback(() => {
      router.push("/settings/openclaw" as never);
    }, [router]),
    isLoading,
    isSending,
    messages,
    sendMessage,
    sessionKey,
    setComposerText,
    setErrorText,
    setIsLoading,
    setIsSending,
    setMessages,
    topic,
  };
}

export const ChatScreen = ({ topicId }: ChatScreenProps) => {
  const {
    composerText,
    connectionStatus,
    errorText,
    handleOpenSettings,
    isSending,
    isLoading,
    messages,
    sendMessage,
    sessionKey,
    setComposerText,
    topic,
  } = useChatScreenLogic(topicId);

  const handleSubmitComposer = useCallback(async () => {
    await sendMessage(composerText);
  }, [composerText, sendMessage]);

  if (!topic) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          selectable
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 14,
            lineHeight: 20,
            textAlign: "center",
          }}
        >
          This topic could not be found.
        </Text>
      </View>
    );
  }

  if (connectionStatus !== "connected") {
    return (
      <View
        style={{
          flex: 1,
          gap: 14,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          selectable
          style={{
            color: "#ffffff",
            fontSize: 20,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          OpenClaw connection required
        </Text>
        <Text
          selectable
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 14,
            lineHeight: 20,
            textAlign: "center",
          }}
        >
          Connect to the gateway before using {topic.label}.
        </Text>
        <Button onPress={handleOpenSettings} variant="primary">
          <Button.Label>Open Connection Settings</Button.Label>
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <ChatMessageList
          errorText={errorText}
          isLoading={isLoading}
          messages={messages}
          topicLabel={topic.label}
        />
        <ChatComposer
          disabled={isLoading || !sessionKey}
          onChangeText={setComposerText}
          onSubmit={handleSubmitComposer}
          sending={isSending}
          value={composerText}
        />
      </View>
    </KeyboardAvoidingView>
  );
};
