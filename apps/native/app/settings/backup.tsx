import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useThemeColor } from "heroui-native";
import { use, useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SettingsContext } from "@/context/settings";
import { useThemeOverrides } from "@/context/theme-overrides";
import { getSettings } from "@/lib/storage";
import type { LauncherSettingsData } from "@/types/settings";

interface BackupActionProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

const BackupAction = ({
  icon,
  title,
  description,
  onPress,
  disabled,
}: BackupActionProps) => {
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
      opacity: disabled ? 0.5 : 1,
      paddingHorizontal: 16,
      paddingVertical: 13,
    }),
    [disabled]
  );

  return (
    <Pressable onPress={onPress} disabled={disabled} style={getStyle}>
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
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </Pressable>
  );
};

const buildFileName = (): string => {
  const [date] = new Date().toISOString().split("T");
  return `launcher-backup-${date}.json`;
};

const buildExportPayload = (): string => {
  const settings = getSettings();
  const payload = {
    _exportedAt: new Date().toISOString(),
    _format: "launcher-settings",
    _version: 1,
    settings,
  };
  return JSON.stringify(payload, null, 2);
};

const validateImport = (
  data: unknown
): data is { settings: LauncherSettingsData } => {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    obj._format === "launcher-settings" &&
    typeof obj.settings === "object" &&
    obj.settings !== null
  );
};

const BackupSettings = () => {
  const settingsCtx = use(SettingsContext);
  const [busy, setBusy] = useState(false);

  const handleExport = useCallback(async () => {
    setBusy(true);
    try {
      const json = buildExportPayload();
      const file = new File(Paths.cache, buildFileName());
      file.write(json);
      await Sharing.shareAsync(file.uri, {
        UTI: "public.json",
        dialogTitle: "Export Launcher Settings",
        mimeType: "application/json",
      });
    } catch (error) {
      Alert.alert(
        "Export Failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "application/json",
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const [asset] = result.assets;
      const file = new File(asset.uri);
      const content = await file.text();

      const parsed: unknown = JSON.parse(content);

      if (!validateImport(parsed)) {
        Alert.alert(
          "Invalid File",
          "This file doesn't appear to be a valid launcher settings backup."
        );
        return;
      }

      Alert.alert(
        "Restore Settings?",
        "This will replace all your current settings. This cannot be undone.",
        [
          { style: "cancel", text: "Cancel" },
          {
            onPress: () => {
              settingsCtx?.actions.replaceAll(parsed.settings);
              Alert.alert(
                "Restored",
                "Settings have been restored. You may need to restart the app for all changes to take effect."
              );
            },
            style: "destructive",
            text: "Restore",
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Import Failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setBusy(false);
    }
  }, [settingsCtx]);

  const handleResetAll = useCallback(() => {
    Alert.alert(
      "Reset All Settings?",
      "This will restore all settings to their defaults. This cannot be undone.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => {
            settingsCtx?.actions.resetAll();
            Alert.alert(
              "Reset",
              "All settings have been restored to defaults."
            );
          },
          style: "destructive",
          text: "Reset",
        },
      ]
    );
  }, [settingsCtx]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory
        title="Settings Transfer"
        description="Export or import your launcher configuration as a JSON file"
      >
        <BackupAction
          icon="upload"
          title="Export Settings"
          description="Save all settings to a shareable JSON file"
          onPress={handleExport}
          disabled={busy}
        />
        <BackupAction
          icon="download"
          title="Import Settings"
          description="Restore settings from a previously exported file"
          onPress={handleImport}
          disabled={busy}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Reset">
        <BackupAction
          icon="restore"
          title="Reset All Settings"
          description="Restore all settings to their default values"
          onPress={handleResetAll}
          disabled={busy}
        />
      </PreferenceCategory>
    </ScrollView>
  );
};

export default BackupSettings;
