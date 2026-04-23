import { MaterialIcons } from "@expo/vector-icons";
import { Button, useThemeColor } from "heroui-native";
import { memo, useCallback, useMemo } from "react";
import { Text, View } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SelectPreference } from "@/components/settings/select-preference";
import { SwitchPreference } from "@/components/settings/switch-preference";
import { useOpenClaw } from "@/context/openclaw";
import { useThemeOverrides } from "@/context/theme-overrides";
import type {
  OpenClawSlashCommand,
  OpenClawSlashCommandSelectionBehavior,
} from "@/types/openclaw";

const SLASH_COMMAND_BEHAVIOR_OPTIONS = [
  { label: "Smart", value: "smart" },
  { label: "Insert", value: "insert" },
  { label: "Execute", value: "execute" },
] as const satisfies {
  label: string;
  value: OpenClawSlashCommandSelectionBehavior;
}[];

interface SlashCommandRowProps {
  command: OpenClawSlashCommand;
  isHidden: boolean;
  onToggle: (commandName: string) => void;
}

const SlashCommandRow = memo(function SlashCommandRow({
  command,
  isHidden,
  onToggle,
}: SlashCommandRowProps) {
  const [defaultColor, foreground, muted] = useThemeColor([
    "default",
    "foreground",
    "muted",
  ] as const);
  const { cardRadius, fontFamily } = useThemeOverrides();

  const handleToggle = useCallback(() => {
    onToggle(command.name);
  }, [command.name, onToggle]);

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: defaultColor,
        borderCurve: "continuous",
        borderRadius: cardRadius,
        flexDirection: "row",
        gap: 10,
        opacity: isHidden ? 0.55 : 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <MaterialIcons name="code" size={18} color={foreground} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          selectable
          style={{
            color: foreground,
            fontFamily,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          /{command.name}
        </Text>
        <Text
          selectable
          style={{
            color: muted,
            fontSize: 12,
            lineHeight: 16,
          }}
        >
          {command.description}
        </Text>
      </View>
      <Button onPress={handleToggle} variant="secondary">
        <Button.Label>{isHidden ? "Show" : "Hide"}</Button.Label>
      </Button>
    </View>
  );
});

export const OpenClawSlashCommandSettingsSection = () => {
  const {
    actions,
    connectionStatus,
    slashCommandError,
    slashCommandSettings,
    slashCommands,
    slashCommandsLoading,
  } = useOpenClaw();
  const [foreground, muted] = useThemeColor(["foreground", "muted"] as const);
  const { fontFamily } = useThemeOverrides();

  const hiddenSlashCommands = useMemo(
    () => new Set(slashCommandSettings.hiddenCommandNames),
    [slashCommandSettings.hiddenCommandNames]
  );

  const slashCommandSummary = useMemo(() => {
    if (connectionStatus !== "connected") {
      return "Connect to OpenClaw to fetch remote slash commands.";
    }

    if (slashCommands.length === 0) {
      return "No remote commands cached yet.";
    }

    const hiddenCount = slashCommandSettings.hiddenCommandNames.length;
    return `${slashCommands.length} remote commands cached${
      hiddenCount > 0 ? `, ${hiddenCount} hidden locally` : ""
    }.`;
  }, [
    connectionStatus,
    slashCommandSettings.hiddenCommandNames.length,
    slashCommands.length,
  ]);

  const handleRefreshSlashCommands = useCallback(async () => {
    await actions.refreshSlashCommands();
  }, [actions]);

  const handleSlashCommandsEnabled = useCallback(
    (enabled: boolean) => {
      actions.updateSlashCommandSettings((current) => ({
        ...current,
        enabled,
      }));
    },
    [actions]
  );

  const handleSlashCommandBehavior = useCallback(
    (selectionBehavior: OpenClawSlashCommandSelectionBehavior) => {
      actions.updateSlashCommandSettings((current) => ({
        ...current,
        selectionBehavior,
      }));
    },
    [actions]
  );

  const handleToggleHiddenSlashCommand = useCallback(
    (commandName: string) => {
      actions.updateSlashCommandSettings((current) => {
        const hidden = new Set(current.hiddenCommandNames);
        if (hidden.has(commandName)) {
          hidden.delete(commandName);
        } else {
          hidden.add(commandName);
        }

        return {
          ...current,
          hiddenCommandNames: [...hidden],
        };
      });
    },
    [actions]
  );

  return (
    <PreferenceCategory
      description="These settings control how OpenClaw's gateway-provided slash commands appear in the launcher search bar."
      title="Slash Commands"
    >
      <View style={{ gap: 4 }}>
        <SwitchPreference
          icon="terminal"
          onValueChange={handleSlashCommandsEnabled}
          summary={slashCommandSummary}
          title="Show OpenClaw commands in / menu"
          value={slashCommandSettings.enabled}
        />

        <SelectPreference
          disabled={!slashCommandSettings.enabled}
          icon="touch-app"
          onValueChange={handleSlashCommandBehavior}
          options={[...SLASH_COMMAND_BEHAVIOR_OPTIONS]}
          summary="Smart executes no-arg commands and inserts commands that need arguments."
          title="Selection behavior"
          value={slashCommandSettings.selectionBehavior}
        />

        <View
          style={{
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button
                isDisabled={
                  connectionStatus !== "connected" || slashCommandsLoading
                }
                onPress={handleRefreshSlashCommands}
                variant="secondary"
              >
                <MaterialIcons name="refresh" size={18} color={foreground} />
                <Button.Label>
                  {slashCommandsLoading ? "Refreshing..." : "Refresh Commands"}
                </Button.Label>
              </Button>
            </View>
          </View>

          {slashCommandError ? (
            <Text
              selectable
              style={{
                color: muted,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {slashCommandError}
            </Text>
          ) : null}

          {slashCommands.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text
                selectable
                style={{
                  color: foreground,
                  fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Visible commands
              </Text>
              {slashCommands.map((command) => (
                <SlashCommandRow
                  command={command}
                  isHidden={hiddenSlashCommands.has(command.name)}
                  key={command.name}
                  onToggle={handleToggleHiddenSlashCommand}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </PreferenceCategory>
  );
};
