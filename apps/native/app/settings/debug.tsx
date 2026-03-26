import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { use, useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SelectPreference } from "@/components/settings/select-preference";
import { SettingsContext } from "@/context/settings";
import { useThemeOverrides } from "@/context/theme-overrides";
import type { LogLevel } from "@/types/settings";

interface DebugActionProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
}

const DebugAction = ({ icon, title, description }: DebugActionProps) => {
  const defaultColor = useThemeColor("default");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const { smallRadius } = useThemeOverrides();

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      alignItems: "center" as const,
      backgroundColor: pressed ? "rgba(255, 255, 255, 0.04)" : "transparent",
      flexDirection: "row" as const,
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
    }),
    []
  );

  return (
    <Pressable style={getStyle}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: defaultColor,
          borderCurve: "continuous",
          borderRadius: smallRadius,
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <MaterialIcons name={icon} size={20} color={foreground} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: foreground,
            fontSize: 16,
            fontWeight: "500",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: muted,
            fontSize: 13,
            letterSpacing: -0.1,
            lineHeight: 18,
          }}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
};

const DebugSettings = () => {
  const settings = use(SettingsContext);

  const handleLogLevelChange = useCallback(
    (v: LogLevel) => {
      settings?.actions.updateDebug({ logLevel: v });
    },
    [settings]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const { debug } = state;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory title="Logging">
        <SelectPreference
          icon="bug-report"
          title="Log Level"
          value={debug.logLevel}
          options={[
            { label: "Verbose", value: "verbose" as LogLevel },
            { label: "Debug", value: "debug" as LogLevel },
            { label: "Info", value: "info" as LogLevel },
            { label: "Warn", value: "warn" as LogLevel },
            { label: "Error", value: "error" as LogLevel },
          ]}
          onValueChange={handleLogLevelChange}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Actions">
        <DebugAction
          icon="delete-outline"
          title="Clear Cache"
          description="Clear app cache and temporary data (coming soon)"
        />
        <DebugAction
          icon="notifications-active"
          title="Test Notifications"
          description="Send a test notification (coming soon)"
        />
      </PreferenceCategory>
    </ScrollView>
  );
};

export default DebugSettings;
