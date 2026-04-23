import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";

import { useOpenClaw } from "@/context/openclaw";
import {
  buildOpenClawSlashCommandText,
  sendOpenClawSlashCommand,
} from "@/lib/openclaw/commands";
import type { CommandSuggestion } from "@/types/enriched-search";
import type { OpenClawSlashCommand } from "@/types/openclaw";

const COMMAND_SUGGESTION_LIMIT = 8;

const formatCommandArgs = (command: OpenClawSlashCommand): string => {
  if (!command.args?.length) {
    return "";
  }

  return command.args
    .map((arg) => (arg.required ? `<${arg.name}>` : `[${arg.name}]`))
    .join(" ");
};

export const useCommandSuggestions = (query: string): CommandSuggestion[] => {
  const router = useRouter();
  const {
    activeTopicId,
    connectionStatus,
    getTopicChatPath,
    resolveTopicSessionKey,
    slashCommandSettings,
    slashCommands,
  } = useOpenClaw();

  const commands: CommandSuggestion[] = useMemo(
    () => [
      {
        action: () => router.push("/settings"),
        command: "/settings",
        icon: "settings-outline",
        label: "Open settings",
      },
      {
        action: () => {
          /* clear handled by caller */
        },
        command: "/clear",
        icon: "close-circle-outline",
        label: "Clear search",
      },
      {
        action: () => router.push("/settings/search"),
        command: "/search",
        icon: "search-outline",
        label: "Search settings",
      },
      {
        action: () => router.push("/settings/appearance"),
        command: "/theme",
        icon: "color-palette-outline",
        label: "Change theme",
      },
      {
        action: () => router.push("/settings/integrations"),
        command: "/weather",
        icon: "cloud-outline",
        label: "Weather settings",
      },
    ],
    [router]
  );

  const executeOpenClawCommand = useCallback(
    async (command: OpenClawSlashCommand) => {
      const sessionKey = resolveTopicSessionKey(activeTopicId);
      if (!sessionKey) {
        return;
      }

      router.push(getTopicChatPath(activeTopicId) as never);
      try {
        await sendOpenClawSlashCommand(sessionKey, command);
      } catch {
        // The chat surface refreshes from gateway state; keep launcher input responsive.
      }
    },
    [activeTopicId, getTopicChatPath, resolveTopicSessionKey, router]
  );

  const openClawCommands: CommandSuggestion[] = useMemo(() => {
    if (
      connectionStatus !== "connected" ||
      !slashCommandSettings.enabled ||
      slashCommands.length === 0
    ) {
      return [];
    }

    const hidden = new Set(slashCommandSettings.hiddenCommandNames);
    return slashCommands.flatMap((command) => {
      if (hidden.has(command.name)) {
        return [];
      }

      const args = formatCommandArgs(command);
      const requiresArgs =
        command.args?.some((arg) => arg.required === true) ?? false;
      const shouldInsert =
        requiresArgs ||
        slashCommandSettings.selectionBehavior === "insert" ||
        (slashCommandSettings.selectionBehavior === "smart" &&
          command.acceptsArgs);
      const insertText = `${buildOpenClawSlashCommandText(command)}${args ? " " : ""}`;

      return [
        {
          action: shouldInsert
            ? undefined
            : () => executeOpenClawCommand(command),
          aliases: command.textAliases.map((alias) => `/${alias}`),
          command: buildOpenClawSlashCommandText(command),
          icon: "terminal-outline",
          insertText: shouldInsert ? insertText : undefined,
          label: args ? `${command.description} ${args}` : command.description,
        },
      ];
    });
  }, [
    connectionStatus,
    executeOpenClawCommand,
    slashCommandSettings.enabled,
    slashCommandSettings.hiddenCommandNames,
    slashCommandSettings.selectionBehavior,
    slashCommands,
  ]);

  const combinedCommands = useMemo(() => {
    const seen = new Set<string>();
    return [...commands, ...openClawCommands].filter((command) => {
      const key = command.command.replace(/^\//, "");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [commands, openClawCommands]);

  return useMemo(() => {
    if (!query) {
      return combinedCommands.slice(0, COMMAND_SUGGESTION_LIMIT);
    }
    const q = query.toLowerCase();
    return combinedCommands
      .filter((command) =>
        [command.command, ...(command.aliases ?? [])].some((entry) =>
          entry.slice(1).toLowerCase().startsWith(q)
        )
      )
      .slice(0, COMMAND_SUGGESTION_LIMIT);
  }, [query, combinedCommands]);
};
