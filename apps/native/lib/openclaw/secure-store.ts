import * as SecureStore from "expo-secure-store";

import type { OpenClawConnectionSecrets } from "@/types/openclaw";

const OPENCLAW_CONNECTION_SECRETS_KEY = "openclaw-connection-secrets";

const sanitizeConnectionSecrets = (
  value: unknown
): OpenClawConnectionSecrets | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<OpenClawConnectionSecrets>;
  const secrets: OpenClawConnectionSecrets = {};

  if (typeof candidate.bootstrapToken === "string") {
    secrets.bootstrapToken = candidate.bootstrapToken;
  }

  if (typeof candidate.password === "string") {
    secrets.password = candidate.password;
  }

  if (typeof candidate.token === "string") {
    secrets.token = candidate.token;
  }

  return Object.keys(secrets).length > 0 ? secrets : null;
};

export const getOpenClawConnectionSecrets =
  async (): Promise<OpenClawConnectionSecrets | null> => {
    try {
      const raw = await SecureStore.getItemAsync(
        OPENCLAW_CONNECTION_SECRETS_KEY
      );
      if (!raw) {
        return null;
      }

      return sanitizeConnectionSecrets(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  };

export const setOpenClawConnectionSecrets = async (
  secrets: OpenClawConnectionSecrets | null
): Promise<void> => {
  if (!secrets) {
    await SecureStore.deleteItemAsync(OPENCLAW_CONNECTION_SECRETS_KEY);
    return;
  }

  await SecureStore.setItemAsync(
    OPENCLAW_CONNECTION_SECRETS_KEY,
    JSON.stringify(secrets)
  );
};
