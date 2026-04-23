import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";

const OpenClawLayout = () => {
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerShown: true,
        headerStyle: { backgroundColor: background },
        headerTintColor: foreground,
        headerTitleStyle: {
          color: foreground,
          fontSize: 17,
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen name="chat/[topicId]" options={{ title: "Topic Chat" }} />
    </Stack>
  );
};

export default OpenClawLayout;
