# Notification Bridge Nitro Module Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task.
>
> - `build-nitro-modules` for scaffolding, HybridObject spec authoring, nitro.json config, Nitrogen codegen, Kotlin implementation
> - `react-native-best-practices` for New Architecture considerations, native module integration patterns
> - `vercel-react-best-practices` for hook design, context boundaries, effect lifecycle
> - `heroui-native` for HeroUI component usage in any UI (permission prompts, music widget)
> - `building-components` for accessible, composable components

**Goal:** Build a `react-native-notification-bridge` Nitro module that **replaces** `expo-android-notification-listener-service` entirely. It owns the `NotificationListenerService` and provides: notification badge counts (raw events), media session metadata (push via callbacks), media transport controls (play/pause/skip), album art (file path to cache), and permission helpers.

**Reference:** [Kvaesitso MusicService.kt](file:///Users/vijayabaskar/work/references/Kvaesitso/services/music/src/main/java/de/mm20/launcher2/music/MusicService.kt) — media session reading, metadata extraction, transport controls
**Reference:** [Kvaesitso NotificationService.kt](file:///Users/vijayabaskar/work/references/Kvaesitso/data/notifications/src/main/java/de/mm20/launcher2/notifications/NotificationService.kt) — notification listener, badge counting
**Reference:** [Existing Nitro module](file:///Users/vijayabaskar/work/launcher/packages/react-native-accessibility-actions/) — scaffolding pattern, Kotlin implementation, manifest config

---

### Design Decisions Locked

- **Architecture:** Own Nitro module replaces `expo-android-notification-listener-service` — single `NotificationListenerService` for badges + media
- **Badge data flow:** Raw events (`onNotificationPosted` / `onNotificationRemoved`) — JS aggregates counts (same pattern as current)
- **Media data flow:** Push model — native registers `MediaController.Callback`, pushes metadata + playback state changes to JS via callbacks
- **Album art delivery:** Save bitmap to cache dir (`cache/album-art/`), send file path string inside `MediaMetadata`
- **Session handling:** Single active session — most recent notification with a media session token (same as Kvaesitso `maxByOrNull { postTime }`)
- **Player filtering:** None in v1
- **Callback lifecycle:** Last-writer-wins — re-registering replaces previous callback, no explicit unsubscribe
- **iOS:** Empty stubs (same pattern as `react-native-accessibility-actions`)
- **Deferred to v2:** Playback position tracking, custom media actions, general notification action execution, player allowlist/denylist

---

### TypeScript API

```typescript
import type { HybridObject } from "react-native-nitro-modules";

// --- Supporting types ---

interface MediaMetadata {
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArtPath: string | null;
  duration: number; // ms, -1 if unknown
  packageName: string;
}

type PlaybackState = "playing" | "paused" | "stopped" | "none";

// --- HybridObject ---

interface NotificationBridge extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  // Permission
  readonly isNotificationListenerEnabled: boolean;
  openNotificationListenerSettings(): void;

  // Badge counts (raw events — JS aggregates)
  onNotificationPosted(
    callback: (packageName: string, key: string) => void
  ): void;
  onNotificationRemoved(callback: (key: string) => void): void;

  // Media session (push model — native drives updates)
  onMediaMetadataChanged(
    callback: (metadata: MediaMetadata | null) => void
  ): void;
  onPlaybackStateChanged(callback: (state: PlaybackState) => void): void;

  // Transport controls
  play(): void;
  pause(): void;
  skipToNext(): void;
  skipToPrevious(): void;
}
```

---

### Packages to Remove

```bash
bun remove expo-android-notification-listener-service
```

The Expo module is fully replaced by this Nitro module. Remove it after the new module is wired and tested.

---

### Task 1: Scaffold the Nitro module

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-notification-bridge/` (full scaffold)

**Step 1: Initialize with Nitrogen**

```bash
cd packages && npx nitrogen@latest init react-native-notification-bridge
```

**Step 2: Verify scaffold**

Ensure the directory structure matches the `react-native-accessibility-actions` pattern:

- `src/specs/NotificationBridge.nitro.ts`
- `src/index.ts`
- `android/` with `build.gradle`, `CMakeLists.txt`, `gradle.properties`
- `ios/Bridge.h`
- `nitro.json`
- `package.json`

**Step 3: Configure nitro.json**

```json
{
  "$schema": "https://nitro.margelo.com/nitro.schema.json",
  "cxxNamespace": ["notificationbridge"],
  "ios": {
    "iosModuleName": "NitroNotificationBridge"
  },
  "android": {
    "androidNamespace": ["notificationbridge"],
    "androidCxxLibName": "NitroNotificationBridge"
  },
  "autolinking": {
    "NotificationBridge": {
      "android": {
        "language": "kotlin",
        "implementationClassName": "HybridNotificationBridge"
      }
    }
  },
  "ignorePaths": ["**/node_modules"]
}
```

**Step 4: Commit**

```
chore: scaffold react-native-notification-bridge Nitro module
```

---

### Task 2: Write the HybridObject TypeScript spec

**Required skills:** `build-nitro-modules`

**Files:**

- Modify: `packages/react-native-notification-bridge/src/specs/NotificationBridge.nitro.ts`
- Modify: `packages/react-native-notification-bridge/src/index.ts`

**Step 1: Write the spec**

Write the full TypeScript spec as defined in the **TypeScript API** section above. The `MediaMetadata` interface and `PlaybackState` type must be defined in the same spec file for Nitrogen to generate the native types.

**Step 2: Export from index.ts**

```typescript
import { NitroModules } from "react-native-nitro-modules";
import type { NotificationBridge } from "./specs/NotificationBridge.nitro";

export const notificationBridge =
  NitroModules.createHybridObject<NotificationBridge>("NotificationBridge");

export type {
  NotificationBridge,
  MediaMetadata,
  PlaybackState,
} from "./specs/NotificationBridge.nitro";
```

**Step 3: Run Nitrogen codegen**

```bash
cd packages/react-native-notification-bridge && npx nitrogen
```

Verify generated files appear in `nitrogen/generated/android/kotlin/` and `nitrogen/generated/shared/c++/`.

**Step 4: Commit**

```
feat: add NotificationBridge HybridObject spec and run codegen
```

---

### Task 3: Implement the NotificationListenerService (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-notification-bridge/android/src/main/java/com/margelo/nitro/notificationbridge/LauncherNotificationService.kt`
- Create: `packages/react-native-notification-bridge/android/src/main/AndroidManifest.xml`

**Step 1: Implement the service**

Build `LauncherNotificationService` extending `NotificationListenerService`. Follow the Kvaesitso `NotificationService.kt` pattern:

- **Singleton:** Companion object with `instance: WeakReference<LauncherNotificationService>`
- **`onListenerConnected()`:** Load all active notifications, extract media session tokens, notify callbacks
- **`onNotificationPosted(sbn)`:** Invoke the `onNotificationPosted` callback with `packageName` and `key`. Check for media session token in `notification.extras.getParcelable(Notification.EXTRA_MEDIA_SESSION)` — if present, update active media controller
- **`onNotificationRemoved(sbn)`:** Invoke the `onNotificationRemoved` callback with `key`. If this was the media session notification, clear the active controller
- **Media session selection:** Track all notifications with media tokens, pick the most recent by `postTime` (same as Kvaesitso `maxByOrNull { postTime }`)

**Step 2: Declare in AndroidManifest.xml**

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <service
    android:name=".LauncherNotificationService"
    android:exported="false"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
    <intent-filter>
      <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
  </service>
</manifest>
```

**Step 3: Commit**

```
feat: implement LauncherNotificationService with badge events and media session tracking
```

---

### Task 4: Implement media session handling (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-notification-bridge/android/src/main/java/com/margelo/nitro/notificationbridge/MediaSessionHandler.kt`

**Step 1: Build MediaSessionHandler**

Separate class that manages the active `MediaController` and its callbacks. Follow the Kvaesitso `MusicService.kt` pattern:

- **`setMediaSessionToken(token: MediaSession.Token?)`** — Create `MediaController` from token, register `MediaController.Callback` on main thread Handler
- **`MediaController.Callback.onMetadataChanged()`** — Extract title, artist, album, duration from `MediaMetadata` keys. Save album art bitmap to `context.cacheDir/album-art/current.png`. Build `MediaMetadata` object, invoke JS callback
- **`MediaController.Callback.onPlaybackStateChanged()`** — Map `PlaybackState.getState()` to `playing`/`paused`/`stopped`/`none` string. Invoke JS callback
- **Transport controls:** `play()`, `pause()`, `skipToNext()`, `skipToPrevious()` delegate to `controller.transportControls`
- **Cleanup:** Unregister callback when token changes or is cleared

**Album art extraction order** (same as Kvaesitso):

1. `METADATA_KEY_ALBUM_ART` (bitmap)
2. `METADATA_KEY_ART` (bitmap)
3. `METADATA_KEY_ALBUM_ART_URI` (load from URI)
4. `METADATA_KEY_ART_URI` (load from URI)

**Step 2: Commit**

```
feat: add MediaSessionHandler with metadata extraction and transport controls
```

---

### Task 5: Implement the HybridNotificationBridge (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-notification-bridge/android/src/main/java/com/margelo/nitro/notificationbridge/HybridNotificationBridge.kt`

**Step 1: Implement the HybridObject**

Extend the generated `HybridNotificationBridgeSpec`. Wire everything together:

- **`isNotificationListenerEnabled`:** Check `Settings.Secure.getString(ENABLED_NOTIFICATION_LISTENERS)` for our service component name (same pattern as accessibility-actions module)
- **`openNotificationListenerSettings()`:** Start `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` intent
- **`onNotificationPosted(callback)`:** Store callback, pass to `LauncherNotificationService.instance`
- **`onNotificationRemoved(callback)`:** Store callback, pass to `LauncherNotificationService.instance`
- **`onMediaMetadataChanged(callback)`:** Store callback, pass to `MediaSessionHandler`
- **`onPlaybackStateChanged(callback)`:** Store callback, pass to `MediaSessionHandler`
- **`play()` / `pause()` / `skipToNext()` / `skipToPrevious()`:** Delegate to `MediaSessionHandler`

**Step 2: Register the package**

Create `NitroNotificationBridgePackage.kt` for React Native package registration (same pattern as accessibility-actions).

**Step 3: Commit**

```
feat: implement HybridNotificationBridge wiring service, media handler, and JS callbacks
```

---

### Task 6: Wire into the app and migrate from Expo module

**Required skills:** `react-native-best-practices`, `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/package.json` (add workspace dep, remove expo module)
- Modify: `apps/native/context/notification-badges.tsx` (swap import source)

**Step 1: Add workspace dependency**

```json
"react-native-notification-bridge": "workspace:*"
```

**Step 2: Remove the Expo module**

```bash
bun remove expo-android-notification-listener-service
```

**Step 3: Update notification-badges.tsx**

Replace the Expo module imports and event listeners with the new Nitro module:

```typescript
import { notificationBridge } from "react-native-notification-bridge";

// Permission check
const granted = notificationBridge.isNotificationListenerEnabled;

// Register callbacks (replaces addListener pattern)
notificationBridge.onNotificationPosted((packageName, key) => {
  activeNotificationsRef.current.set(key, { key, packageName });
  recalculateBadges();
});

notificationBridge.onNotificationRemoved((key) => {
  activeNotificationsRef.current.delete(key);
  recalculateBadges();
});
```

**Step 4: Verify badge counts still work**

Build and test on device. Badge dots on app icons should behave identically to before.

**Step 5: Commit**

```
feat: migrate notification badges from expo module to notification-bridge
```

---

### Task 7: Build and test on device

**Required skills:** `react-native-best-practices`

**Files:**

- No file changes — build and manual test

**Step 1: Build dev client**

```bash
npx expo run:android
```

**Step 2: Test badge counts**

- Grant notification listener permission in Settings
- Send test notifications from another app
- Verify badge dots appear and disappear on app icons

**Step 3: Test media session**

- Play music in Spotify/YouTube Music
- Verify `onMediaMetadataChanged` callback fires with correct title/artist/album
- Verify `onPlaybackStateChanged` fires on play/pause
- Verify `play()`, `pause()`, `skipToNext()`, `skipToPrevious()` control the player
- Verify album art file is written and path is valid

**Step 4: Test edge cases**

- No media playing → `onMediaMetadataChanged(null)` fires
- Switch between two music apps → picks most recent
- Kill music app → state clears properly
- Permission not granted → `isNotificationListenerEnabled` returns false

**Step 5: Commit (if any fixes)**

```
fix: notification-bridge edge case fixes from device testing
```

---

### Task 8: Automated device testing with agent-device

**Required skills:** `agent-device`

**Files:**

- No file changes — automated device verification

Use `agent-device` CLI to verify the notification bridge on a real device/emulator. Load the skill from the project root folder. Follow the default flow: bootstrap → exploration → verification.

**Step 1: Bootstrap**

Load `agent-device` skill references (`bootstrap-install.md` then `exploration.md`). Confirm the correct Android target is pinned, the dev client is installed, and an app session is open.

**Step 2: Verify permission flow**

- Use `snapshot` to verify the homescreen loads correctly
- Navigate to Settings → Notification Listener permission screen
- Verify `isNotificationListenerEnabled` returns `false` before granting
- Grant notification listener permission
- Return to app and verify `isNotificationListenerEnabled` returns `true`

**Step 3: Verify badge counts**

- Open a second app that sends notifications (e.g. messaging app)
- Send a test notification
- Use `snapshot` on the app drawer to verify badge dot appears on the notifying app's icon
- Dismiss the notification
- Use `snapshot` to verify badge dot disappears

**Step 4: Verify media session**

- Start music playback in a media app (Spotify, YouTube Music, etc.)
- Use `snapshot` to verify the media metadata (title, artist) is visible in the music widget if wired
- Verify album art file exists at the expected cache path
- Test transport controls: tap pause → verify playback pauses, tap play → verify playback resumes
- Skip to next track → verify metadata updates

**Step 5: Verify edge cases**

- Stop all media playback → verify media state clears (null metadata)
- Revoke notification listener permission → verify `isNotificationListenerEnabled` returns `false` and callbacks stop firing
- Re-grant permission → verify service reconnects and events resume

**Step 6: Capture proof**

Use `snapshot` to capture final state screenshots as verification evidence. Close the app session.
