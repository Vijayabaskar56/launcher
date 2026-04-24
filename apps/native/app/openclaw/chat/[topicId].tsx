import { Stack, useLocalSearchParams } from "expo-router";

import { ChatScreen } from "@/components/openclaw/chat-screen";

const OpenClawChatRoute = () => {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();

  if (!topicId) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatScreen key={topicId} topicId={topicId} />
    </>
  );
};

export default OpenClawChatRoute;
