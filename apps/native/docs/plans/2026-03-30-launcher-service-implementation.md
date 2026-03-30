# Launcher Service Nitro Module Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task.
>
> - `build-nitro-modules` for scaffolding, HybridObject spec authoring, nitro.json config, Nitrogen codegen, Kotlin implementation
> - `react-native-best-practices` for New Architecture considerations, native module integration patterns
> - `vercel-react-best-practices` for hook design, context boundaries, effect lifecycle
> - `heroui-native` for HeroUI component usage in settings UI (icon pack picker, shortcut display)
> - `building-components` for accessible, composable components

**Goal:** Build a `react-native-launcher-service` Nitro module that **replaces** `react-native-get-app-list` and provides: installed app listing, pre-composited adaptive icons (with icon pack + themed icon support), icon pack management, and app shortcuts (per-app query + search + launch).

**Reference:** [Kvaesitso IconService.kt](file:///Users/vijayabaskar/work/references/Kvaesitso/services/icons/src/main/java/de/mm20/launcher2/icons/IconService.kt) — icon provider chain, icon pack resolution, themed icons
**Reference:** [Kvaesitso AppFilterIconPackInstaller.kt](file:///Users/vijayabaskar/work/references/Kvaesitso/services/icons/src/main/java/de/mm20/launcher2/icons/loaders/AppFilterIconPackInstaller.kt) — icon pack parsing, appfilter.xml
**Reference:** [Kvaesitso AdaptiveIconDrawableCompat.kt](file:///Users/vijayabaskar/work/references/Kvaesitso/services/icons/src/main/java/de/mm20/launcher2/icons/compat/AdaptiveIconDrawableCompat.kt) — adaptive icon layer extraction
**Reference:** [Kvaesitso AppShortcutRepository.kt](file:///Users/vijayabaskar/work/references/Kvaesitso/data/appshortcuts/src/main/java/de/mm20/launcher2/appshortcuts/AppShortcutRepository.kt) — shortcut querying, launching, pin handling
**Reference:** [Existing Nitro module](file:///Users/vijayabaskar/work/launcher/packages/react-native-accessibility-actions/) — scaffolding pattern, Kotlin implementation, manifest config

---

### Design Decisions Locked

- **Scope:** Installed apps list + adaptive icons + icon packs + themed icons + app shortcuts — all in one module
- **Replaces:** `react-native-get-app-list` (fully). Remove the patched package after migration.
- **Keeps:** `expo-intent-launcher` (app launching + other intents), `drawer-metadata.tsx` (JS-side user prefs — aliases, tags, pinned, visibility, ordering)
- **Icon delivery:** Pre-composited PNG file paths — native handles adaptive layer extraction, icon pack resolution, theming, compositing. JS just renders `<Image source={{ uri: path }}>`
- **Icon pack resolution:** Native handles internally. Parse `appfilter.xml` on `setActiveIconPack()`, keep mappings in-memory HashMap. Lookup order: icon pack exact match → icon pack package match → icon pack generative (iconback/iconupon/iconmask) → system icon
- **Icon cache:** File paths in `cache/icons/{packageName}.png`. Clear all on icon pack change. `clearIconCache()` for manual refresh. Cache dir reclaimable by Android under storage pressure.
- **Shortcuts:** Per-app query via `getShortcuts(packageName)` + native-side search via `searchShortcuts(query)` + `launchShortcut()`. Requires `hasShortcutHostPermission` (default launcher role).
- **iOS:** Empty stubs (same pattern as other Nitro modules)
- **Deferred:** Pin request handling (`CONFIRM_PIN_SHORTCUT` activity), dynamic clock/calendar icons, legacy shortcut support

---

### TypeScript API

```typescript
import type { HybridObject } from "react-native-nitro-modules";

interface AppInfo {
  packageName: string;
  appName: string;
  activityName: string;
}

interface IconPackInfo {
  packageName: string;
  label: string;
}

interface AppShortcut {
  id: string;
  packageName: string;
  shortLabel: string;
  longLabel: string | undefined;
  iconPath: string | null;
}

interface LauncherService extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  // App list
  getInstalledApps(): AppInfo[];

  // Icons
  getAppIcon(packageName: string, size: number, themed: boolean): string | null;
  clearIconCache(): void;

  // Icon packs
  getInstalledIconPacks(): IconPackInfo[];
  setActiveIconPack(packageName: string | undefined): void;

  // Shortcuts
  getShortcuts(packageName: string): AppShortcut[];
  searchShortcuts(query: string): AppShortcut[];
  launchShortcut(packageName: string, shortcutId: string): void;
  readonly hasShortcutHostPermission: boolean;
}
```

---

### Packages to Remove

```bash
bun remove react-native-get-app-list
```

Remove after the new module is wired and tested. Also remove the patch file at `apps/native/patches/react-native-get-app-list+0.2.0.patch`.

---

### Task 1: Scaffold the Nitro module

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-launcher-service/` (full scaffold)

**Step 1: Create directory structure**

Mirror the `react-native-notification-bridge` pattern:

- `src/specs/LauncherService.nitro.ts`
- `src/index.ts`
- `android/` with `build.gradle`, `CMakeLists.txt`, `gradle.properties`, `fix-prefab.gradle`
- `android/src/main/cpp/cpp-adapter.cpp`
- `android/src/main/AndroidManifest.xml`
- `ios/Bridge.h`
- `nitro.json`, `package.json`, `tsconfig.json`, `babel.config.js`, `react-native.config.js`
- `NitroLauncherService.podspec`

**Step 2: Configure nitro.json**

```json
{
  "$schema": "https://nitro.margelo.com/nitro.schema.json",
  "cxxNamespace": ["launcherservice"],
  "ios": {
    "iosModuleName": "NitroLauncherService"
  },
  "android": {
    "androidNamespace": ["launcherservice"],
    "androidCxxLibName": "NitroLauncherService"
  },
  "autolinking": {
    "LauncherService": {
      "android": {
        "language": "kotlin",
        "implementationClassName": "HybridLauncherService"
      }
    }
  },
  "ignorePaths": ["**/node_modules"]
}
```

**Step 3: Configure AndroidManifest.xml**

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
</manifest>
```

**Step 4: Commit**

```
chore: scaffold react-native-launcher-service Nitro module
```

---

### Task 2: Write the HybridObject TypeScript spec

**Required skills:** `build-nitro-modules`

**Files:**

- Modify: `packages/react-native-launcher-service/src/specs/LauncherService.nitro.ts`
- Modify: `packages/react-native-launcher-service/src/index.ts`

**Step 1: Write the spec**

Write the full TypeScript spec as defined in the **TypeScript API** section above. The `AppInfo`, `IconPackInfo`, and `AppShortcut` interfaces must be defined in the same spec file for Nitrogen to generate the native types.

**Step 2: Export from index.ts**

```typescript
import { NitroModules } from "react-native-nitro-modules";
import type {
  LauncherService,
  AppInfo,
  IconPackInfo,
  AppShortcut,
} from "./specs/LauncherService.nitro";

export const launcherService =
  NitroModules.createHybridObject<LauncherService>("LauncherService");

export type { LauncherService, AppInfo, IconPackInfo, AppShortcut };
```

**Step 3: Run Nitrogen codegen**

```bash
cd packages/react-native-launcher-service && npx nitrogen
```

Verify generated files appear in `nitrogen/generated/`.

**Step 4: Commit**

```
feat: add LauncherService HybridObject spec and run codegen
```

---

### Task 3: Implement AppListProvider (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-launcher-service/android/src/main/java/com/margelo/nitro/launcherservice/AppListProvider.kt`

**Step 1: Build AppListProvider**

Query installed apps using `PackageManager` with `MATCH_ALL` and launch intent filter (same logic as the patched `react-native-get-app-list`):

- Get all packages with `queryIntentActivities(launchIntent, 0)`
- Filter to apps with a launch intent (`getLaunchIntentForPackage()`)
- Extract `packageName`, `appName` (from `loadLabel()`), `activityName` (from `ComponentName`)
- Sort alphabetically by `appName`
- Return as `Array<AppInfo>` (generated Nitrogen data class)

**Step 2: Commit**

```
feat: add AppListProvider for querying installed apps
```

---

### Task 4: Implement IconProvider (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-launcher-service/android/src/main/java/com/margelo/nitro/launcherservice/IconProvider.kt`

**Step 1: Build IconProvider**

Handles adaptive icon extraction and compositing. Follow the Kvaesitso `AdaptiveIconDrawableCompat` + `StaticLauncherIcon` pattern:

- **`getAppIcon(packageName, size, themed)`:**
  1. Check active icon pack first (if set) — lookup by component name in the in-memory HashMap
  2. Fall back to system icon via `packageManager.getApplicationIcon(packageName)`
  3. If `AdaptiveIconDrawable` → extract foreground + background layers
  4. If `themed = true` → check for monochrome layer (API 33+), apply tint with theme color. If no monochrome, tint the foreground.
  5. Composite layers onto a `Bitmap` canvas at requested `size`
  6. Save to `cacheDir/icons/{packageName}.png`
  7. Return file path

- **Theme color:** Use `context.getColor(android.R.color.system_accent1_100)` for Material You accent, or fall back to a default color

- **`clearIconCache()`:** Delete all files in `cacheDir/icons/`

**Step 2: Commit**

```
feat: add IconProvider with adaptive icon extraction and compositing
```

---

### Task 5: Implement IconPackManager (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-launcher-service/android/src/main/java/com/margelo/nitro/launcherservice/IconPackManager.kt`

**Step 1: Build IconPackManager**

Follow the Kvaesitso `AppFilterIconPackInstaller` + `IconPackManager` pattern:

- **`getInstalledIconPacks()`:**
  - Query packages with intent filters: `org.adw.ActivityStarter.THEMES`, `com.novalauncher.THEME`, `app.lawnchair.icons.THEMED_ICON`, `org.adw.launcher.THEMES`
  - Return list of `IconPackInfo(packageName, label)`

- **`setActiveIconPack(packageName)`:**
  - If `null`, clear the active pack and icon mappings
  - Otherwise, parse `appfilter.xml` from the icon pack:
    - Try `res/xml/appfilter.xml` → `res/raw/appfilter.xml` → `assets/appfilter.xml`
    - Parse `<item>` tags: extract `component` attribute (ComponentName) and `drawable` attribute (resource name)
    - Store in `HashMap<String, String>` (componentName → drawableName)
  - Also parse iconback, iconupon, iconmask, scale for generative icons
  - Clear the icon cache (force re-generation with new pack)

- **`getIconPackIcon(componentName)`:**
  - Exact match: `packageName/activityName` in HashMap
  - Package match: `packageName/*` fallback
  - Generative: Apply iconback/iconupon/iconmask to system icon using `PorterDuff` modes (same as Kvaesitso `generateIcon()`)
  - Return `Drawable` or `null`

**Step 2: Commit**

```
feat: add IconPackManager with appfilter.xml parsing and icon resolution
```

---

### Task 6: Implement ShortcutProvider (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-launcher-service/android/src/main/java/com/margelo/nitro/launcherservice/ShortcutProvider.kt`

**Step 1: Build ShortcutProvider**

Follow the Kvaesitso `AppShortcutRepository` pattern:

- **`getShortcuts(packageName)`:**
  - Check `launcherApps.hasShortcutHostPermission()` — return empty if false
  - Build `LauncherApps.ShortcutQuery()` with `setPackage(packageName)` and flags: `FLAG_MATCH_MANIFEST | FLAG_MATCH_DYNAMIC | FLAG_MATCH_PINNED`
  - Map `ShortcutInfo` → `AppShortcut(id, packageName, shortLabel, longLabel, iconPath)`
  - Save shortcut icons via `launcherApps.getShortcutIconDrawable()` to `cacheDir/shortcuts/{packageName}_{id}.png`

- **`searchShortcuts(query)`:**
  - Query all shortcuts across all packages with `FLAG_MATCH_MANIFEST | FLAG_MATCH_DYNAMIC`
  - Filter by fuzzy match on `shortLabel` and `longLabel` (case-insensitive contains)
  - Return top results sorted by relevance

- **`launchShortcut(packageName, shortcutId)`:**
  - `launcherApps.startShortcut(packageName, shortcutId, null, null, Process.myUserHandle())`

**Step 2: Commit**

```
feat: add ShortcutProvider with query, search, and launch
```

---

### Task 7: Implement HybridLauncherService (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-launcher-service/android/src/main/java/com/margelo/nitro/launcherservice/HybridLauncherService.kt`
- Create: `packages/react-native-launcher-service/android/src/main/java/com/margelo/nitro/launcherservice/NitroLauncherServicePackage.kt`

**Step 1: Implement the HybridObject**

Extend the generated `HybridLauncherServiceSpec`. Wire all providers together:

- **`getInstalledApps()`:** Delegate to `AppListProvider`
- **`getAppIcon(packageName, size, themed)`:** Delegate to `IconProvider` (which internally checks `IconPackManager`)
- **`clearIconCache()`:** Delegate to `IconProvider`
- **`getInstalledIconPacks()`:** Delegate to `IconPackManager`
- **`setActiveIconPack(packageName)`:** Delegate to `IconPackManager`, then `IconProvider.clearIconCache()`
- **`getShortcuts(packageName)`:** Delegate to `ShortcutProvider`
- **`searchShortcuts(query)`:** Delegate to `ShortcutProvider`
- **`launchShortcut(packageName, shortcutId)`:** Delegate to `ShortcutProvider`
- **`hasShortcutHostPermission`:** `launcherApps.hasShortcutHostPermission()`

Lazy-init all providers using `by lazy { }`.

**Step 2: Register the package**

Create `NitroLauncherServicePackage.kt` (same pattern as other modules).

**Step 3: Commit**

```
feat: implement HybridLauncherService wiring all providers
```

---

### Task 8: Wire into the app and migrate from `react-native-get-app-list`

**Required skills:** `react-native-best-practices`, `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/package.json` (add workspace dep, remove old package)
- Modify: `apps/native/context/app-list.tsx` (swap to new module)
- Modify: `apps/native/components/app-icon.tsx` (use file path icons instead of base64)
- Delete: `apps/native/patches/react-native-get-app-list+0.2.0.patch`
- Modify: `apps/native/lib/icon-cache.ts` (simplify — native handles caching now)

**Step 1: Add workspace dependency**

```json
"react-native-launcher-service": "workspace:*"
```

**Step 2: Remove the old package**

```bash
bun remove react-native-get-app-list
rm apps/native/patches/react-native-get-app-list+0.2.0.patch
```

**Step 3: Update app-list.tsx**

Replace `getInstalledApps()` from `react-native-get-app-list` with:

```typescript
import { launcherService } from "react-native-launcher-service";

const apps = launcherService.getInstalledApps();
// Returns AppInfo[] — icons fetched separately via getAppIcon()
```

**Step 4: Update app-icon.tsx**

Replace base64 URI rendering with file path rendering:

```typescript
const iconPath = launcherService.getAppIcon(packageName, size, themed)
// Returns "file:///data/.../cache/icons/com.example.app.png"

<Image source={{ uri: `file://${iconPath}` }} />
```

Remove SVG clip path masking for icons — the native module handles compositing with the correct shape.

**Step 5: Simplify icon-cache.ts**

The native module caches icons to disk. The JS-side MMKV icon cache is no longer needed for icon bitmaps. Simplify or remove `icon-cache.ts`.

**Step 6: Commit**

```
feat: migrate app list and icons from react-native-get-app-list to launcher-service
```

---

### Task 9: Build and test on device

**Required skills:** `react-native-best-practices`

**Files:**

- No file changes — build and manual test

**Step 1: Build dev client**

```bash
npx expo run:android
```

**Step 2: Test app list**

- Verify all installed apps appear in the drawer
- Verify app names are correct
- Verify apps refresh when returning from installs/uninstalls

**Step 3: Test icons**

- Verify composited icons render correctly in the drawer
- Verify themed icons work when enabled in settings
- Verify icon cache files exist in `cache/icons/`
- Verify `clearIconCache()` deletes cached files and regenerates

**Step 4: Test icon packs**

- Install an icon pack (e.g. Lawnicons) on the device
- Verify `getInstalledIconPacks()` returns it
- Verify `setActiveIconPack()` switches icons in the drawer
- Verify setting icon pack to `null` reverts to system icons

**Step 5: Test shortcuts**

- Set app as default launcher (for shortcut host permission)
- Verify `getShortcuts("com.google.android.chrome")` returns Chrome's shortcuts
- Verify `searchShortcuts("incognito")` finds Chrome's incognito shortcut
- Verify `launchShortcut()` opens the shortcut

**Step 6: Test edge cases**

- App with no adaptive icon (legacy) → should still render
- Icon pack with missing icon for an app → falls back to system icon
- No icon packs installed → `getInstalledIconPacks()` returns empty array
- No shortcut permission → `hasShortcutHostPermission` returns false, queries return empty

**Step 7: Commit (if any fixes)**

```
fix: launcher-service edge case fixes from device testing
```

---

### Task 10: Automated device testing with agent-device

**Required skills:** `agent-device`

**Files:**

- No file changes — automated device verification

Use `agent-device` CLI to verify the launcher service on a real device/emulator. Load the skill from the project root folder. Follow the default flow: bootstrap → exploration → verification.

**Step 1: Bootstrap**

Load `agent-device` skill references (`bootstrap-install.md` then `exploration.md`). Confirm the correct Android target is pinned, the dev client is installed, and an app session is open.

**Step 2: Verify app list**

- Use `snapshot` on the app drawer to verify all installed apps appear
- Verify app names are displayed correctly
- Verify alphabetical ordering

**Step 3: Verify icons**

- Use `snapshot` to verify icons render in the drawer and dock
- Navigate to Settings → Icons to verify icon shape options
- Change icon shape and verify icons update

**Step 4: Verify icon packs (if available)**

- Navigate to Settings → Icons → Icon Pack
- Verify installed icon packs are listed
- Select an icon pack and verify icons change in the drawer
- Revert to system icons and verify they restore

**Step 5: Verify shortcuts**

- Long press an app to verify shortcuts appear (if UI is wired)
- Use search to verify shortcut results appear for relevant queries

**Step 6: Capture proof**

Use `snapshot` to capture final state screenshots as verification evidence. Close the app session.
