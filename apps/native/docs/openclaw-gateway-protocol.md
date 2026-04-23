# OpenClaw Gateway Protocol Notes For Launcher

This note freezes the launcher-facing contract from the current OpenClaw
gateway/server sources and the Android reference client.

## Sources Used

- `apps/android/app/.../GatewayConfigResolver.kt`
- `apps/android/app/.../GatewayHostSecurity.kt`
- `apps/android/app/.../GatewaySession.kt`
- `apps/android/app/.../ChatController.kt`
- `apps/android/app/.../NodeRuntime.kt`
- `src/gateway/server-methods/chat.ts`
- `src/gateway/server-methods/agents.ts`
- `src/gateway/server-methods/sessions.ts`
- `src/gateway/method-scopes.ts`
- `src/routing/session-key.ts`

## Confirmed Launcher Contract

### Endpoint and setup-code parsing

- Setup codes are base64url-encoded JSON with:
  - `url`
  - optional `bootstrapToken`
  - optional `token`
  - optional `password`
- Manual endpoint parsing normalizes to:
  - `host`
  - `port`
  - `tls`
  - `displayUrl`
- Cleartext `ws://` / `http://` is allowed only for:
  - localhost / loopback
  - Android emulator alias `10.0.2.2`
  - private LAN hosts
  - `.local` hosts
- Remote non-LAN endpoints must use TLS.

### TLS trust flow

- First secure connect without a stored fingerprint must not connect directly.
- The client probes the remote cert fingerprint first.
- The user explicitly accepts that fingerprint.
- Trusted fingerprints are stored by stable endpoint identity.
- Later secure connects pin against the stored fingerprint.

### Connection handshake

The transport is not just "open websocket and start RPCs".

1. Open websocket.
2. Wait for `connect.challenge` event with a `nonce`.
3. Send `connect` RPC with:
   - `minProtocol`
   - `maxProtocol`
   - `client`
   - `role`
   - optional `scopes`
   - optional `caps`
   - optional `commands`
   - optional `permissions`
   - optional `auth`
   - optional `device`
   - `locale`
   - optional `userAgent`

Auth input precedence in the Android client is:

- explicit token
- explicit bootstrap token
- explicit password
- stored device token for the same role when available

The operator connection used by the Android app requests:

- role: `operator`
- scopes:
  - `operator.read`
  - `operator.write`
  - `operator.talk.secrets`

Successful `connect` returns data that includes:

- `server.host`
- `auth.deviceToken`
- `auth.role`
- `auth.scopes`
- optional `auth.deviceTokens`
- optional `canvasHostUrl`
- optional `snapshot.sessionDefaults.mainSessionKey`

## Confirmed RPCs Safe For Launcher v1

### `health`

- Scope: `operator.read`
- Params: none
- Android client uses it as a reachability/health probe.

### `agents.list`

- Scope: `operator.read`
- Params: `{}` is valid
- Response shape used by Android:
  - `defaultId`
  - `mainKey`
  - `agents[]`
    - `id`
    - optional `name`
    - optional `identity.emoji`

### `chat.history`

- Scope: `operator.read`
- Params:
  - `sessionKey`
  - optional `limit`
  - optional `maxChars`
- Response shape used by Android:
  - `sessionKey`
  - optional `sessionId`
  - `messages[]`
  - optional `thinkingLevel`
  - optional `fastMode`
  - optional `verboseLevel`

### `chat.send`

- Scope: `operator.write`
- Minimum params launcher needs:
  - `sessionKey`
  - `message`
  - `idempotencyKey`
- Android also sends:
  - `thinking`
  - `timeoutMs`
  - optional `attachments[]`
- Attachment item shape:
  - `type`
  - `mimeType`
  - `fileName`
  - `content`
- The handler supports extra admin-only origin/provenance fields. Launcher v1
  should not use them.
- Response includes at least `runId` when a run starts. Android only relies on
  `runId`.

### `chat.abort`

- Scope: `operator.write`
- Params:
  - `sessionKey`
  - optional `runId`
- Useful for future chat-screen controls, but not required for the first slice.

### `sessions.list`

- Scope: `operator.read`
- Params used by Android:
  - `includeGlobal: true`
  - `includeUnknown: false`
  - optional `limit`
- Response shape used by Android:
  - `sessions[]`
    - `key`
    - optional `updatedAt`
    - optional `displayName`

## Confirmed But Not Available To Default Launcher Operator Scope

### `sessions.patch`

- Exists on the gateway.
- Scope: `operator.admin`
- The validated patch schema supports `label`.
- It also supports many other admin/session fields that launcher v1 does not
  need.
- Result: remote topic rename/sync is not part of the default v1 contract if we
  keep the Android reference scopes.

### `sessions.delete`

- Exists on the gateway.
- Scope: `operator.admin`
- Params:
  - `key`
  - optional `deleteTranscript`
  - optional `emitLifecycleHooks`
- Main sessions cannot be deleted.
- Result: remote delete is not part of the default v1 contract if we keep the
  Android reference scopes.

## Agent Binding Contract

No dedicated agent-init RPC was confirmed.

What is confirmed instead:

- The gateway treats agent selection as part of the session-key namespace.
- Canonical agent-scoped keys use the form:
  - `agent:<agentId>:<rest>`
- Canonical main-agent key uses:
  - `agent:<agentId>:main`
- Server helpers such as `toAgentStoreSessionKey()` convert a raw request key
  like `topic-123` into:
  - `agent:<agentId>:topic-123`

Launcher implication:

- Do not invent `agents.bind`, `agent.init`, or similar RPCs.
- Agent-bound topics should bind by choosing an agent-scoped `sessionKey`.
- Non-agent topics can keep plain launcher session keys.

## Locked Fallback Rules For Launcher v1

- Local topics are the source of truth for topic labels.
- Local topic delete always succeeds immediately.
- Remote topic rename is disabled by default.
- Remote topic delete is disabled by default.
- If we later widen scopes to `operator.admin`, rename/delete can be added
  behind that explicit scope decision.
- Agent binding should be implemented via session-key construction, not a
  separate RPC.

## Unsupported Assumptions Removed

- No dedicated first-use agent initialization RPC is confirmed.
- No normal operator-scope remote delete path is confirmed.
- No normal operator-scope remote rename/sync path is confirmed.
- The launcher should not mirror the full Android runtime surface; it only
  needs endpoint parsing, TLS trust, connection lifecycle, and request access
  to the confirmed methods above.
