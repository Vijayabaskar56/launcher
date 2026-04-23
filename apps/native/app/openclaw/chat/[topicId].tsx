import { Stack, useLocalSearchParams } from "expo-router";

import { ChatScreen } from "@/components/openclaw/chat-screen";
import { useOpenClaw } from "@/context/openclaw";

const OpenClawChatRoute = () => {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { topics } = useOpenClaw();

  const topic = topics.find((entry) => entry.id === topicId);

  if (!topicId) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: topic?.label ?? "Topic Chat" }} />
      <ChatScreen key={topicId} topicId={topicId} />
    </>
  );
};

export default OpenClawChatRoute;
