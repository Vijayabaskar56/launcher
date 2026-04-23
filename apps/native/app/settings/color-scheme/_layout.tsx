import { MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Button, useThemeColor } from "heroui-native";

import { toast } from "@/lib/toast";

const handleAddPress = () =>
  toast.info("Coming Soon", {
    description: "Custom themes will be available in a future update.",
  });

const AddButton = () => (
  <Button variant="ghost" isIconOnly size="sm" onPress={handleAddPress}>
    <MaterialIcons name="add" size={24} color="#ffffff" />
  </Button>
);

const renderAddButton = () => <AddButton />;

const ColorSchemeLayout = () => {
  const bg = useThemeColor("background");
  const fg = useThemeColor("foreground");

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: bg },
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerShown: true,
        headerStyle: { backgroundColor: bg },
        headerTintColor: fg,
        headerTitleAlign: "center",
        headerTitleStyle: {
          color: fg,
          fontSize: 17,
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerRight: renderAddButton,
          title: "Color Scheme",
        }}
      />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
};

export default ColorSchemeLayout;
