import { MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Alert, Pressable } from "react-native";

const handleAddPress = () =>
  Alert.alert(
    "Coming Soon",
    "Custom themes will be available in a future update."
  );

const getAddButtonStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.5 : 1,
});

const AddButton = () => (
  <Pressable onPress={handleAddPress} hitSlop={8} style={getAddButtonStyle}>
    <MaterialIcons name="add" size={24} color="#ffffff" />
  </Pressable>
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
