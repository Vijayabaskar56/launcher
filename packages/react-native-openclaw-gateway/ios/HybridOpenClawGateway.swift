import Foundation
import NitroModules

class HybridOpenClawGateway: HybridOpenClawGatewaySpec {
  func parseSetupCode(raw: String) throws -> OpenClawSetupCodeConfig? {
    return nil
  }

  func parseEndpoint(raw: String) throws -> OpenClawEndpointConfig? {
    return nil
  }

  func probeTlsFingerprint(host: String, port: Double) throws -> Promise<OpenClawTlsProbeResult> {
    throw NSError(
      domain: "OpenClawGateway",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "OpenClaw gateway is only supported on Android in v1."]
    )
  }

  func saveTrustedFingerprint(stableId: String, fingerprintSha256: String) throws {}

  func getTrustedFingerprint(stableId: String) throws -> String? {
    return nil
  }

  func clearTrustedFingerprint(stableId: String) throws {}

  func connect(configJson: String) throws {
    throw NSError(
      domain: "OpenClawGateway",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "OpenClaw gateway is only supported on Android in v1."]
    )
  }

  func disconnect() throws {}

  func reconnect() throws {
    throw NSError(
      domain: "OpenClawGateway",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "OpenClaw gateway is only supported on Android in v1."]
    )
  }

  func getConnectionSnapshot() throws -> OpenClawConnectionSnapshot {
    return OpenClawConnectionSnapshot(
      isConnected: false,
      endpointId: nil,
      endpointUrl: nil,
      mainSessionKey: nil
    )
  }

  func getConnectionState() throws -> OpenClawConnectionState {
    return OpenClawConnectionState(
      authBlocked: false,
      errorMessage: nil,
      phase: "disconnected",
      statusMessage: "Offline"
    )
  }

  func request(method: String, paramsJson: String?, timeoutMs: Double?) throws -> Promise<String> {
    throw NSError(
      domain: "OpenClawGateway",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "OpenClaw gateway is only supported on Android in v1."]
    )
  }
}
