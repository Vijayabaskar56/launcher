# OpenClaw Topic Chat Integration Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task. **Do NOT reload a skill if it is already loaded in the current conversation context.**
>
> - `react-native-best-practices` for Expo/RN architecture, New Architecture constraints, native module integration patterns
> - `building-native-ui` for Expo Router route structure, settings surfaces, and native-feeling screen flows
> - `heroui-native` for settings UI, topic pill UI, and chat screen component usage
> - `building-components` for accessible topic editor, trust prompt, and locked chat screen composition
> - `vercel-react-best-practices` for context boundaries, async lifecycle, resume state, and derived state handling
> - `vercel-react-native-skills` for screen performance, keyboard behavior, and React Native interaction details
> - `vercel-composition-patterns` for clean boundaries between search bar state, topic state, and chat routing

**Goal:** Extend the launcher search bar so it keeps normal local search behavior while adding OpenClaw topic chat routing. Users can manage `TopicPills`, bind a topic to a persistent OpenClaw session (and optionally an agent), press Enter from the search bar, and fall back into a full-screen topic chat when no local launcher result wins.

**Reference Direction:** Reuse the OpenClaw Android app's connection and chat model where it is already proven:

- Setup code + manual endpoint connection flow
- TLS fingerprint trust confirmation before first secure connection
- Persistent operator connection with session-based chat RPCs
- Agent discovery via `agents.list`
- Session loading via `chat.history` and `sessions.list`

**Repo Seams:**

- Existing search bar compound component: [apps/native/components/search-bar.tsx](file:///Users/vijayabaskar/work/launcher/apps/native/components/search-bar.tsx)
- Existing topic pill stub: [apps/native/components/search/topic-pills.tsx](file:///Users/vijayabaskar/work/launcher/apps/native/components/search/topic-pills.tsx)
- Current Enter routing and local search fallback: [apps/native/components/app-drawer.tsx](file:///Users/vijayabaskar/work/launcher/apps/native/components/app-drawer.tsx)
- Root stack and settings stack: [apps/native/app/\_layout.tsx](file:///Users/vijayabaskar/work/launcher/apps/native/app/_layout.tsx), [apps/native/app/settings/index.tsx](file:///Users/vijayabaskar/work/launcher/apps/native/app/settings/index.tsx)
- Settings storage shape: [apps/native/context/settings.tsx](file:///Users/vijayabaskar/work/launcher/apps/native/context/settings.tsx), [apps/native/types/settings.ts](file:///Users/vijayabaskar/work/launcher/apps/native/types/settings.ts)
- Existing Nitro module pattern: [packages/react-native-launcher-service/src/specs/launcher-service.nitro.ts](file:///Users/vijayabaskar/work/launcher/packages/react-native-launcher-service/src/specs/launcher-service.nitro.ts)

**OpenClaw Reference Files:**

- Connection runtime: [NodeRuntime.kt](file:///Users/vijayabaskar/work/temp/openclaw/apps/android/app/src/main/java/ai/openclaw/app/NodeRuntime.kt)
- Gateway session: [GatewaySession.kt](file:///Users/vijayabaskar/work/temp/openclaw/apps/android/app/src/main/java/ai/openclaw/app/gateway/GatewaySession.kt)
- Manual/setup-code parsing: [GatewayConfigResolver.kt](file:///Users/vijayabaskar/work/temp/openclaw/apps/android/app/src/main/java/ai/openclaw/app/ui/GatewayConfigResolver.kt)
- TLS host security rules: [GatewayHostSecurity.kt](file:///Users/vijayabaskar/work/temp/openclaw/apps/android/app/src/main/java/ai/openclaw/app/gateway/GatewayHostSecurity.kt)
- Chat controller: [ChatController.kt](file:///Users/vijayabaskar/work/temp/openclaw/apps/android/app/src/main/java/ai/openclaw/app/chat/ChatController.kt)
- Agent list loading: [NodeRuntime.kt](file:///Users/vijayabaskar/work/temp/openclaw/apps/android/app/src/main/java/ai/openclaw/app/NodeRuntime.kt)

---

### Product Decisions Locked

- `Chat` is always the first visible topic pill.
- One topic pill is always active.
- Typing still shows normal local launcher search results.
- Pressing Enter executes the first actionable local result first.
- If there is no local result, Enter falls back to the active topic chat.
- If no user-created topic is active, fallback goes to the built-in general `Chat` topic.
- Topics are user-managed from the edit button beside the pill rail.
- Topics use launcher-generated stable `sessionKey` values.
- Topics may optionally bind to an OpenClaw agent.
- Agent binding happens on first use and is immutable in v1.
- Topic chat opens as a full-screen route, locked to that topic.
- New topic sessions are created lazily on first send.
- Connection setup is manual/setup-code only in v1.
- Secrets are stored with secure persistence.
- If disconnected, attempting topic chat routes to Settings, into a dedicated `OpenClaw Connection` section.
- After a successful connect, the app resumes directly into the intended topic chat and auto-sends the pending message.
- If connect fails, preserve the pending message and let the user retry.
- Delete the local topic immediately; attempt remote session deletion only if the protocol supports it.
- Allow offline topic creation only for topics without agent binding.
- Empty topic chats show a simple first-message empty state.

---

### Architecture

This feature should be split into four layers:

1. **Native gateway client package**  
   Create an Android-first Nitro module, tentatively `packages/react-native-openclaw-gateway/`, that owns:
   - setup code decoding and endpoint normalization
   - TLS fingerprint probing / trust confirmation support
   - WebSocket/RPC connection lifecycle
   - chat/history/session/agent requests
   - optional remote session delete if the API exists

2. **Launcher OpenClaw domain layer**  
   Add `apps/native/lib/openclaw/*` and `apps/native/types/openclaw.ts` for:
   - topic models
   - secure connection config loading/saving
   - pending resume payloads
   - topic-to-session binding rules
   - mapping gateway data into UI-safe view models

3. **App-level OpenClaw provider**  
   Add `apps/native/context/openclaw.tsx` to expose:
   - connection state
   - trust prompt state
   - agent list
   - topic list and active topic
   - pending resume intent
   - topic-scoped chat state for the full-screen route

4. **UI integration layer**  
   Wire the domain layer into:
   - the existing search bar and topic pill rail
   - the app drawer Enter behavior
   - a new `OpenClaw Connection` settings screen
   - a new full-screen topic chat route

**Why a native package instead of plain JS/WebSocket:** the chosen TLS trust prompt requires fingerprint-aware probing and trust decisions. That cannot be enforced safely by plain Expo JS WebSocket code alone. The launcher already uses Nitro/native packages, so this should follow the established package boundary instead of mixing fragile transport logic into React state.

---

### Protocol Unknowns To Validate First

The reference Android client confirms `chat.send`, `chat.history`, `sessions.list`, `agents.list`, `health`, and the connect/auth flow. It does **not** clearly confirm:

- the exact RPC for first-use agent initialization
- a remote topic/session rename API
- a remote session deletion API

Implementation rule:

- Do not invent unsupported OpenClaw RPCs.
- Validate the real gateway methods first.
- If the protocol does not support a write path for topic sync or remote delete, keep launcher topics as the source of truth and degrade gracefully.

---

### Task 1: Validate Gateway RPC Surface And Freeze The Integration Contract

**Required skills:** `react-native-best-practices`

**Files:**

- Create: `apps/native/docs/openclaw-gateway-protocol.md`

**Step 1: Validate the real RPC surface**

Confirm the exact method names, payloads, and expected responses for:

- connection handshake inputs for operator mode
- `health`
- `chat.send`
- `chat.history`
- `sessions.list`
- `agents.list`
- first-use agent/session initialization for an agent-bound topic
- remote session delete if it exists

**Step 2: Capture the contract**

Write a concise protocol note with:

- confirmed methods
- payload fields
- unsupported assumptions removed
- fallback rules for unsupported topic sync/delete paths

**Step 3: Lock scope**

If agent-init or remote delete is not supported, explicitly mark the launcher behavior:

- local topic still works
- local delete always works
- remote delete becomes best-effort no-op

**Step 4: Commit**

```
docs: capture OpenClaw gateway RPC contract for launcher integration
```

---

### Task 2: Scaffold The Native OpenClaw Gateway Nitro Module

**Required skills:** `react-native-best-practices`

**Files:**

- Create: `packages/react-native-openclaw-gateway/` (full scaffold)
- Modify: `apps/native/package.json`

**Step 1: Create the workspace package**

Mirror the existing Nitro package layout used by `react-native-launcher-service`:

- `src/specs/openclaw-gateway.nitro.ts`
- `src/index.ts`
- `nitro.json`
- Android scaffold
- iOS stub scaffold

**Step 2: Add the app dependency**

Wire `react-native-openclaw-gateway` into `apps/native/package.json` as a workspace dependency.

**Step 3: Keep iOS/web as stubs**

This feature is Android-first. iOS/web should compile with safe no-op implementations or clear unsupported errors, matching other native packages in the repo.

**Step 4: Commit**

```
chore: scaffold react-native-openclaw-gateway Nitro module
```

---

### Task 3: Define The Native Module TypeScript Spec

**Required skills:** `vercel-composition-patterns`

**Files:**

- Create: `packages/react-native-openclaw-gateway/src/specs/openclaw-gateway.nitro.ts`
- Modify: `packages/react-native-openclaw-gateway/src/index.ts`

**Step 1: Define the JS/native contract**

The spec should cover:

- setup code parsing
- endpoint validation
- TLS fingerprint probe result
- trusted fingerprint persistence hooks
- connect / disconnect / reconnect
- connection snapshot reads
- request RPC passthrough for confirmed chat/session/agent methods
- event emission bridge for chat/agent/health updates

**Step 2: Keep the transport surface narrow**

Prefer a small, proven contract instead of mirroring all of `NodeRuntime.kt`.

Suggested shape:

```ts
interface OpenClawEndpointConfig {
  host: string;
  port: number;
  tls: boolean;
  displayUrl: string;
}

interface OpenClawAgentSummary {
  id: string;
  name?: string;
  emoji?: string;
}

interface OpenClawGatewayModule extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  parseSetupCode(raw: string): string | undefined;
  parseEndpoint(raw: string): OpenClawEndpointConfig | undefined;
  probeTlsFingerprint(host: string, port: number): string | undefined;
  connect(configJson: string): void;
  disconnect(): void;
  reconnect(): void;
  request(
    method: string,
    paramsJson?: string,
    timeoutMs?: number
  ): Promise<string>;
}
```

If the event bridge needs more than promises, add a small subscription mechanism instead of pushing full chat state into native.

**Step 3: Run codegen**

Run Nitrogen and confirm generated files compile.

**Step 4: Commit**

```
feat: define OpenClaw gateway Nitro spec and generate bindings
```

---

### Task 4: Implement Android Transport, Endpoint Parsing, And TLS Trust Helpers

**Required skills:** `react-native-best-practices`

**Files:**

- Create: `packages/react-native-openclaw-gateway/android/src/main/java/...`

**Step 1: Port the proven pieces from the reference app**

Port only the transport-critical parts from the reference app:

- setup code decoding and manual endpoint normalization
- private-LAN security rules for insecure ws/http
- TLS fingerprint probe
- trust-store persistence keyed by stable endpoint identity
- operator connection/auth selection for the launcher client

**Step 2: Keep the launcher role narrow**

The launcher does not need the full node/device runtime. It needs only the operator-side chat/session/agent surface.

**Step 3: Preserve explicit trust**

For unknown TLS fingerprints:

- do not silently connect
- surface the fingerprint to JS
- wait for explicit user trust from Settings

**Step 4: Commit**

```
feat: implement Android OpenClaw gateway transport and TLS trust support
```

---

### Task 5: Add Launcher OpenClaw Types And Persistence

**Required skills:** `vercel-react-best-practices`

**Files:**

- Create: `apps/native/types/openclaw.ts`
- Create: `apps/native/lib/openclaw/storage.ts`
- Create: `apps/native/lib/openclaw/secure-store.ts`

**Step 1: Define topic models**

Add types for:

- `OpenClawTopic`
- `OpenClawConnectionMode`
- `OpenClawConnectionConfig`
- `OpenClawPendingResumeIntent`
- `OpenClawTopicDraft`

Suggested topic shape:

```ts
interface OpenClawTopic {
  id: string;
  label: string;
  sessionKey: string;
  agentId?: string;
  createdAt: number;
  lastUsedAt?: number;
  isBuiltIn?: boolean;
}
```

**Step 2: Split secret vs non-secret storage**

- Store tokens, passwords, setup-code-derived secrets, and trusted fingerprints in `expo-secure-store`.
- Store local topics, active topic id, and non-secret UI metadata in MMKV.

**Step 3: Add built-in general chat topic**

Create a stable built-in topic record for `Chat` that:

- is always present
- cannot be deleted
- is selected by default on first boot

**Step 4: Commit**

```
feat: add OpenClaw topic and connection persistence
```

---

### Task 6: Add The App-Level OpenClaw Provider

**Required skills:** `vercel-react-best-practices`, `vercel-composition-patterns`

**Files:**

- Create: `apps/native/context/openclaw.tsx`
- Modify: `apps/native/app/_layout.tsx`

**Step 1: Build the provider boundary**

The provider should own:

- bootstrapping secure config + topics
- active connection state
- trust prompt state
- agent list
- active topic id
- pending resume intent
- route helpers for topic chat resume

**Step 2: Expose imperative actions**

Actions should include:

- `connectWithSetupCode()`
- `connectManual()`
- `acceptTlsTrust()`
- `declineTlsTrust()`
- `disconnect()`
- `createTopic()`
- `updateTopic()`
- `deleteTopic()`
- `setActiveTopic()`
- `beginPendingResume()`
- `clearPendingResume()`

**Step 3: Keep chat state topic-scoped**

Do not share a mutable global "current chat screen" model. Keep the provider focused on connection, topics, agents, and resume. The full-screen chat route can load the specific topic/session on demand.

**Step 4: Commit**

```
feat: add OpenClaw provider for topics, connection state, and resume flow
```

---

### Task 7: Build The OpenClaw Connection Settings Screen

**Required skills:** `building-native-ui`, `heroui-native`, `building-components`

**Files:**

- Create: `apps/native/app/settings/openclaw.tsx`
- Modify: `apps/native/app/settings/_layout.tsx`
- Modify: `apps/native/app/settings/index.tsx`

**Step 1: Add a new Settings entry**

Add an `OpenClaw` item under the `Connections` group in `settings/index.tsx`.

**Step 2: Build the screen**

The screen should support:

- setup code input
- manual host / port / TLS toggle
- token / password fields only where needed
- connection status summary
- connect / disconnect actions
- TLS trust confirmation inline in the connect flow

**Step 3: Support resume-after-connect**

If the user was redirected here by a pending topic send:

- show clear context that connection is required
- preserve the pending message
- after successful connection, route directly to the intended topic chat and auto-send

**Step 4: Commit**

```
feat: add OpenClaw connection settings flow
```

---

### Task 8: Replace The Sample Topic Pills With Real Topic State And Editor UI

**Required skills:** `heroui-native`, `building-components`

**Files:**

- Modify: `apps/native/components/search/topic-pills.tsx`
- Create: `apps/native/components/openclaw/topic-editor-sheet.tsx`

**Step 1: Replace sample data**

Wire `TopicPills` to provider-backed topic data instead of local sample state.

**Step 2: Enforce the locked behavior**

- `Chat` stays first
- one topic is always active
- active topic changes only affect the next Enter action, not the typed text itself

**Step 3: Build the editor flow**

The edit action should open a sheet or screen for:

- creating a topic
- optional agent selection
- deleting a topic

Offline behavior:

- allow topic creation without agent binding
- require connection for agent-bound topic creation

**Step 4: Make delete semantics explicit**

Deleting a topic should:

- remove the local topic immediately
- attempt remote session deletion only if the validated API supports it
- never block local deletion on remote failure

**Step 5: Commit**

```
feat: wire real OpenClaw topics into the search pill rail
```

---

### Task 9: Update Search Bar And Drawer Enter Routing

**Required skills:** `vercel-react-best-practices`, `vercel-react-native-skills`

**Files:**

- Modify: `apps/native/components/search-bar.tsx`
- Modify: `apps/native/components/app-drawer.tsx`

**Step 1: Keep local search behavior intact**

Do not suppress normal search results when a topic is active.

**Step 2: Change Enter precedence**

Pressing Enter should now be:

1. first actionable local result
2. first quick action
3. active topic chat fallback

This replaces the old "web search fallback" behavior.

**Step 3: Add disconnected routing**

If topic fallback is needed and the gateway is disconnected:

- create a pending resume intent from the current topic + text
- navigate to `/settings/openclaw`

**Step 4: Commit**

```
feat: route search fallback through OpenClaw topics
```

---

### Task 10: Add The Full-Screen Topic Chat Route

**Required skills:** `building-native-ui`, `heroui-native`, `building-components`, `vercel-react-native-skills`

**Files:**

- Create: `apps/native/app/openclaw/_layout.tsx`
- Create: `apps/native/app/openclaw/chat/[topicId].tsx`
- Create: `apps/native/components/openclaw/chat-screen.tsx`
- Create: `apps/native/components/openclaw/chat-message-list.tsx`
- Create: `apps/native/components/openclaw/chat-composer.tsx`
- Modify: `apps/native/app/_layout.tsx`

**Step 1: Add a namespaced OpenClaw stack**

Use a dedicated route namespace so connection/chat screens do not pollute the launcher root surface.

**Step 2: Lock the screen to the selected topic**

The chat route should:

- load one topic by `topicId`
- resolve its `sessionKey`
- show only that topic's conversation
- not allow topic switching inside the chat UI in v1

**Step 3: Empty state**

If a topic has no previous messages, show:

- topic label
- simple first-message prompt

**Step 4: Auto-send on resumed or direct fallback navigation**

When the route receives a pending resume payload:

- load the topic session
- send the message once
- clear the pending resume payload only after accepted send

**Step 5: Commit**

```
feat: add full-screen OpenClaw topic chat route
```

---

### Task 11: Implement First-Use Agent Binding

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/context/openclaw.tsx`
- Modify: `apps/native/components/openclaw/chat-screen.tsx`
- Modify: native package files as needed

**Step 1: Apply binding on first send**

For topics with an `agentId`, the first send path should:

- initialize the topic for that agent using the validated protocol method
- mark the topic as bound locally
- reuse the same `sessionKey` on later visits

**Step 2: Keep v1 immutable**

Once bound, do not allow agent reassignment through the editor UI.

**Step 3: Fallback rule**

If the protocol does not expose a real agent-init method, stop and replace this task with the validated behavior from Task 1. Do not fake it with undocumented RPCs.

**Step 4: Commit**

```
feat: bind agent topics on first OpenClaw send
```

---

### Task 12: Best-Effort Topic Sync And Remote Session Delete

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/context/openclaw.tsx`
- Modify: native package files as needed

**Step 1: Implement only confirmed remote sync paths**

If the validated gateway contract supports topic/session metadata write operations:

- sync local topic labels to remote display metadata
- refresh local topic badges or names from remote when useful

If no write path exists:

- keep launcher topics as the source of truth
- read remote metadata only when it adds display value

**Step 2: Implement best-effort remote delete**

If a remote delete method exists:

- call it after local topic deletion
- swallow failure without restoring the deleted local topic

**Step 3: Commit**

```
feat: add best-effort OpenClaw topic sync and remote session deletion
```

---

### Task 13: Verification, Edge Cases, And Regression Coverage

**Required skills:** `react-native-best-practices`, `vercel-react-native-skills`

**Files:**

- Create or modify tests for new topic, connection, and routing logic

**Step 1: Cover the important state machines**

Add tests for:

- built-in `Chat` topic bootstrap
- launcher-generated stable `sessionKey`
- offline topic creation without agent
- blocked agent topic creation while disconnected
- Enter precedence: local result wins before topic fallback
- disconnected fallback to Settings
- pending resume preserved on failed connect
- successful connect resumes directly into topic chat
- immutable agent binding after first use
- local topic delete always succeeds even when remote delete fails

**Step 2: Manual verification checklist**

- Search still launches apps/tools normally
- Topic fallback opens full-screen chat only when there is no actionable local result
- TLS trust prompt appears only for unknown secure gateways
- Manual endpoint and setup code both connect
- Chat route stays locked to the selected topic
- Empty topic chat shows the simple first-message state

**Step 3: Final cleanup**

Run:

```bash
bun x ultracite check
```

Fix violations before landing.

**Step 4: Commit**

```
test: cover OpenClaw topic routing and connection flows
```

---

### Implementation Order

Build in this order to avoid dead ends:

1. Validate protocol unknowns.
2. Create the native gateway boundary.
3. Add secure storage and topic persistence.
4. Add provider and connection settings screen.
5. Replace sample topic pills with real data.
6. Change Enter routing.
7. Add the full-screen chat route.
8. Add first-use agent binding.
9. Add conditional sync/delete features only if the protocol supports them.

---

### Non-Goals For This Slice

- Auto-discovery of gateways
- Inline chat inside the drawer
- Multi-topic switching inside the chat screen
- Mutable agent rebinding after first use
- Cross-device topic synchronization without confirmed remote APIs
- Deleting remote sessions via guessed or undocumented RPCs
