import { Platform } from "react-native";
import { NitroModules } from "react-native-nitro-modules";

import type { OpenClawGateway } from "./specs/openclaw-gateway.nitro";

const createUnsupportedError = () =>
  new Error("OpenClaw gateway is only supported on Android in v1.");

const unsupported = (): never => {
  throw createUnsupportedError();
};

const noop = (): void => {
  /* no-op */
};

const getMissingValue = <T>(): T | undefined =>
  Reflect.get({}, "missing") as T | undefined;

const createUnsupportedModule = (): OpenClawGateway => ({
  clearTrustedFingerprint: noop,
  connect: () => unsupported(),
  disconnect: noop,
  dispose: noop,
  equals: () => false,
  getConnectionSnapshot: () => ({
    endpointId: undefined,
    endpointUrl: undefined,
    isConnected: false,
    mainSessionKey: undefined,
  }),
  getConnectionState: () => ({
    authBlocked: false,
    errorMessage: undefined,
    phase: "disconnected",
    statusMessage: "Offline",
  }),
  getTrustedFingerprint: () => getMissingValue<string>(),
  name: "OpenClawGateway",
  parseEndpoint: () => getMissingValue(),
  parseSetupCode: () => getMissingValue(),
  probeTlsFingerprint: () =>
    Promise.resolve({
      failureCode: "unsupported_platform",
      fingerprintSha256: undefined,
    }),
  reconnect: () => unsupported(),
  request: () => Promise.reject(createUnsupportedError()),
  saveTrustedFingerprint: noop,
});

export const openClawGateway: OpenClawGateway =
  Platform.OS === "android"
    ? NitroModules.createHybridObject<OpenClawGateway>("OpenClawGateway")
    : createUnsupportedModule();

export type {
  OpenClawConnectionState,
  OpenClawConnectionSnapshot,
  OpenClawEndpointConfig,
  OpenClawGateway,
  OpenClawSetupCodeConfig,
  OpenClawTlsProbeResult,
} from "./specs/openclaw-gateway.nitro";
