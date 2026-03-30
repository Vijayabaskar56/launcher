import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

interface SettingsItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  title: string;
  summary: string;
  onPress: () => void;
  isLast?: boolean;
}

const SettingsItem = ({
  icon,
  iconBg,
  title,
  summary,
  onPress,
  isLast = false,
}: SettingsItemProps) => {
  const { smallRadius } = useThemeOverrides();
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const border = useThemeColor("border");

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
    <Pressable onPress={onPress} style={getStyle}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: iconBg,
          borderCurve: "continuous",
          borderRadius: smallRadius,
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <MaterialIcons name={icon} size={20} color="#ffffff" />
      </View>
      <View
        style={{
          alignItems: "center",
          borderBottomColor: isLast ? "transparent" : border,
          borderBottomWidth: isLast ? 0 : 0.5,
          flex: 1,
          flexDirection: "row",
          paddingBottom: isLast ? 0 : 13,
          paddingRight: 4,
        }}
      >
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
            }}
          >
            {summary}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={muted} />
      </View>
    </Pressable>
  );
};

interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
}

const SettingsGroup = ({ title, children }: SettingsGroupProps) => {
  const { cardRadius, transparency } = useThemeOverrides();
  const muted = useThemeColor("muted");
  const surface = useThemeColor("surface");

  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Text
          style={{
            color: muted,
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1,
            paddingHorizontal: 20,
            textTransform: "uppercase",
          }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: surface,
          borderCurve: "continuous",
          borderRadius: cardRadius,
          marginHorizontal: 16,
          opacity: transparency,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
};

const SettingsIndex = () => {
  const router = useRouter();

  const handleAppearance = useCallback(() => {
    router.push("/settings/appearance" as never);
  }, [router]);

  const handleHomescreen = useCallback(() => {
    router.push("/settings/homescreen" as never);
  }, [router]);

  const handleIcons = useCallback(() => {
    router.push("/settings/icons" as never);
  }, [router]);

  const handleSearch = useCallback(() => {
    router.push("/settings/search" as never);
  }, [router]);

  const handleGestures = useCallback(() => {
    router.push("/settings/gestures" as never);
  }, [router]);

  const handleIntegrations = useCallback(() => {
    router.push("/settings/integrations" as never);
  }, [router]);

  const handlePlugins = useCallback(() => {
    router.push("/settings/plugins" as never);
  }, [router]);

  const handleLocale = useCallback(() => {
    router.push("/settings/locale" as never);
  }, [router]);

  const handleBackup = useCallback(() => {
    router.push("/settings/backup" as never);
  }, [router]);

  const handleDebug = useCallback(() => {
    router.push("/settings/debug" as never);
  }, [router]);

  const handleAbout = useCallback(() => {
    router.push("/settings/about" as never);
  }, [router]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 24, paddingBottom: 40, paddingTop: 8 }}
    >
      <SettingsGroup title="Customize">
        <SettingsItem
          icon="palette"
          iconBg="#8B5CF6"
          title="Appearance"
          summary="Theme, colors, typography, shapes"
          onPress={handleAppearance}
        />
        <SettingsItem
          icon="home"
          iconBg="#3B82F6"
          title="Homescreen"
          summary="Dock, widgets, search bar, wallpaper"
          onPress={handleHomescreen}
        />
        <SettingsItem
          icon="grid-view"
          iconBg="#06B6D4"
          title="Icons"
          summary="Shape, themed icons, icon packs"
          onPress={handleIcons}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="Interaction">
        <SettingsItem
          icon="search"
          iconBg="#F59E0B"
          title="Search"
          summary="Providers, filters, ranking"
          onPress={handleSearch}
        />
        <SettingsItem
          icon="gesture"
          iconBg="#EC4899"
          title="Gestures"
          summary="Swipe actions, taps"
          onPress={handleGestures}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="Connections">
        <SettingsItem
          icon="extension"
          iconBg="#10B981"
          title="Integrations"
          summary="Weather, calendar, media"
          onPress={handleIntegrations}
        />
        <SettingsItem
          icon="power"
          iconBg="#6366F1"
          title="Plugins"
          summary="Plugin management"
          onPress={handlePlugins}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="System">
        <SettingsItem
          icon="language"
          iconBg="#F97316"
          title="Locale"
          summary="Language, time format"
          onPress={handleLocale}
        />
        <SettingsItem
          icon="cloud-upload"
          iconBg="#14B8A6"
          title="Backup"
          summary="Import/export theme and settings"
          onPress={handleBackup}
        />
        <SettingsItem
          icon="bug-report"
          iconBg="#EF4444"
          title="Debug"
          summary="Debug options"
          onPress={handleDebug}
        />
        <SettingsItem
          icon="info-outline"
          iconBg="#6B7280"
          title="About"
          summary="App info, licenses"
          onPress={handleAbout}
          isLast
        />
      </SettingsGroup>
    </ScrollView>
  );
};

export default SettingsIndex;
