import type { HybridObject } from "react-native-nitro-modules";

export interface OpenClawEndpointConfig {
  host: string;
  port: number;
  tls: boolean;
  displayUrl: string;
}

export interface OpenClawSetupCodeConfig {
  url: string;
  bootstrapToken: string | undefined;
  token: string | undefined;
  password: string | undefined;
  endpoint: OpenClawEndpointConfig;
}

export interface OpenClawTlsProbeResult {
  fingerprintSha256: string | undefined;
  failureCode: string | undefined;
}

export interface OpenClawConnectionSnapshot {
  isConnected: boolean;
  endpointId: string | undefined;
  endpointUrl: string | undefined;
  mainSessionKey: string | undefined;
}

export interface OpenClawConnectionState {
  authBlocked: boolean;
  errorMessage: string | undefined;
  phase: string;
  statusMessage: string | undefined;
}

export interface OpenClawGateway extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  parseSetupCode(raw: string): OpenClawSetupCodeConfig | undefined;
  parseEndpoint(raw: string): OpenClawEndpointConfig | undefined;
  probeTlsFingerprint(
    host: string,
    port: number
  ): Promise<OpenClawTlsProbeResult>;
  saveTrustedFingerprint(stableId: string, fingerprintSha256: string): void;
  getTrustedFingerprint(stableId: string): string | undefined;
  clearTrustedFingerprint(stableId: string): void;
  connect(configJson: string): void;
  disconnect(): void;
  reconnect(): void;
  getConnectionSnapshot(): OpenClawConnectionSnapshot;
  getConnectionState(): OpenClawConnectionState;
  request(
    rpcMethod: string,
    paramsJson?: string,
    timeoutMs?: number
  ): Promise<string>;
}
