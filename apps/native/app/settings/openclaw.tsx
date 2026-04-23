import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Input, Label, TextField, useThemeColor } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { OpenClawSlashCommandSettingsSection } from "@/components/openclaw/slash-command-settings-section";
import { PreferenceCategory } from "@/components/settings/preference-category";
import { SwitchPreference } from "@/components/settings/switch-preference";
import { useOpenClaw } from "@/context/openclaw";
import { useThemeOverrides } from "@/context/theme-overrides";

type ConnectionEntryMode = "manual" | "setup-code";
type ManualAuthMode = "bootstrap-token" | "none" | "password" | "token";

const AUTH_MODE_OPTIONS = [
  {
    description: "Open endpoint with no explicit credential",
    id: "none",
    label: "None",
  },
  {
    description: "Use an operator token",
    id: "token",
    label: "Token",
  },
  {
    description: "Use a bootstrap token",
    id: "bootstrap-token",
    label: "Bootstrap",
  },
  {
    description: "Use an operator password",
    id: "password",
    label: "Password",
  },
] as const satisfies {
  description: string;
  id: ManualAuthMode;
  label: string;
}[];

const buildManualEndpoint = (
  host: string,
  port: string,
  tls: boolean
): string => `${tls ? "wss" : "ws"}://${host.trim()}:${port.trim()}`;

const getConnectionStatusLabel = (status: string): string => {
  switch (status) {
    case "auth-blocked": {
      return "Reauthentication Required";
    }
    case "connected": {
      return "Connected";
    }
    case "connecting": {
      return "Connecting";
    }
    case "trust-required": {
      return "Trust Required";
    }
    case "error": {
      return "Needs Attention";
    }
    case "reconnecting": {
      return "Reconnecting";
    }
    default: {
      return "Disconnected";
    }
  }
};

const getConnectionStatusIcon = (
  status: string
): keyof typeof MaterialIcons.glyphMap => {
  switch (status) {
    case "auth-blocked": {
      return "lock";
    }
    case "connected": {
      return "cloud-done";
    }
    case "connecting":
    case "reconnecting": {
      return "sync";
    }
    case "trust-required": {
      return "verified-user";
    }
    default: {
      return "cloud-off";
    }
  }
};

const ConnectionField = ({
  description,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  secureTextEntry,
  value,
}: {
  description?: string;
  keyboardType?:
    | "ascii-capable"
    | "decimal-pad"
    | "default"
    | "email-address"
    | "numeric"
    | "numbers-and-punctuation"
    | "phone-pad"
    | "twitter"
    | "url"
    | "visible-password";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) => {
  const [border, foreground, muted, surface] = useThemeColor([
    "border",
    "foreground",
    "muted",
    "surface",
  ] as const);
  const { smallRadius } = useThemeOverrides();

  return (
    <TextField>
      <View style={{ gap: 8 }}>
        <Label>{label}</Label>
        <Input
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={muted}
          secureTextEntry={secureTextEntry}
          style={{
            backgroundColor: surface,
            borderColor: border,
            borderCurve: "continuous",
            borderRadius: smallRadius,
            borderWidth: 1,
            color: foreground,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
          value={value}
        />
        {description ? (
          <Text
            selectable
            style={{
              color: muted,
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </TextField>
  );
};

const ModeButton = ({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) => {
  const accentForeground = useThemeColor("accent-foreground");
  const defaultForeground = useThemeColor("default-foreground");

  return (
    <Button onPress={onPress} variant={active ? "primary" : "secondary"}>
      <MaterialIcons
        name={icon}
        size={18}
        color={active ? accentForeground : defaultForeground}
      />
      <Button.Label>{label}</Button.Label>
    </Button>
  );
};

const AuthModeButton = ({
  active,
  handlePress,
  label,
}: {
  active: boolean;
  handlePress: () => void;
  label: string;
}) => (
  <Button onPress={handlePress} variant={active ? "primary" : "secondary"}>
    <Button.Label>{label}</Button.Label>
  </Button>
);

// Connection setup is still a single screen; new feature panels should stay extracted.
// eslint-disable-next-line complexity
export default function OpenClawSettings() {
  const router = useRouter();
  const {
    actions,
    connectionConfig,
    connectionError,
    connectionRuntimeState,
    connectionStatus,
    getTopicChatPath,
    hasSavedConnectionSecrets,
    pendingResumeIntent,
    topics,
    trustPrompt,
  } = useOpenClaw();
  const [defaultColor, foreground, muted, surface] = useThemeColor([
    "default",
    "foreground",
    "muted",
    "surface",
  ] as const);
  const { cardRadius, fontFamily } = useThemeOverrides();

  const [busy, setBusy] = useState(false);
  const [entryMode, setEntryMode] = useState<ConnectionEntryMode>(
    () => connectionConfig?.mode ?? "setup-code"
  );
  const [setupCode, setSetupCode] = useState("");
  const [manualHost, setManualHost] = useState(
    () => connectionConfig?.endpoint.host ?? ""
  );
  const [manualPort, setManualPort] = useState(
    () => connectionConfig?.endpoint.port.toString() ?? "443"
  );
  const [manualTls, setManualTls] = useState(
    () => connectionConfig?.endpoint.tls ?? true
  );
  const [manualAuthMode, setManualAuthMode] = useState<ManualAuthMode>("token");
  const [manualCredential, setManualCredential] = useState("");

  const pendingTopicLabel = useMemo(() => {
    if (!pendingResumeIntent) {
      return null;
    }

    return (
      topics.find((topic) => topic.id === pendingResumeIntent.topicId)?.label ??
      "Chat"
    );
  }, [pendingResumeIntent, topics]);

  const handleConnectWithSetupCode = useCallback(async () => {
    if (!setupCode.trim()) {
      return;
    }

    setBusy(true);
    try {
      await actions.connectWithSetupCode(setupCode);
      if (pendingResumeIntent) {
        router.replace(getTopicChatPath(pendingResumeIntent.topicId) as never);
      }
    } finally {
      setBusy(false);
    }
  }, [actions, getTopicChatPath, pendingResumeIntent, router, setupCode]);

  const handleConnectManual = useCallback(async () => {
    if (!manualHost.trim() || !manualPort.trim()) {
      return;
    }

    const input = {
      bootstrapToken:
        manualAuthMode === "bootstrap-token"
          ? manualCredential.trim() || undefined
          : undefined,
      endpoint: buildManualEndpoint(manualHost, manualPort, manualTls),
      password:
        manualAuthMode === "password"
          ? manualCredential.trim() || undefined
          : undefined,
      token:
        manualAuthMode === "token"
          ? manualCredential.trim() || undefined
          : undefined,
    };

    setBusy(true);
    try {
      await actions.connectManual(input);
      if (pendingResumeIntent) {
        router.replace(getTopicChatPath(pendingResumeIntent.topicId) as never);
      }
    } finally {
      setBusy(false);
    }
  }, [
    actions,
    getTopicChatPath,
    manualAuthMode,
    manualCredential,
    manualHost,
    manualPort,
    manualTls,
    pendingResumeIntent,
    router,
  ]);

  const handleAcceptTrust = useCallback(async () => {
    setBusy(true);
    try {
      await actions.acceptTlsTrust();
      if (pendingResumeIntent) {
        router.replace(getTopicChatPath(pendingResumeIntent.topicId) as never);
      }
    } finally {
      setBusy(false);
    }
  }, [actions, getTopicChatPath, pendingResumeIntent, router]);

  const handleDisconnect = useCallback(() => {
    actions.disconnect();
  }, [actions]);

  const handleReconnect = useCallback(async () => {
    setBusy(true);
    try {
      await actions.reconnect();
    } finally {
      setBusy(false);
    }
  }, [actions]);

  const handleDeclineTrust = useCallback(() => {
    actions.declineTlsTrust();
  }, [actions]);

  const handleSelectSetupCodeMode = useCallback(() => {
    setEntryMode("setup-code");
  }, []);

  const handleSelectManualMode = useCallback(() => {
    setEntryMode("manual");
  }, []);

  const authModeHandlers = useMemo<Record<ManualAuthMode, () => void>>(
    () => ({
      "bootstrap-token": () => {
        setManualAuthMode("bootstrap-token");
      },
      none: () => {
        setManualAuthMode("none");
      },
      password: () => {
        setManualAuthMode("password");
      },
      token: () => {
        setManualAuthMode("token");
      },
    }),
    []
  );

  const credentialLabel = useMemo(() => {
    if (manualAuthMode === "bootstrap-token") {
      return "Bootstrap token";
    }

    if (manualAuthMode === "password") {
      return "Password";
    }

    if (manualAuthMode === "token") {
      return "Operator token";
    }

    return "";
  }, [manualAuthMode]);

  const credentialPlaceholder = useMemo(() => {
    if (manualAuthMode === "bootstrap-token") {
      return "paste bootstrap token";
    }

    if (manualAuthMode === "password") {
      return "enter operator password";
    }

    if (manualAuthMode === "token") {
      return "paste operator token";
    }

    return "";
  }, [manualAuthMode]);

  const statusDetail = useMemo(() => {
    if (connectionStatus === "trust-required") {
      return "Review and trust the TLS fingerprint before the launcher opens the socket.";
    }

    return connectionRuntimeState.statusMessage?.trim() || null;
  }, [connectionRuntimeState.statusMessage, connectionStatus]);

  const canReconnect =
    Boolean(connectionConfig) &&
    connectionStatus !== "connected" &&
    connectionStatus !== "connecting" &&
    connectionStatus !== "trust-required";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 18, paddingBottom: 40, paddingTop: 8 }}
    >
      {pendingResumeIntent ? (
        <PreferenceCategory
          description="The app held onto the message that triggered OpenClaw. Once the connection is healthy, it will resume directly into that topic."
          title="Pending Resume"
        >
          <View
            style={{
              gap: 10,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <Text
              selectable
              style={{
                color: foreground,
                fontFamily,
                fontSize: 16,
                fontWeight: "600",
                letterSpacing: -0.2,
              }}
            >
              {pendingTopicLabel}
            </Text>
            <Text
              selectable
              style={{
                color: muted,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {pendingResumeIntent.message}
            </Text>
          </View>
        </PreferenceCategory>
      ) : null}

      <PreferenceCategory
        description="The provider keeps one persistent OpenClaw connection profile plus the current transport state."
        title="Connection Status"
      >
        <View
          style={{
            gap: 14,
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: defaultColor,
              borderCurve: "continuous",
              borderRadius: cardRadius,
              flexDirection: "row",
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: surface,
                borderCurve: "continuous",
                borderRadius: 999,
                height: 36,
                justifyContent: "center",
                width: 36,
              }}
            >
              <MaterialIcons
                name={getConnectionStatusIcon(connectionStatus)}
                size={20}
                color={foreground}
              />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                selectable
                style={{
                  color: foreground,
                  fontFamily,
                  fontSize: 16,
                  fontWeight: "600",
                  letterSpacing: -0.2,
                }}
              >
                {getConnectionStatusLabel(connectionStatus)}
              </Text>
              <Text
                selectable
                style={{
                  color: muted,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {connectionConfig?.endpoint.displayUrl ??
                  "No OpenClaw endpoint configured yet."}
              </Text>
              {statusDetail ? (
                <Text
                  selectable
                  style={{
                    color: muted,
                    fontSize: 12,
                    lineHeight: 17,
                    marginTop: 2,
                  }}
                >
                  {statusDetail}
                </Text>
              ) : null}
            </View>
          </View>

          {connectionStatus === "auth-blocked" ? (
            <View
              style={{
                backgroundColor: defaultColor,
                borderCurve: "continuous",
                borderRadius: cardRadius,
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}
            >
              <Text
                selectable
                style={{
                  color: foreground,
                  fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Session paused
              </Text>
              <Text
                selectable
                style={{
                  color: muted,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                The native gateway client stopped automatic reconnects because
                the server asked for new credentials or pairing approval. Update
                the credential fields below or retry once the server state is
                fixed.
              </Text>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: foreground,
                fontFamily,
                fontSize: 14,
                fontWeight: "500",
              }}
            >
              Saved credentials
            </Text>
            <Text
              selectable
              style={{
                color: muted,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {hasSavedConnectionSecrets
                ? "Stored securely for the current connection profile."
                : "No credential is currently stored in secure storage."}
            </Text>
          </View>

          {connectionError ? (
            <View
              style={{
                backgroundColor: defaultColor,
                borderCurve: "continuous",
                borderRadius: cardRadius,
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}
            >
              <Text
                selectable
                style={{
                  color: foreground,
                  fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {connectionStatus === "auth-blocked"
                  ? "Auth details"
                  : "Latest error"}
              </Text>
              <Text
                selectable
                style={{
                  color: muted,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {connectionError}
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 12 }}>
            {canReconnect ? (
              <View style={{ flex: 1 }}>
                <Button
                  isDisabled={busy}
                  onPress={handleReconnect}
                  variant="secondary"
                >
                  <MaterialIcons name="sync" size={18} color={foreground} />
                  <Button.Label>
                    {busy ? "Retrying..." : "Retry Connection"}
                  </Button.Label>
                </Button>
              </View>
            ) : null}

            {connectionStatus === "connected" ||
            connectionStatus === "reconnecting" ||
            connectionStatus === "auth-blocked" ? (
              <View style={{ flex: 1 }}>
                <Button onPress={handleDisconnect} variant="danger-soft">
                  <MaterialIcons name="link-off" size={18} color={foreground} />
                  <Button.Label>Disconnect</Button.Label>
                </Button>
              </View>
            ) : null}
          </View>
        </View>
      </PreferenceCategory>

      <OpenClawSlashCommandSettingsSection />

      {trustPrompt ? (
        <PreferenceCategory
          description="TLS endpoints need a pinned fingerprint before the launcher will trust the socket."
          title="Trust Confirmation"
        >
          <View
            style={{
              gap: 14,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <Text
              selectable
              style={{
                color: foreground,
                fontFamily,
                fontSize: 15,
                fontWeight: "600",
                lineHeight: 22,
              }}
            >
              Review the fingerprint for {trustPrompt.endpoint.displayUrl}
            </Text>
            <Text
              selectable
              style={{
                color: muted,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {trustPrompt.fingerprintSha256}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  isDisabled={busy}
                  onPress={handleAcceptTrust}
                  variant="primary"
                >
                  <MaterialIcons
                    name="verified-user"
                    size={18}
                    color="#ffffff"
                  />
                  <Button.Label>Trust Fingerprint</Button.Label>
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  isDisabled={busy}
                  onPress={handleDeclineTrust}
                  variant="secondary"
                >
                  <MaterialIcons name="close" size={18} color={foreground} />
                  <Button.Label>Cancel</Button.Label>
                </Button>
              </View>
            </View>
          </View>
        </PreferenceCategory>
      ) : null}

      <PreferenceCategory
        description="Pick the connection flow that matches what the OpenClaw server gave you."
        title="Connection Mode"
      >
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <ModeButton
              active={entryMode === "setup-code"}
              icon="qr-code-2"
              label="Setup Code"
              onPress={handleSelectSetupCodeMode}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ModeButton
              active={entryMode === "manual"}
              icon="dns"
              label="Manual"
              onPress={handleSelectManualMode}
            />
          </View>
        </View>
      </PreferenceCategory>

      {entryMode === "setup-code" ? (
        <PreferenceCategory
          description="Paste the base64 setup payload from OpenClaw. The provider will parse the endpoint and any included credential fields."
          title="Setup Code"
        >
          <View
            style={{
              gap: 14,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <ConnectionField
              description="Setup codes can include the endpoint plus operator bootstrap credentials."
              label="Encoded setup code"
              onChangeText={setSetupCode}
              placeholder="paste setup code"
              value={setupCode}
            />
            <Button
              isDisabled={busy || setupCode.trim().length === 0}
              onPress={handleConnectWithSetupCode}
              variant="primary"
            >
              <MaterialIcons name="bolt" size={18} color="#ffffff" />
              <Button.Label>
                {busy ? "Connecting..." : "Connect With Setup Code"}
              </Button.Label>
            </Button>
          </View>
        </PreferenceCategory>
      ) : (
        <PreferenceCategory
          description="Manual mode is useful when you only have a host, port, and operator credential."
          title="Manual Endpoint"
        >
          <View
            style={{
              gap: 16,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <ConnectionField
              label="Host"
              onChangeText={setManualHost}
              placeholder="gateway.example.com"
              value={manualHost}
            />
            <ConnectionField
              keyboardType="numeric"
              label="Port"
              onChangeText={setManualPort}
              placeholder="443"
              value={manualPort}
            />
            <SwitchPreference
              icon="lock"
              onValueChange={setManualTls}
              summary="Required for remote hosts unless the endpoint is local or private-LAN."
              title="Use TLS"
              value={manualTls}
            />

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
                Credential Mode
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {AUTH_MODE_OPTIONS.map((option) => (
                  <AuthModeButton
                    active={manualAuthMode === option.id}
                    handlePress={authModeHandlers[option.id]}
                    key={option.id}
                    label={option.label}
                  />
                ))}
              </View>
              <Text
                selectable
                style={{
                  color: muted,
                  fontSize: 12,
                  lineHeight: 17,
                }}
              >
                {
                  AUTH_MODE_OPTIONS.find(
                    (option) => option.id === manualAuthMode
                  )?.description
                }
              </Text>
            </View>

            {manualAuthMode === "none" ? null : (
              <ConnectionField
                label={credentialLabel}
                onChangeText={setManualCredential}
                placeholder={credentialPlaceholder}
                secureTextEntry={manualAuthMode === "password"}
                value={manualCredential}
              />
            )}

            <Button
              isDisabled={busy || !manualHost.trim() || !manualPort.trim()}
              onPress={handleConnectManual}
              variant="primary"
            >
              <MaterialIcons name="cable" size={18} color="#ffffff" />
              <Button.Label>
                {busy ? "Connecting..." : "Connect Manually"}
              </Button.Label>
            </Button>
          </View>
        </PreferenceCategory>
      )}
    </ScrollView>
  );
}
