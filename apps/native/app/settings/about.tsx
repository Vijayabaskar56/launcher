import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { useThemeOverrides } from "@/context/theme-overrides";

interface AboutRowProps {
  label: string;
  value: string;
}

const AboutRow = ({ label, value }: AboutRowProps) => {
  const defaultColor = useThemeColor("default");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const { smallRadius } = useThemeOverrides();

  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 13,
      }}
    >
      <Text
        style={{
          color: foreground,
          fontSize: 16,
          fontWeight: "500",
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: defaultColor,
          borderCurve: "continuous",
          borderRadius: smallRadius,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <Text
          selectable
          style={{
            color: muted,
            fontSize: 13,
            fontVariant: ["tabular-nums"],
            fontWeight: "500",
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
};

interface AboutLinkProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
}

const AboutLink = ({ icon, title, subtitle }: AboutLinkProps) => {
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
        {subtitle ? (
          <Text
            style={{
              color: muted,
              fontSize: 13,
              letterSpacing: -0.1,
              lineHeight: 18,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </Pressable>
  );
};

const AboutSettings = () => {
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    "1";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory title="App Info">
        <AboutRow label="Version" value={appVersion} />
        <AboutRow label="Build" value={buildNumber} />
      </PreferenceCategory>

      <PreferenceCategory title="Legal">
        <AboutLink
          icon="description"
          title="Licenses"
          subtitle="Open source licenses (coming soon)"
        />
        <AboutLink
          icon="privacy-tip"
          title="Privacy Policy"
          subtitle="View privacy policy (coming soon)"
        />
        <AboutLink
          icon="gavel"
          title="Terms of Service"
          subtitle="View terms of service (coming soon)"
        />
      </PreferenceCategory>
    </ScrollView>
  );
};

export default AboutSettings;
