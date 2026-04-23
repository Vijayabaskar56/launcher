import * as Crypto from "expo-crypto";
import { getLocales } from "expo-localization";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { openClawGateway } from "react-native-openclaw-gateway";
import type {
  OpenClawConnectionState,
  OpenClawConnectionSnapshot,
  OpenClawEndpointConfig,
} from "react-native-openclaw-gateway";

import { listOpenClawSlashCommands } from "@/lib/openclaw/commands";
import {
  getOpenClawConnectionSecrets,
  setOpenClawConnectionSecrets,
} from "@/lib/openclaw/secure-store";
import { getOpenClawState, setOpenClawState } from "@/lib/openclaw/storage";
import type { OpenClawPersistedState } from "@/lib/openclaw/storage";
import {
  BUILT_IN_CHAT_TOPIC,
  OPENCLAW_BUILT_IN_TOPIC_ID,
  buildOpenClawEndpointId,
  hasOpenClawConnectionSecrets,
  normalizeOpenClawTopicLabel,
  resolveOpenClawTopicSessionKey,
} from "@/types/openclaw";
import type {
  OpenClawAgentSummary,
  OpenClawConnectionConfig,
  OpenClawConnectionMode,
  OpenClawConnectionSecrets,
  OpenClawConnectionStatus,
  OpenClawPendingResumeIntent,
  OpenClawSlashCommand,
  OpenClawSlashCommandSettings,
  OpenClawTopic,
  OpenClawTopicDraft,
  OpenClawTrustPromptState,
} from "@/types/openclaw";

interface ConnectManualInput {
  bootstrapToken?: string;
  endpoint: string;
  password?: string;
  token?: string;
}

interface OpenClawContextValue {
  actions: {
    acceptTlsTrust: () => Promise<void>;
    beginPendingResume: (
      intent: Omit<OpenClawPendingResumeIntent, "createdAt">
    ) => void;
    clearPendingResume: () => void;
    connectManual: (input: ConnectManualInput) => Promise<void>;
    connectWithSetupCode: (rawSetupCode: string) => Promise<void>;
    declineTlsTrust: () => void;
    deleteTopic: (topicId: string) => void;
    disconnect: () => void;
    refreshAgents: () => Promise<void>;
    refreshSlashCommands: () => Promise<void>;
    setActiveTopic: (topicId: string) => void;
    updateSlashCommandSettings: (
      updater:
        | OpenClawSlashCommandSettings
        | ((
            current: OpenClawSlashCommandSettings
          ) => OpenClawSlashCommandSettings)
    ) => void;
    updateTopic: (
      topicId: string,
      draft: Pick<OpenClawTopicDraft, "label"> & Partial<OpenClawTopicDraft>
    ) => void;
    createTopic: (draft: OpenClawTopicDraft) => Promise<OpenClawTopic>;
    reconnect: () => Promise<void>;
  };
  activeTopicId: string;
  activeTopic: OpenClawTopic;
  agents: OpenClawAgentSummary[];
  connectionConfig: OpenClawConnectionConfig | null;
  connectionError: string | null;
  connectionRuntimeState: OpenClawConnectionState;
  connectionSnapshot: OpenClawConnectionSnapshot;
  connectionStatus: OpenClawConnectionStatus;
  getTopicChatPath: (topicId: string) => string;
  hasSavedConnectionSecrets: boolean;
  loaded: boolean;
  pendingResumeIntent: OpenClawPendingResumeIntent | null;
  resolveTopicSessionKey: (topicId: string) => string | undefined;
  slashCommandError: string | null;
  slashCommandSettings: OpenClawSlashCommandSettings;
  slashCommands: OpenClawSlashCommand[];
  slashCommandsLoading: boolean;
  topics: OpenClawTopic[];
  trustPrompt: OpenClawTrustPromptState | null;
}

const DISCONNECTED_SNAPSHOT: OpenClawConnectionSnapshot = {
  endpointId: undefined,
  endpointUrl: undefined,
  isConnected: false,
  mainSessionKey: undefined,
};

const DISCONNECTED_STATE: OpenClawConnectionState = {
  authBlocked: false,
  errorMessage: undefined,
  phase: "disconnected",
  statusMessage: "Offline",
};

const OPERATOR_SCOPES = [
  "operator.read",
  "operator.write",
  "operator.talk.secrets",
] as const;

const createTopicIdentity = async (): Promise<{
  id: string;
  sessionKey: string;
}> => {
  const rawId = await Crypto.randomUUID();
  const compactId = rawId.replaceAll("-", "");

  return {
    id: `topic-${compactId}`,
    sessionKey: `topic-${compactId}`,
  };
};

const readErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unexpected OpenClaw error.";

const parseAgentSummaries = (value: string): OpenClawAgentSummary[] => {
  const payload = JSON.parse(value) as {
    agents?: {
      id?: string;
      identity?: { emoji?: string };
      name?: string;
    }[];
    defaultId?: string;
  };

  if (!Array.isArray(payload.agents)) {
    return [];
  }

  return payload.agents.flatMap((agent) => {
    if (typeof agent.id !== "string") {
      return [];
    }

    return [
      {
        emoji:
          typeof agent.identity?.emoji === "string"
            ? agent.identity.emoji
            : undefined,
        id: agent.id,
        isDefault: agent.id === payload.defaultId,
        name: typeof agent.name === "string" ? agent.name : undefined,
      },
    ];
  });
};

const getTopicChatPath = (topicId: string): string =>
  `/openclaw/chat/${topicId}`;

const resolveConnectionStatus = (
  snapshot: OpenClawConnectionSnapshot,
  state: OpenClawConnectionState,
  trustRequired: boolean
): OpenClawConnectionStatus => {
  if (trustRequired) {
    return "trust-required";
  }

  if (snapshot.isConnected) {
    return "connected";
  }

  switch (state.phase) {
    case "auth-blocked": {
      return "auth-blocked";
    }
    case "connecting": {
      return "connecting";
    }
    case "reconnecting": {
      return "reconnecting";
    }
    default: {
      return state.errorMessage ? "error" : "disconnected";
    }
  }
};

export const OpenClawContext = createContext<OpenClawContextValue | null>(null);

export const useOpenClaw = (): OpenClawContextValue => {
  const value = use(OpenClawContext);
  if (!value) {
    throw new Error("useOpenClaw must be used within an OpenClawProvider.");
  }

  return value;
};

export const OpenClawProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [persistedState, setPersistedStateState] =
    useState<OpenClawPersistedState>(() => getOpenClawState());
  const [connectionSecrets, setConnectionSecrets] =
    useState<OpenClawConnectionSecrets | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<OpenClawConnectionStatus>("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionRuntimeState, setConnectionRuntimeState] =
    useState<OpenClawConnectionState>(() => {
      try {
        return openClawGateway.getConnectionState();
      } catch {
        return DISCONNECTED_STATE;
      }
    });
  const [connectionSnapshot, setConnectionSnapshot] =
    useState<OpenClawConnectionSnapshot>(() => {
      try {
        return openClawGateway.getConnectionSnapshot();
      } catch {
        return DISCONNECTED_SNAPSHOT;
      }
    });
  const [trustPrompt, setTrustPrompt] =
    useState<OpenClawTrustPromptState | null>(null);
  const [agents, setAgents] = useState<OpenClawAgentSummary[]>([]);
  const [slashCommands, setSlashCommands] = useState<OpenClawSlashCommand[]>(
    []
  );
  const [slashCommandsLoading, setSlashCommandsLoading] = useState(false);
  const [slashCommandError, setSlashCommandError] = useState<string | null>(
    null
  );
  const wasConnectedRef = useRef(connectionSnapshot.isConnected);

  const persistState = useCallback(
    (updater: (current: OpenClawPersistedState) => OpenClawPersistedState) => {
      setPersistedStateState((current) => {
        const next = updater(current);
        setOpenClawState(next);
        return getOpenClawState();
      });
    },
    []
  );

  const updateSlashCommandSettings = useCallback(
    (
      updater:
        | OpenClawSlashCommandSettings
        | ((
            current: OpenClawSlashCommandSettings
          ) => OpenClawSlashCommandSettings)
    ) => {
      persistState((current) => ({
        ...current,
        slashCommandSettings:
          typeof updater === "function"
            ? updater(current.slashCommandSettings)
            : updater,
      }));
    },
    [persistState]
  );

  const refreshNativeState = useCallback(() => {
    const snapshot = openClawGateway.getConnectionSnapshot();
    const runtimeState = openClawGateway.getConnectionState();
    setConnectionSnapshot(snapshot);
    setConnectionRuntimeState(runtimeState);
    setConnectionStatus(
      resolveConnectionStatus(snapshot, runtimeState, trustPrompt !== null)
    );
    setConnectionError(runtimeState.errorMessage ?? null);
    return { runtimeState, snapshot };
  }, [trustPrompt]);

  const refreshAgents = useCallback(async () => {
    try {
      const response = await openClawGateway.request(
        "agents.list",
        JSON.stringify({}),
        10_000
      );
      setAgents(parseAgentSummaries(response));
    } catch (error) {
      setAgents([]);
      setConnectionError(readErrorMessage(error));
    }
  }, []);

  const refreshSlashCommands = useCallback(async () => {
    if (!openClawGateway.getConnectionSnapshot().isConnected) {
      setSlashCommands([]);
      setSlashCommandError(null);
      setSlashCommandsLoading(false);
      return;
    }

    setSlashCommandsLoading(true);
    try {
      const commands = await listOpenClawSlashCommands();
      setSlashCommands(commands);
      setSlashCommandError(null);
    } catch (error) {
      setSlashCommands([]);
      setSlashCommandError(readErrorMessage(error));
    } finally {
      setSlashCommandsLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const initialState = getOpenClawState();
      const secrets = await getOpenClawConnectionSecrets();
      const snapshot = openClawGateway.getConnectionSnapshot();
      const runtimeState = openClawGateway.getConnectionState();

      setPersistedStateState(initialState);
      setConnectionSecrets(secrets);
      setConnectionSnapshot(snapshot);
      setConnectionRuntimeState(runtimeState);
      setConnectionStatus(
        resolveConnectionStatus(snapshot, runtimeState, false)
      );
      setConnectionError(runtimeState.errorMessage ?? null);

      if (snapshot.isConnected) {
        try {
          await refreshAgents();
          await refreshSlashCommands();
        } catch {
          // refreshAgents already captures provider-facing error state
        }
      }

      setLoaded(true);
    };

    load();
  }, [refreshAgents, refreshSlashCommands]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const sync = async () => {
      const { snapshot } = refreshNativeState();
      const wasConnected = wasConnectedRef.current;
      const { isConnected } = snapshot;

      if (!wasConnected && isConnected) {
        persistState((current) => ({
          ...current,
          connectionConfig: current.connectionConfig
            ? {
                ...current.connectionConfig,
                lastConnectedAt: Date.now(),
              }
            : current.connectionConfig,
        }));
        try {
          await refreshAgents();
          await refreshSlashCommands();
        } catch {
          // provider-facing error state is handled in refreshAgents
        }
      } else if (wasConnected && !isConnected) {
        setAgents([]);
        setSlashCommands([]);
        setSlashCommandError(null);
        setSlashCommandsLoading(false);
      }

      wasConnectedRef.current = isConnected;
    };
    sync();
    const intervalId = setInterval(() => {
      runSync();
    }, 1500);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    loaded,
    persistState,
    refreshAgents,
    refreshNativeState,
    refreshSlashCommands,
  ]);

  const persistConnectionProfile = useCallback(
    async (
      connectionConfig: OpenClawConnectionConfig,
      secrets: OpenClawConnectionSecrets | null
    ) => {
      persistState((current) => ({
        ...current,
        connectionConfig,
      }));
      await setOpenClawConnectionSecrets(secrets);
      setConnectionSecrets(secrets);
    },
    [persistState]
  );

  const finalizeConnect = useCallback(
    async (
      connectionConfig: OpenClawConnectionConfig,
      secrets: OpenClawConnectionSecrets | null
    ) => {
      await persistConnectionProfile(connectionConfig, secrets);
      setConnectionError(null);
      setConnectionStatus("connecting");
      setTrustPrompt(null);

      const locale = getLocales()[0]?.languageTag ?? "en-US";

      openClawGateway.connect(
        JSON.stringify({
          auth: secrets ?? {},
          endpoint: connectionConfig.endpoint,
          endpointId: connectionConfig.endpointId,
          locale,
          role: "operator",
          scopes: [...OPERATOR_SCOPES],
        })
      );

      const { snapshot } = refreshNativeState();
      if (snapshot.isConnected) {
        persistState((current) => ({
          ...current,
          connectionConfig: current.connectionConfig
            ? {
                ...current.connectionConfig,
                lastConnectedAt: Date.now(),
              }
            : current.connectionConfig,
        }));
        await refreshAgents();
        await refreshSlashCommands();
      } else {
        setAgents([]);
        setSlashCommands([]);
        setSlashCommandError(null);
        setSlashCommandsLoading(false);
      }
    },
    [
      persistConnectionProfile,
      persistState,
      refreshAgents,
      refreshNativeState,
      refreshSlashCommands,
    ]
  );

  const maybeRequestTlsTrust = useCallback(
    async (
      connectionConfig: OpenClawConnectionConfig,
      secrets: OpenClawConnectionSecrets | null
    ): Promise<boolean> => {
      if (!connectionConfig.endpoint.tls) {
        return false;
      }

      const trustedFingerprint = openClawGateway.getTrustedFingerprint(
        connectionConfig.endpointId
      );
      if (trustedFingerprint) {
        return false;
      }

      const probe = await openClawGateway.probeTlsFingerprint(
        connectionConfig.endpoint.host,
        connectionConfig.endpoint.port
      );

      if (typeof probe.fingerprintSha256 === "string") {
        setTrustPrompt({
          connectionConfig,
          connectionSecrets: secrets ?? {},
          endpoint: connectionConfig.endpoint,
          endpointId: connectionConfig.endpointId,
          fingerprintSha256: probe.fingerprintSha256,
        });
        setConnectionStatus("trust-required");
        setConnectionError(null);
        return true;
      }

      throw new Error(
        `TLS fingerprint probe failed${probe.failureCode ? `: ${probe.failureCode}` : "."}`
      );
    },
    []
  );

  const beginConnect = useCallback(
    async (
      endpoint: OpenClawEndpointConfig,
      mode: OpenClawConnectionMode,
      secrets: OpenClawConnectionSecrets | null
    ) => {
      const connectionConfig: OpenClawConnectionConfig = {
        endpoint,
        endpointId: buildOpenClawEndpointId(endpoint),
        mode,
      };

      await persistConnectionProfile(connectionConfig, secrets);

      const needsTrust = await maybeRequestTlsTrust(connectionConfig, secrets);
      if (needsTrust) {
        return;
      }

      await finalizeConnect(connectionConfig, secrets);
    },
    [finalizeConnect, maybeRequestTlsTrust, persistConnectionProfile]
  );

  const connectWithSetupCode = useCallback(
    async (rawSetupCode: string) => {
      setConnectionError(null);

      const parsed = openClawGateway.parseSetupCode(rawSetupCode.trim());
      if (!parsed) {
        throw new Error("Invalid OpenClaw setup code.");
      }

      try {
        await beginConnect(parsed.endpoint, "setup-code", {
          bootstrapToken: parsed.bootstrapToken,
          password: parsed.password,
          token: parsed.token,
        });
      } catch (error) {
        const { runtimeState, snapshot } = refreshNativeState();
        setConnectionStatus(
          resolveConnectionStatus(snapshot, runtimeState, trustPrompt !== null)
        );
        setConnectionError(
          runtimeState.errorMessage ?? readErrorMessage(error)
        );
        throw error;
      }
    },
    [beginConnect, refreshNativeState, trustPrompt]
  );

  const connectManual = useCallback(
    async (input: ConnectManualInput) => {
      setConnectionError(null);

      const endpoint = openClawGateway.parseEndpoint(input.endpoint.trim());
      if (!endpoint) {
        throw new Error("Invalid OpenClaw endpoint.");
      }

      try {
        await beginConnect(endpoint, "manual", {
          bootstrapToken: input.bootstrapToken?.trim() || undefined,
          password: input.password?.trim() || undefined,
          token: input.token?.trim() || undefined,
        });
      } catch (error) {
        const { runtimeState, snapshot } = refreshNativeState();
        setConnectionStatus(
          resolveConnectionStatus(snapshot, runtimeState, trustPrompt !== null)
        );
        setConnectionError(
          runtimeState.errorMessage ?? readErrorMessage(error)
        );
        throw error;
      }
    },
    [beginConnect, refreshNativeState, trustPrompt]
  );

  const acceptTlsTrust = useCallback(async () => {
    if (!trustPrompt) {
      return;
    }

    openClawGateway.saveTrustedFingerprint(
      trustPrompt.endpointId,
      trustPrompt.fingerprintSha256
    );

    try {
      await finalizeConnect(
        trustPrompt.connectionConfig,
        trustPrompt.connectionSecrets
      );
    } catch (error) {
      const { runtimeState, snapshot } = refreshNativeState();
      setConnectionStatus(
        resolveConnectionStatus(snapshot, runtimeState, false)
      );
      setConnectionError(runtimeState.errorMessage ?? readErrorMessage(error));
      throw error;
    }
  }, [finalizeConnect, refreshNativeState, trustPrompt]);

  const declineTlsTrust = useCallback(() => {
    setTrustPrompt(null);
    setConnectionStatus("disconnected");
  }, []);

  const disconnect = useCallback(() => {
    openClawGateway.disconnect();
    setAgents([]);
    setSlashCommands([]);
    setSlashCommandError(null);
    setSlashCommandsLoading(false);
    setTrustPrompt(null);
    setConnectionError(null);
    setConnectionRuntimeState(DISCONNECTED_STATE);
    setConnectionSnapshot(openClawGateway.getConnectionSnapshot());
    setConnectionStatus("disconnected");
    wasConnectedRef.current = false;
  }, []);

  const reconnect = useCallback(async () => {
    if (!persistedState.connectionConfig) {
      return;
    }

    setConnectionError(null);
    setConnectionStatus("reconnecting");

    try {
      openClawGateway.reconnect();
      refreshNativeState();
    } catch {
      await finalizeConnect(persistedState.connectionConfig, connectionSecrets);
    }
  }, [
    connectionSecrets,
    finalizeConnect,
    persistedState.connectionConfig,
    refreshNativeState,
  ]);

  const createTopic = useCallback(
    async (draft: OpenClawTopicDraft): Promise<OpenClawTopic> => {
      const label = normalizeOpenClawTopicLabel(draft.label);
      if (!label) {
        throw new Error("Topic label cannot be empty.");
      }

      if (draft.agentId && !connectionSnapshot.isConnected) {
        throw new Error(
          "Agent-bound topics require an active OpenClaw connection."
        );
      }

      const identity = await createTopicIdentity();
      const topic: OpenClawTopic = {
        agentId: draft.agentId,
        createdAt: Date.now(),
        id: identity.id,
        label,
        sessionKey: identity.sessionKey,
      };

      persistState((current) => ({
        ...current,
        activeTopicId: topic.id,
        topics: [...current.topics, topic],
      }));

      return topic;
    },
    [connectionSnapshot.isConnected, persistState]
  );

  const updateTopic = useCallback(
    (topicId: string, draft: Pick<OpenClawTopicDraft, "label">) => {
      const label = normalizeOpenClawTopicLabel(draft.label);
      if (!label) {
        throw new Error("Topic label cannot be empty.");
      }

      persistState((current) => {
        const topic = current.topics.find((entry) => entry.id === topicId);
        if (!topic) {
          return current;
        }

        if (topic.isBuiltIn) {
          throw new Error("The built-in Chat topic cannot be edited.");
        }

        return {
          ...current,
          topics: current.topics.map((entry) =>
            entry.id === topicId ? { ...entry, label } : entry
          ),
        };
      });
    },
    [persistState]
  );

  const deleteTopic = useCallback(
    (topicId: string) => {
      if (topicId === OPENCLAW_BUILT_IN_TOPIC_ID) {
        throw new Error("The built-in Chat topic cannot be deleted.");
      }

      persistState((current) => {
        const nextTopics = current.topics.filter(
          (topic) => topic.id !== topicId
        );

        return {
          ...current,
          activeTopicId:
            current.activeTopicId === topicId
              ? OPENCLAW_BUILT_IN_TOPIC_ID
              : current.activeTopicId,
          pendingResumeIntent:
            current.pendingResumeIntent?.topicId === topicId
              ? null
              : current.pendingResumeIntent,
          topics: nextTopics.length > 0 ? nextTopics : [BUILT_IN_CHAT_TOPIC],
        };
      });
    },
    [persistState]
  );

  const setActiveTopic = useCallback(
    (topicId: string) => {
      persistState((current) => {
        if (!current.topics.some((topic) => topic.id === topicId)) {
          return current;
        }

        if (current.activeTopicId === topicId) {
          return current;
        }

        return {
          ...current,
          activeTopicId: topicId,
          topics: current.topics.map((topic) =>
            topic.id === topicId
              ? {
                  ...topic,
                  lastUsedAt: Date.now(),
                }
              : topic
          ),
        };
      });
    },
    [persistState]
  );

  const beginPendingResume = useCallback(
    (intent: Omit<OpenClawPendingResumeIntent, "createdAt">) => {
      persistState((current) => ({
        ...current,
        pendingResumeIntent: {
          ...intent,
          createdAt: Date.now(),
        },
      }));
    },
    [persistState]
  );

  const clearPendingResume = useCallback(() => {
    persistState((current) => ({
      ...current,
      pendingResumeIntent: null,
    }));
  }, [persistState]);

  const activeTopic =
    persistedState.topics.find(
      (topic) => topic.id === persistedState.activeTopicId
    ) ?? BUILT_IN_CHAT_TOPIC;

  const resolveTopicSessionKey = useCallback(
    (topicId: string): string | undefined => {
      const topic = persistedState.topics.find((entry) => entry.id === topicId);
      if (!topic) {
        return undefined;
      }

      if (topic.id === OPENCLAW_BUILT_IN_TOPIC_ID) {
        return connectionSnapshot.mainSessionKey ?? topic.sessionKey;
      }

      return resolveOpenClawTopicSessionKey(topic);
    },
    [connectionSnapshot.mainSessionKey, persistedState.topics]
  );

  const value = useMemo<OpenClawContextValue>(
    () => ({
      actions: {
        acceptTlsTrust,
        beginPendingResume,
        clearPendingResume,
        connectManual,
        connectWithSetupCode,
        createTopic,
        declineTlsTrust,
        deleteTopic,
        disconnect,
        reconnect,
        refreshAgents,
        refreshSlashCommands,
        setActiveTopic,
        updateSlashCommandSettings,
        updateTopic,
      },
      activeTopic,
      activeTopicId: persistedState.activeTopicId,
      agents,
      connectionConfig: persistedState.connectionConfig,
      connectionError,
      connectionRuntimeState,
      connectionSnapshot,
      connectionStatus,
      getTopicChatPath,
      hasSavedConnectionSecrets:
        hasOpenClawConnectionSecrets(connectionSecrets),
      loaded,
      pendingResumeIntent: persistedState.pendingResumeIntent,
      resolveTopicSessionKey,
      slashCommandError,
      slashCommandSettings: persistedState.slashCommandSettings,
      slashCommands,
      slashCommandsLoading,
      topics: persistedState.topics,
      trustPrompt,
    }),
    [
      acceptTlsTrust,
      activeTopic,
      agents,
      beginPendingResume,
      clearPendingResume,
      connectManual,
      connectWithSetupCode,
      connectionError,
      connectionRuntimeState,
      connectionSecrets,
      connectionSnapshot,
      connectionStatus,
      createTopic,
      declineTlsTrust,
      deleteTopic,
      disconnect,
      loaded,
      persistedState.activeTopicId,
      persistedState.connectionConfig,
      persistedState.pendingResumeIntent,
      persistedState.slashCommandSettings,
      persistedState.topics,
      refreshAgents,
      refreshSlashCommands,
      reconnect,
      resolveTopicSessionKey,
      setActiveTopic,
      slashCommandError,
      slashCommands,
      slashCommandsLoading,
      trustPrompt,
      updateSlashCommandSettings,
      updateTopic,
    ]
  );

  if (!loaded) {
    return null;
  }

  return <OpenClawContext value={value}>{children}</OpenClawContext>;
};
