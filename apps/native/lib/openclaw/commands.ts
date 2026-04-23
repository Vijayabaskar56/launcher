import * as Crypto from "expo-crypto";
import { openClawGateway } from "react-native-openclaw-gateway";

import type {
  OpenClawSlashCommand,
  OpenClawSlashCommandArg,
} from "@/types/openclaw";

interface RawCommandArgChoice {
  label?: unknown;
  value?: unknown;
}

interface RawCommandArg {
  choices?: unknown;
  description?: unknown;
  dynamic?: unknown;
  name?: unknown;
  required?: unknown;
  type?: unknown;
}

interface RawCommandEntry {
  acceptsArgs?: unknown;
  args?: unknown;
  category?: unknown;
  description?: unknown;
  name?: unknown;
  scope?: unknown;
  source?: unknown;
  textAliases?: unknown;
}

const parseCommandChoice = (value: unknown) => {
  if (typeof value === "string") {
    return { label: value, value };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as RawCommandArgChoice;
  if (typeof candidate.value !== "string") {
    return null;
  }

  return {
    label:
      typeof candidate.label === "string" ? candidate.label : candidate.value,
    value: candidate.value,
  };
};

const parseCommandArg = (value: unknown): OpenClawSlashCommandArg | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as RawCommandArg;
  if (
    typeof candidate.name !== "string" ||
    typeof candidate.description !== "string" ||
    (candidate.type !== "boolean" &&
      candidate.type !== "number" &&
      candidate.type !== "string")
  ) {
    return null;
  }

  const parsed: OpenClawSlashCommandArg = {
    description: candidate.description,
    dynamic: candidate.dynamic === true,
    name: candidate.name,
    required: candidate.required === true,
    type: candidate.type,
  };

  if (Array.isArray(candidate.choices)) {
    const choices = candidate.choices
      .map((choice) => parseCommandChoice(choice))
      .filter(
        (choice): choice is { label: string; value: string } => choice !== null
      );
    if (choices.length > 0) {
      parsed.choices = choices;
    }
  }

  return parsed;
};

const normalizeCommandName = (value: string): string =>
  value.trim().replace(/^\//, "");

const parseCommandEntry = (value: unknown): OpenClawSlashCommand | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as RawCommandEntry;
  if (
    typeof candidate.name !== "string" ||
    typeof candidate.description !== "string"
  ) {
    return null;
  }

  const name = normalizeCommandName(candidate.name);
  if (!name) {
    return null;
  }

  const args = Array.isArray(candidate.args)
    ? candidate.args
        .map((arg) => parseCommandArg(arg))
        .filter((arg): arg is OpenClawSlashCommandArg => arg !== null)
    : [];

  const aliases = Array.isArray(candidate.textAliases)
    ? candidate.textAliases
        .filter((alias): alias is string => typeof alias === "string")
        .map(normalizeCommandName)
        .filter((alias) => alias.length > 0)
    : [];

  return {
    acceptsArgs: candidate.acceptsArgs === true || args.length > 0,
    args: args.length > 0 ? args : undefined,
    category:
      typeof candidate.category === "string" ? candidate.category : undefined,
    description: candidate.description,
    name,
    scope: typeof candidate.scope === "string" ? candidate.scope : undefined,
    source: typeof candidate.source === "string" ? candidate.source : undefined,
    textAliases: [...new Set([name, ...aliases])],
  };
};

export const listOpenClawSlashCommands = async (): Promise<
  OpenClawSlashCommand[]
> => {
  const response = await openClawGateway.request(
    "commands.list",
    JSON.stringify({
      includeArgs: true,
      scope: "text",
    }),
    15_000
  );
  const payload = JSON.parse(response) as { commands?: unknown[] };
  if (!Array.isArray(payload.commands)) {
    return [];
  }

  return payload.commands
    .map((command) => parseCommandEntry(command))
    .filter((command): command is OpenClawSlashCommand => command !== null);
};

export const buildOpenClawSlashCommandText = (
  command: Pick<OpenClawSlashCommand, "name">
): string => `/${normalizeCommandName(command.name)}`;

export const sendOpenClawSlashCommand = async (
  sessionKey: string,
  command: OpenClawSlashCommand
): Promise<void> => {
  await openClawGateway.request(
    "chat.send",
    JSON.stringify({
      idempotencyKey: await Crypto.randomUUID(),
      message: buildOpenClawSlashCommandText(command),
      sessionKey,
    }),
    30_000
  );
};
