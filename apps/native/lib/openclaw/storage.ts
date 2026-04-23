import { createMMKV } from "react-native-mmkv";

import {
  BUILT_IN_CHAT_TOPIC,
  DEFAULT_OPENCLAW_SLASH_COMMAND_SETTINGS,
  OPENCLAW_BUILT_IN_TOPIC_ID,
  OPENCLAW_STORAGE_SCHEMA_VERSION,
} from "@/types/openclaw";
import type {
  OpenClawConnectionConfig,
  OpenClawPendingResumeIntent,
  OpenClawSlashCommandSelectionBehavior,
  OpenClawSlashCommandSettings,
  OpenClawTopic,
} from "@/types/openclaw";

const OPENCLAW_STATE_KEY = "openclaw-state";
const OPENCLAW_SCHEMA_VERSION_KEY = "openclaw-schema-version";

interface OpenClawPersistedState {
  activeTopicId: string;
  connectionConfig: OpenClawConnectionConfig | null;
  pendingResumeIntent: OpenClawPendingResumeIntent | null;
  slashCommandSettings: OpenClawSlashCommandSettings;
  topics: OpenClawTopic[];
}

const defaultState: OpenClawPersistedState = {
  activeTopicId: OPENCLAW_BUILT_IN_TOPIC_ID,
  connectionConfig: null,
  pendingResumeIntent: null,
  slashCommandSettings: DEFAULT_OPENCLAW_SLASH_COMMAND_SETTINGS,
  topics: [BUILT_IN_CHAT_TOPIC],
};

const OPENCLAW_SLASH_COMMAND_SELECTION_BEHAVIORS =
  new Set<OpenClawSlashCommandSelectionBehavior>([
    "execute",
    "insert",
    "smart",
  ]);

const storage = createMMKV({ id: "openclaw" });

const sanitizeOpenClawTopic = (value: unknown): OpenClawTopic | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<OpenClawTopic>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.label !== "string" ||
    typeof candidate.sessionKey !== "string" ||
    typeof candidate.createdAt !== "number"
  ) {
    return null;
  }

  const topic: OpenClawTopic = {
    createdAt: candidate.createdAt,
    id: candidate.id,
    isBuiltIn: candidate.isBuiltIn === true,
    label: candidate.label,
    sessionKey: candidate.sessionKey,
  };

  if (typeof candidate.agentId === "string" && candidate.agentId.length > 0) {
    topic.agentId = candidate.agentId;
  }

  if (
    typeof candidate.lastUsedAt === "number" &&
    Number.isFinite(candidate.lastUsedAt)
  ) {
    topic.lastUsedAt = candidate.lastUsedAt;
  }

  return topic;
};

const sanitizeEndpoint = (
  value: unknown
): OpenClawConnectionConfig["endpoint"] | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<OpenClawConnectionConfig["endpoint"]>;
  if (
    typeof candidate.displayUrl !== "string" ||
    typeof candidate.host !== "string" ||
    typeof candidate.port !== "number" ||
    typeof candidate.tls !== "boolean"
  ) {
    return null;
  }

  return {
    displayUrl: candidate.displayUrl,
    host: candidate.host,
    port: candidate.port,
    tls: candidate.tls,
  };
};

const sanitizeConnectionConfig = (
  value: unknown
): OpenClawConnectionConfig | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<OpenClawConnectionConfig>;
  const endpoint = sanitizeEndpoint(candidate.endpoint);
  if (
    !endpoint ||
    typeof candidate.endpointId !== "string" ||
    (candidate.mode !== "manual" && candidate.mode !== "setup-code")
  ) {
    return null;
  }

  return {
    endpoint,
    endpointId: candidate.endpointId,
    lastConnectedAt:
      typeof candidate.lastConnectedAt === "number"
        ? candidate.lastConnectedAt
        : undefined,
    mode: candidate.mode,
  };
};

const sanitizePendingResumeIntent = (
  value: unknown
): OpenClawPendingResumeIntent | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<OpenClawPendingResumeIntent>;
  if (
    typeof candidate.createdAt !== "number" ||
    typeof candidate.message !== "string" ||
    typeof candidate.topicId !== "string"
  ) {
    return null;
  }

  return {
    autoSend: candidate.autoSend === true,
    createdAt: candidate.createdAt,
    message: candidate.message,
    topicId: candidate.topicId,
  };
};

const sanitizeSlashCommandSettings = (
  value: unknown
): OpenClawSlashCommandSettings => {
  if (!value || typeof value !== "object") {
    return DEFAULT_OPENCLAW_SLASH_COMMAND_SETTINGS;
  }

  const candidate = value as Partial<OpenClawSlashCommandSettings>;
  const hiddenCommandNames = Array.isArray(candidate.hiddenCommandNames)
    ? [
        ...new Set(
          candidate.hiddenCommandNames
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim().replace(/^\//, ""))
            .filter((entry) => entry.length > 0)
        ),
      ]
    : DEFAULT_OPENCLAW_SLASH_COMMAND_SETTINGS.hiddenCommandNames;

  return {
    enabled:
      typeof candidate.enabled === "boolean"
        ? candidate.enabled
        : DEFAULT_OPENCLAW_SLASH_COMMAND_SETTINGS.enabled,
    hiddenCommandNames,
    selectionBehavior:
      candidate.selectionBehavior &&
      OPENCLAW_SLASH_COMMAND_SELECTION_BEHAVIORS.has(
        candidate.selectionBehavior
      )
        ? candidate.selectionBehavior
        : DEFAULT_OPENCLAW_SLASH_COMMAND_SETTINGS.selectionBehavior,
  };
};

const ensureBuiltInTopic = (topics: OpenClawTopic[]): OpenClawTopic[] => {
  const uniqueTopics = new Map<string, OpenClawTopic>();
  for (const topic of topics) {
    if (topic.id === OPENCLAW_BUILT_IN_TOPIC_ID) {
      continue;
    }
    uniqueTopics.set(topic.id, topic);
  }

  return [BUILT_IN_CHAT_TOPIC, ...uniqueTopics.values()];
};

const sanitizeState = (value: unknown): OpenClawPersistedState => {
  if (!value || typeof value !== "object") {
    return defaultState;
  }

  const candidate = value as Partial<OpenClawPersistedState>;
  const topics = Array.isArray(candidate.topics)
    ? ensureBuiltInTopic(
        candidate.topics
          .map((entry) => sanitizeOpenClawTopic(entry))
          .filter((entry): entry is OpenClawTopic => entry !== null)
      )
    : defaultState.topics;

  const activeTopicId =
    typeof candidate.activeTopicId === "string" &&
    topics.some((topic) => topic.id === candidate.activeTopicId)
      ? candidate.activeTopicId
      : OPENCLAW_BUILT_IN_TOPIC_ID;

  return {
    activeTopicId,
    connectionConfig: sanitizeConnectionConfig(candidate.connectionConfig),
    pendingResumeIntent: sanitizePendingResumeIntent(
      candidate.pendingResumeIntent
    ),
    slashCommandSettings: sanitizeSlashCommandSettings(
      candidate.slashCommandSettings
    ),
    topics,
  };
};

export const getOpenClawState = (): OpenClawPersistedState => {
  const raw = storage.getString(OPENCLAW_STATE_KEY);
  if (!raw) {
    return defaultState;
  }

  try {
    return sanitizeState(JSON.parse(raw) as unknown);
  } catch {
    return defaultState;
  }
};

export const setOpenClawState = (state: OpenClawPersistedState): void => {
  const sanitized = sanitizeState(state);
  storage.set(OPENCLAW_STATE_KEY, JSON.stringify(sanitized));
  storage.set(
    OPENCLAW_SCHEMA_VERSION_KEY,
    OPENCLAW_STORAGE_SCHEMA_VERSION.toString()
  );
};

export type { OpenClawPersistedState };
