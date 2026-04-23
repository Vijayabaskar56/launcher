import { MaterialIcons } from "@expo/vector-icons";
import { Button, useThemeColor } from "heroui-native";
import { ScrollView, Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

const noop = () => {
  // placeholder
};

export default function PluginsSettings() {
  const surface = useThemeColor("surface");
  const defaultColor = useThemeColor("default");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const { cardRadius } = useThemeOverrides();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
    >
      <View style={{ gap: 20, padding: 16 }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: surface,
            borderCurve: "continuous",
            borderRadius: cardRadius,
            gap: 12,
            justifyContent: "center",
            paddingVertical: 48,
          }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: defaultColor,
              borderCurve: "continuous",
              borderRadius: cardRadius,
              height: 56,
              justifyContent: "center",
              width: 56,
            }}
          >
            <MaterialIcons name="power" size={28} color={muted} />
          </View>
          <Text
            style={{
              color: foreground,
              fontSize: 16,
              fontWeight: "500",
              letterSpacing: -0.2,
              textAlign: "center",
            }}
          >
            No plugins installed
          </Text>
          <Text
            style={{
              color: muted,
              fontSize: 13,
              letterSpacing: -0.1,
              lineHeight: 18,
              paddingHorizontal: 32,
              textAlign: "center",
            }}
          >
            Plugins extend launcher functionality with additional features.
          </Text>
        </View>
        <Button variant="secondary" onPress={noop}>
          <MaterialIcons name="add" size={20} color={foreground} />
          <Button.Label>Add Plugin (coming soon)</Button.Label>
        </Button>
      </View>
    </ScrollView>
  );
}
