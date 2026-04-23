import type { OpenClawEndpointConfig } from "react-native-openclaw-gateway";

export type OpenClawConnectionMode = "manual" | "setup-code";

export type OpenClawConnectionStatus =
  | "auth-blocked"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "reconnecting"
  | "trust-required";

export type OpenClawSlashCommandSelectionBehavior =
  | "execute"
  | "insert"
  | "smart";

export interface OpenClawSlashCommandSettings {
  enabled: boolean;
  hiddenCommandNames: string[];
  selectionBehavior: OpenClawSlashCommandSelectionBehavior;
}

export interface OpenClawSlashCommandArg {
  choices?: { label: string; value: string }[];
  description: string;
  dynamic?: boolean;
  name: string;
  required?: boolean;
  type: "boolean" | "number" | "string";
}

export interface OpenClawSlashCommand {
  acceptsArgs: boolean;
  args?: OpenClawSlashCommandArg[];
  category?: string;
  description: string;
  name: string;
  scope?: string;
  source?: string;
  textAliases: string[];
}

export interface OpenClawTopic {
  id: string;
  label: string;
  sessionKey: string;
  agentId?: string;
  createdAt: number;
  lastUsedAt?: number;
  isBuiltIn?: boolean;
}

export interface OpenClawTopicDraft {
  label: string;
  agentId?: string;
}

export interface OpenClawConnectionConfig {
  endpoint: OpenClawEndpointConfig;
  endpointId: string;
  mode: OpenClawConnectionMode;
  lastConnectedAt?: number;
}

export interface OpenClawConnectionSecrets {
  bootstrapToken?: string;
  password?: string;
  token?: string;
}

export interface OpenClawPendingResumeIntent {
  autoSend?: boolean;
  createdAt: number;
  message: string;
  topicId: string;
}

export interface OpenClawTrustPromptState {
  connectionConfig: OpenClawConnectionConfig;
  connectionSecrets: OpenClawConnectionSecrets;
  endpoint: OpenClawEndpointConfig;
  endpointId: string;
  fingerprintSha256: string;
}

export interface OpenClawAgentSummary {
  emoji?: string;
  id: string;
  isDefault?: boolean;
  name?: string;
}

export interface OpenClawChatMessageContent {
  base64?: string;
  fileName?: string;
  mimeType?: string;
  text?: string;
  type: string;
}

export interface OpenClawChatMessage {
  content: OpenClawChatMessageContent[];
  id: string;
  role: string;
  timestampMs?: number;
}

export interface OpenClawChatHistory {
  messages: OpenClawChatMessage[];
  sessionId?: string;
  sessionKey: string;
  thinkingLevel?: string;
}

export const OPENCLAW_BUILT_IN_TOPIC_ID = "builtin-chat";
export const OPENCLAW_BUILT_IN_TOPIC_LABEL = "Chat";
export const OPENCLAW_BUILT_IN_TOPIC_SESSION_KEY = "main";
export const OPENCLAW_STORAGE_SCHEMA_VERSION = 2;

export const DEFAULT_OPENCLAW_SLASH_COMMAND_SETTINGS: OpenClawSlashCommandSettings =
  {
    enabled: true,
    hiddenCommandNames: [],
    selectionBehavior: "smart",
  };

export const BUILT_IN_CHAT_TOPIC: OpenClawTopic = {
  createdAt: 0,
  id: OPENCLAW_BUILT_IN_TOPIC_ID,
  isBuiltIn: true,
  label: OPENCLAW_BUILT_IN_TOPIC_LABEL,
  sessionKey: OPENCLAW_BUILT_IN_TOPIC_SESSION_KEY,
};

export const buildOpenClawEndpointId = (
  endpoint: OpenClawEndpointConfig
): string =>
  `${endpoint.tls ? "wss" : "ws"}://${endpoint.host}:${endpoint.port}`;

export const hasOpenClawConnectionSecrets = (
  secrets: OpenClawConnectionSecrets | null | undefined
): boolean =>
  Boolean(secrets?.bootstrapToken || secrets?.password || secrets?.token);

export const normalizeOpenClawTopicLabel = (label: string): string =>
  label.trim().replaceAll(/\s+/g, " ");

export const resolveOpenClawTopicSessionKey = (
  topic: Pick<OpenClawTopic, "agentId" | "sessionKey">
): string =>
  topic.agentId
    ? `agent:${topic.agentId}:${topic.sessionKey}`
    : topic.sessionKey;
