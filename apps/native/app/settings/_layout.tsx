import { MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Pressable } from "react-native";

const HeaderRightButton = ({
  icon,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) => {
  const foreground = useThemeColor("foreground");

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      opacity: pressed ? 0.5 : 1,
    }),
    []
  );

  return (
    <Pressable onPress={onPress} hitSlop={8} style={getStyle}>
      <MaterialIcons name={icon} size={24} color={foreground} />
    </Pressable>
  );
};

const noop = () => {
  // placeholder
};

const AddHeaderRight = () => <HeaderRightButton icon="add" onPress={noop} />;

const renderAddHeaderRight = () => <AddHeaderRight />;

const SettingsLayout = () => {
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        headerBackButtonDisplayMode: "minimal",
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerShown: true,
        headerStyle: { backgroundColor: background },
        headerTintColor: foreground,
        headerTitleAlign: "center",
        headerTitleStyle: {
          color: foreground,
          fontSize: 17,
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen
        name="appearance"
        options={{
          headerRight: renderAddHeaderRight,
          title: "Appearance",
        }}
      />
      <Stack.Screen name="homescreen" options={{ title: "Homescreen" }} />
      <Stack.Screen name="icons" options={{ title: "Icons" }} />
      <Stack.Screen name="search" options={{ title: "Search" }} />
      <Stack.Screen name="gestures" options={{ title: "Gestures" }} />
      <Stack.Screen
        name="integrations"
        options={{
          headerRight: renderAddHeaderRight,
          title: "Integrations",
        }}
      />
      <Stack.Screen
        name="plugins"
        options={{
          headerRight: renderAddHeaderRight,
          title: "Plugins",
        }}
      />
      <Stack.Screen name="locale" options={{ title: "Locale" }} />
      <Stack.Screen name="backup" options={{ title: "Backup" }} />
      <Stack.Screen name="debug" options={{ title: "Debug" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
      <Stack.Screen name="color-scheme" options={{ headerShown: false }} />
    </Stack>
  );
};

export default SettingsLayout;
