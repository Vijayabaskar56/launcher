# Icons & App Management Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task. **Do NOT reload a skill if it is already loaded in the current conversation context** — check what's already loaded before invoking the Skill tool. Only load skills that are new for the current task.
>
> - `vercel-react-native-skills` for list performance (FlashList, memoization, callback stabilization), image rendering, and React Native interaction patterns
> - `vercel-react-best-practices` for hook design, context refactoring, derived state, cache invalidation, and effect lifecycle
> - `building-native-ui` for Expo SDK packages (expo-intent-launcher), route layout, and native module integration
> - `heroui-native` for HeroUI component usage, `className` token classes, `useThemeColor` hook
> - `vercel-composition-patterns` for compound component architecture (AppIcon with clip masking)
> - `building-components` for accessible, composable icon component with shape masking

**Goal:** Replace all mock app data with real installed app data. Wire real app icons with SVG shape masking, app launching, app info actions, MMKV icon caching, and dock population from pinned apps. Connect all existing icon settings (shape, labels) to real rendering.

**Reference Direction:** Match Kvaesitso's app management behavior:

- Real installed app list with package names, names, and icons
- App launching via package name
- Icon shape masking (circle, squircle, teardrop, hexagon, etc.)
- Configurable grid (columns, label visibility)
- Dock populated from pinned/favorite apps
- Auto-pin common system apps on first launch
- App list refresh on resume (detects installs/uninstalls)
- App info and uninstall via system intents

**Architecture:** `react-native-get-app-list` provides the installed app list with icons. `expo-intent-launcher` handles launching apps, opening app info, and triggering uninstall. Icons are base64 PNGs cached in MMKV keyed by `packageName`. The `AppIcon` component renders icons inside SVG `<ClipPath>` elements matching the user's chosen shape. `DrawerMetadataContext` is refactored to key by `packageName` instead of synthetic IDs. Dock reads pinned apps from metadata context. `AppState` listener triggers re-fetch on resume.

**Tech Stack:** react-native-get-app-list, expo-intent-launcher, react-native-svg, react-native-mmkv, heroui-native/uniwind

---

### Product Decisions Locked

- **App list source:** `react-native-get-app-list` (package names, app names, base64 icons)
- **App launching:** `expo-intent-launcher.openApplication(packageName)`
- **App icons:** `expo-intent-launcher.getApplicationIconAsync(packageName)` as fallback; primary source is bundled icons from app list
- **Icon caching:** MMKV keyed by `packageName`, re-fetch on resume via `AppState`
- **Icon shape masking:** SVG `<ClipPath>` for 6 shapes: circle, square, rounded-square, squircle, teardrop, hexagon
- **Metadata key:** `packageName` (migrated from synthetic `app-{index}` IDs)
- **Mock data:** Removed entirely — `lib/mock-apps.ts` deleted
- **Auto-pin on first launch:** Phone, Contacts, Messages, Camera, Chrome by common package names. Fill to 5 with first alphabetical apps.
- **Grid settings:** Column count (existing) + `showLabels` toggle (new)
- **Dock:** Populated from pinned apps in `DrawerMetadataContext`, respects `dockRowCount` setting
- **Themed icons / Icon packs / Adaptive icons / Work profile:** SKIPPED (Custom Native Module)

---

### Packages to Install

```bash
npx expo install expo-intent-launcher
npm install react-native-get-app-list
```

`expo-intent-launcher` works in Expo Go. `react-native-get-app-list` requires dev client.

---

### Task 1: Install Dependencies

**Required skills:** `building-native-ui` (for Expo SDK + native package installation)

**Files:**

- Modify: `apps/native/package.json`
- Modify: `apps/native/app.json` (add `QUERY_ALL_PACKAGES` permission)

**Step 1: Install packages**

```bash
npx expo install expo-intent-launcher
npm install react-native-get-app-list
```

**Step 2: Add QUERY_ALL_PACKAGES permission**

In `app.json`, add the Android permission required by `react-native-get-app-list`:

```json
{
  "expo": {
    "android": {
      "permissions": ["android.permission.QUERY_ALL_PACKAGES"]
    }
  }
}
```

**Step 3: Rebuild dev client**

Since `react-native-get-app-list` has native code, a dev client rebuild is required:

```bash
npx expo prebuild --clean
npx expo run:android
```

**Step 4: Commit**

```
chore: install react-native-get-app-list and expo-intent-launcher
```

---

### Task 2: Create App List Data Layer

**Required skills:** `vercel-react-best-practices` (for context design, async state management, cache invalidation, and AppState lifecycle)

**Files:**

- Create: `apps/native/context/app-list.tsx`
- Create: `apps/native/lib/icon-cache.ts`

**Step 1: Create MMKV icon cache utility**

Create `lib/icon-cache.ts` that provides:

```ts
function getIconCache(): Record<string, string>; // packageName → base64 URI
function setIconCache(cache: Record<string, string>): void;
function getCachedIcon(packageName: string): string | null;
function setCachedIcon(packageName: string, base64Uri: string): void;
function removeCachedIcons(packageNames: string[]): void;
```

Use MMKV storage (same pattern as `lib/storage.ts`). Store the full `data:image/png;base64,...` URI string so it's ready for `<Image source={{ uri }}>` without transformation.

**Step 2: Create the InstalledApp type**

```ts
export interface InstalledApp {
  packageName: string; // primary key
  appName: string;
  icon: string | null; // base64 URI or null (cache miss / loading)
  letter: string; // first character of appName (fallback)
}
```

**Step 3: Create AppListContext**

A context provider that:

- On mount: calls `getInstalledApps()` from `react-native-get-app-list`
- Transforms the result into `InstalledApp[]` (attach `letter`, construct `data:image/png;base64,` URI for icons)
- Diffs against MMKV icon cache: cache new icons, remove uninstalled app entries
- Exposes `apps: InstalledApp[]` (sorted alphabetically by `appName`)
- Exposes `getApp(packageName): InstalledApp | undefined` for quick lookup
- Exposes `refresh(): Promise<void>` for manual re-fetch

**Step 4: Add AppState listener for resume re-fetch**

Inside the provider, listen for `AppState` changes:

```ts
useEffect(() => {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      refresh();
    }
  });
  return () => sub.remove();
}, []);
```

On each refresh:

1. Call `getInstalledApps()`
2. Diff package names against current list
3. Cache icons for new apps
4. Remove cache entries for uninstalled apps
5. Update the `apps` state

**Step 5: Handle platform fallback**

`react-native-get-app-list` is Android-only. On iOS, return an empty list. The drawer should handle this gracefully (show "No apps found" or similar).

**Step 6: Commit**

```
feat: add app list context with MMKV icon caching and resume refresh
```

---

### Task 3: Refactor DrawerMetadataContext to Use packageName Keys

**Required skills:** `vercel-react-best-practices` (for state migration, context refactoring, and data integrity)

**Files:**

- Modify: `apps/native/context/drawer-metadata.tsx`
- Modify: `apps/native/components/app-drawer/types.ts`
- Delete: `apps/native/lib/mock-apps.ts`

**Step 1: Update DrawerAppMetadata to use packageName**

Change the `appId` field to `packageName`:

```ts
export interface DrawerAppMetadata {
  packageName: string; // was: appId
  alias?: string;
  isPinned: boolean;
  pinnedOrder?: number;
  tagIds: string[];
}
```

**Step 2: Update DrawerApp type**

In `types.ts`, change `DrawerApp` from extending `MockApp` to using `InstalledApp`:

```ts
import type { InstalledApp } from "@/context/app-list";

export interface DrawerApp extends InstalledApp {
  alias?: string;
  displayLabel: string;
  isPinned: boolean;
  pinnedOrder?: number;
  tagIds: string[];
}
```

**Step 3: Remove all MockApp references**

- Remove `import { MOCK_APPS } from "@/lib/mock-apps"` from `drawer-metadata.tsx`
- Remove `const mockAppIds = new Set(MOCK_APPS.map(...))`
- Remove the `mockAppIds.has(appId)` check in `sanitizeState`
- Delete `lib/mock-apps.ts` entirely

**Step 4: Update seed logic for auto-pinning common apps**

Replace the current `seedState` that pins first 8 mock apps with smart auto-pinning by package name. The new `seedState` receives the installed app list and pins common apps:

```ts
const COMMON_APP_PACKAGES = [
  [
    "com.google.android.dialer",
    "com.android.dialer",
    "com.samsung.android.dialer",
  ],
  [
    "com.google.android.contacts",
    "com.android.contacts",
    "com.samsung.android.contacts",
  ],
  [
    "com.google.android.apps.messaging",
    "com.android.mms",
    "com.samsung.android.messaging",
  ],
  [
    "com.android.camera",
    "com.google.android.GoogleCamera",
    "com.samsung.android.camera",
  ],
  ["com.android.chrome", "org.mozilla.firefox"],
];

function findCommonApps(installedPackages: Set<string>): string[] {
  const pinned: string[] = [];
  for (const candidates of COMMON_APP_PACKAGES) {
    const found = candidates.find((pkg) => installedPackages.has(pkg));
    if (found) pinned.push(found);
  }
  return pinned;
}
```

If fewer than 5 common apps found, fill remaining slots with the first alphabetical installed apps (excluding already-pinned ones).

**Step 5: Update all metadata actions to use packageName**

Replace every `appId` parameter with `packageName` in:

- `setPinned(packageName, isPinned)`
- `setAlias(packageName, alias)`
- `setAppTags(packageName, tagIds)`
- `reorderPinnedApps(packageNames)`

**Step 6: Update helper functions**

- `getDisplayLabelForApp(app: InstalledApp, state)` — use `app.packageName` as key
- `getOrderedPinnedAppIds` → rename to `getOrderedPinnedPackages`

**Step 7: Make DrawerMetadataProvider depend on AppListContext**

The metadata provider needs the installed app list to seed correctly. Either:

- Accept `installedApps` as a prop
- Or consume `AppListContext` internally

Prefer the prop approach to keep context dependencies explicit.

**Step 8: Commit**

```
feat: refactor drawer metadata to use packageName keys, drop mock data
```

---

### Task 4: Create SVG Icon Shape Masking Utility

**Required skills:** `building-components` (for composable icon shape component), `vercel-react-native-skills` (for SVG rendering and image performance)

**Files:**

- Create: `apps/native/lib/icon-shapes.ts`

**Step 1: Define SVG clipPath generators for each shape**

Create a function `getIconClipPath(shape: IconShape, size: number): string` that returns SVG path data for each shape:

```ts
export function getIconClipPath(shape: IconShape, size: number): string {
  const s = size;
  const r = s / 2;

  switch (shape) {
    case "circle":
      // Circle path using arc commands
      return `M ${r},0 A ${r},${r} 0 1,1 ${r},${s} A ${r},${r} 0 1,1 ${r},0 Z`;

    case "square":
      return `M 0,0 H ${s} V ${s} H 0 Z`;

    case "rounded-square":
      // Square with ~20% corner radius
      return roundedRectPath(0, 0, s, s, s * 0.2);

    case "squircle":
      // Superellipse (iOS-style continuous curve)
      return squirclePath(s);

    case "teardrop":
      // Rounded on 3 corners, sharp on top-right
      return teardropPath(s);

    case "hexagon":
      return hexagonPath(s);
  }
}
```

**Step 2: Implement each shape path**

- **Squircle:** Use the superellipse formula `|x|^n + |y|^n = r^n` with n=4 or n=5 (approximate with cubic bezier). Reference Kvaesitso's `SquircleShape` which uses `pow(3)` and `cbrt`.
- **Teardrop:** Three rounded corners + one sharp corner. Use arc commands for the rounded corners.
- **Hexagon:** Regular hexagon using 6 points at 60-degree intervals.
- **Rounded rect:** Standard SVG rounded rect path with arc corners.

**Step 3: Export as reusable utility**

The function is pure (no React) — takes shape + size, returns path string. This keeps it testable and reusable across `AppIcon`, dock icons, etc.

**Step 4: Commit**

```
feat: add SVG icon shape clip path generators for 6 shapes
```

---

### Task 5: Rewrite AppIcon Component with Real Icons + Shape Masking

**Required skills:** `building-components` (for accessible, composable icon architecture), `vercel-react-native-skills` (for image performance and SVG clip rendering), `heroui-native` (for className styling tokens)

**Files:**

- Modify: `apps/native/components/app-icon.tsx`

**Step 1: Update props interface**

Replace `letter`-based props with icon-aware props:

```ts
interface AppIconProps {
  packageName: string;
  label: string;
  letter: string; // fallback when no icon
  icon?: string | null; // base64 URI from app list
  isPinned?: boolean;
  showLabel?: boolean; // from settings
  iconShape?: IconShape; // from settings
  onPress?: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  size?: number;
  onLayout?: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
}
```

**Step 2: Render icon with SVG clipPath masking**

When `icon` is provided (base64 URI):

```tsx
import Svg, { ClipPath, Path, Image as SvgImage } from "react-native-svg";

const clipId = `icon-clip-${packageName}`;
const clipPathData = getIconClipPath(iconShape ?? "circle", size);

<Svg width={size} height={size}>
  <ClipPath id={clipId}>
    <Path d={clipPathData} />
  </ClipPath>
  <SvgImage
    href={{ uri: icon }}
    width={size}
    height={size}
    clipPath={`url(#${clipId})`}
    preserveAspectRatio="xMidYMid slice"
  />
</Svg>;
```

**Step 3: Keep letter fallback**

When `icon` is null/undefined, render the existing letter-circle but apply the same shape clip path instead of always using `borderRadius: size / 2`.

**Step 4: Respect showLabel setting**

Only render the label `<Text>` below the icon when `showLabel` is true.

**Step 5: Keep existing features**

Preserve: `isPinned` badge, `onPress`, `onLongPress`, `onLayout`, `forwardRef`, `delayLongPress`.

**Step 6: Commit**

```
feat: rewrite AppIcon with real icons, SVG shape masking, and label toggle
```

---

### Task 6: Update App Drawer to Use Real App Data

**Required skills:** `vercel-react-native-skills` (for list performance — memoized items, stable callbacks, FlashList consideration), `vercel-react-best-practices` (for derived state from two contexts)

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`
- Modify: `apps/native/components/app-drawer/action-menu.tsx`
- Modify: `apps/native/components/app-drawer/types.ts`

**Step 1: Replace MOCK_APPS with AppListContext**

In `app-drawer.tsx`:

- Remove `import { MOCK_APPS } from "@/lib/mock-apps"`
- Add `import { AppListContext } from "@/context/app-list"`
- Read `const appList = use(AppListContext)`
- Use `appList.apps` wherever `MOCK_APPS` was used

**Step 2: Build DrawerApp from InstalledApp + metadata**

Merge installed app data with drawer metadata to create `DrawerApp` objects:

```ts
const drawerApps: DrawerApp[] = useMemo(() => {
  return appList.apps.map((app) => {
    const meta = drawerMeta.state.apps[app.packageName];
    return {
      ...app,
      alias: meta?.alias,
      displayLabel: meta?.alias ?? app.appName,
      isPinned: meta?.isPinned ?? false,
      pinnedOrder: meta?.pinnedOrder,
      tagIds: meta?.tagIds ?? [],
    };
  });
}, [appList.apps, drawerMeta.state.apps]);
```

**Step 3: Pass icon and shape props to AppIcon**

Read `iconShape` and `showLabels` from `SettingsContext.state.icons`:

```tsx
<AppIcon
  packageName={app.packageName}
  label={app.displayLabel}
  letter={app.letter}
  icon={app.icon}
  isPinned={app.isPinned}
  iconShape={iconSettings.iconShape}
  showLabel={iconSettings.showLabels}
  onPress={() => handleLaunch(app.packageName)}
  onLongPress={(e) => handleLongPress(app, e)}
  size={iconSize}
/>
```

**Step 4: Wire app launching**

Create a `handleLaunch` function:

```ts
import { openApplication } from "expo-intent-launcher";

const handleLaunch = useCallback((packageName: string) => {
  openApplication(packageName);
}, []);
```

**Step 5: Wire action menu actions**

In `action-menu.tsx`, implement the stub callbacks:

- **Launch:** `openApplication(packageName)`
- **App Info:** `startActivityAsync(ActivityAction.APPLICATION_DETAILS_SETTINGS, { data: \`package:${packageName}\` })`
- **Uninstall:** `startActivityAsync("android.intent.action.DELETE", { data: \`package:${packageName}\` })`

**Step 6: Update search to use real app names**

The existing search filters by `displayLabel`. This continues to work since `DrawerApp.displayLabel` is now the real app name (or alias). No changes needed to search logic itself.

**Step 7: Commit**

```
feat: wire app drawer to real installed app data with launching
```

---

### Task 7: Update Dock to Show Pinned Apps

**Required skills:** `vercel-react-best-practices` (for derived state from context), `heroui-native` (for styling)

**Files:**

- Modify: `apps/native/components/dock-row.tsx`

**Step 1: Replace hardcoded dock items with pinned apps**

Read from `DrawerMetadataContext` and `AppListContext`:

```tsx
const appList = use(AppListContext);
const drawerMeta = use(DrawerMetadataContext);
const settings = use(SettingsContext);

const columns = config?.state.gridColumns ?? 5;
const dockRowCount = settings?.state.homescreen.dockRowCount ?? 1;
const maxDockApps = columns * dockRowCount;

const dockApps = useMemo(() => {
  const pinnedPackages = getOrderedPinnedPackages(drawerMeta.state);
  return pinnedPackages.slice(0, maxDockApps).flatMap((pkg) => {
    const app = appList.getApp(pkg);
    return app ? [app] : [];
  });
}, [drawerMeta.state, appList, maxDockApps]);
```

**Step 2: Render with real icons and shape**

```tsx
{
  dockApps.map((app) => (
    <AppIcon
      key={app.packageName}
      packageName={app.packageName}
      label={app.appName}
      letter={app.letter}
      icon={app.icon}
      iconShape={iconSettings.iconShape}
      showLabel={iconSettings.showLabels}
      onPress={() => openApplication(app.packageName)}
      size={52}
    />
  ));
}
```

**Step 3: Handle empty dock**

If no pinned apps exist (fresh install before seeding completes), show nothing or a subtle "Long-press apps to pin" hint.

**Step 4: Respect dockEnabled setting**

Check `settings.state.homescreen.dockEnabled` — if false, don't render the dock at all. This is already handled in `app/index.tsx` but verify.

**Step 5: Commit**

```
feat: wire dock row to show pinned apps with real icons
```

---

### Task 8: Add showLabels Setting + Disable Custom-Only Icon Settings

**Required skills:** `vercel-react-best-practices` (for settings state), `heroui-native` (for settings UI)

**Files:**

- Modify: `apps/native/types/settings.ts`
- Modify: `apps/native/app/settings/icons.tsx`

**Step 1: Add showLabels to IconSettings**

```ts
export interface IconSettings {
  iconShape: IconShape;
  showLabels: boolean; // NEW
  themedIcons: boolean;
  forceThemedIcons: boolean;
  adaptify: boolean;
  iconPack: string;
}
```

Default: `showLabels: true`.

**Step 2: Add to DEFAULT_SETTINGS**

```ts
icons: {
  adaptify: true,
  forceThemedIcons: false,
  iconPack: "default",
  iconShape: "circle",
  showLabels: true,        // NEW
  themedIcons: false,
},
```

**Step 3: Add showLabels toggle to icons settings page**

Add a `SwitchPreference` in the "Icon Shape" category:

```tsx
<SwitchPreference
  icon="label"
  title="Show Labels"
  summary="Display app names below icons"
  value={icons.showLabels}
  onValueChange={(v) => actions.updateIcons({ showLabels: v })}
/>
```

**Step 4: Disable custom-only settings**

Add `disabled` and summary notes to settings that require custom native modules:

```tsx
<SwitchPreference
  title="Themed Icons"
  summary="Requires native module (coming soon)"
  value={icons.themedIcons}
  onValueChange={(v) => actions.updateIcons({ themedIcons: v })}
  disabled
/>
<SwitchPreference
  title="Adaptify"
  summary="Requires native module (coming soon)"
  value={icons.adaptify}
  onValueChange={(v) => actions.updateIcons({ adaptify: v })}
  disabled
/>
```

**Step 5: Commit**

```
feat: add showLabels setting, disable custom-only icon settings
```

---

### Task 9: Wire AppListProvider into Root Layout

**Required skills:** `vercel-react-best-practices` (for provider ordering and dependency flow)

**Files:**

- Modify: `apps/native/app/_layout.tsx`

**Step 1: Add AppListProvider to the provider tree**

Place `AppListProvider` **before** `DrawerMetadataProvider` since the metadata provider depends on the app list for seeding:

```tsx
<SettingsProvider>
  <OrientationLock />
  <ThemeOverridesProvider>
    <LauncherConfigProvider>
      <AppListProvider>
        <DrawerMetadataProvider installedApps={...}>
          <WidgetConfigProvider>
            <Stack>...</Stack>
          </WidgetConfigProvider>
        </DrawerMetadataProvider>
      </AppListProvider>
    </LauncherConfigProvider>
  </ThemeOverridesProvider>
</SettingsProvider>
```

**Step 2: Pass installed apps to DrawerMetadataProvider**

If using the prop approach from Task 3, create a bridge component that consumes `AppListContext` and passes apps to `DrawerMetadataProvider`:

```tsx
function AppProviders({ children }: { children: React.ReactNode }) {
  const appList = use(AppListContext);
  return (
    <DrawerMetadataProvider
      installedPackages={appList.apps.map((a) => a.packageName)}
    >
      {children}
    </DrawerMetadataProvider>
  );
}
```

**Step 3: Commit**

```
feat: wire AppListProvider into root layout provider tree
```

---

### Task 10: Validate Behavior and Regressions

**Required skills:** `vercel-react-native-skills` (for performance verification), `vercel-react-best-practices` (for ensuring no unnecessary re-renders)

**Step 1: App list verification**

Verify:

- App drawer shows real installed apps with actual names
- App icons render as base64 images (not letter circles)
- Icons are clipped to the selected shape (change shape in settings → icons update)
- Search filters real app names correctly
- Alphabetical sorting works

**Step 2: App launching verification**

Verify:

- Tap an app in drawer → app opens
- Tap an app in dock → app opens
- Return to launcher → app list is intact
- Long-press → action menu → "Launch" works
- Long-press → action menu → "App Info" opens system app info
- Long-press → action menu → "Uninstall" triggers system uninstall dialog

**Step 3: Icon caching verification**

Verify:

- First launch: icons load (may show letter fallback briefly, then icons appear)
- Second launch: icons load instantly from MMKV cache
- Install a new app → return to launcher → new app appears with icon
- Uninstall an app → return to launcher → app disappears

**Step 4: Dock verification**

Verify:

- Dock shows real pinned apps (auto-pinned common apps on first launch)
- Dock respects `dockRowCount` setting (1-3 rows)
- Pin/unpin an app → dock updates
- Dock icons have correct shape masking

**Step 5: Settings verification**

Verify:

- Icon Shape selector → all 6 shapes render correctly on real icons
- Show Labels toggle → labels appear/disappear in drawer and dock
- Themed Icons / Adaptify → disabled with "coming soon" note

**Step 6: Regression verification**

Verify:

- Pinning/unpinning still works
- Tags still work
- Aliasing still works
- Edit sheet drag-and-drop still works
- Widget panel still opens/closes
- Clock, battery, charging animation still work
- No performance regressions (smooth scrolling through 100+ app icons)
- Back handler still works for drawer/widget panel

---

### Acceptance Criteria

- App drawer shows real installed apps from `react-native-get-app-list`
- App icons render as base64 images with SVG shape masking
- 6 icon shapes work and are selectable from settings
- Tapping apps launches them via `expo-intent-launcher`
- Long-press menu has functional Launch, App Info, and Uninstall actions
- Icons are cached in MMKV and load instantly on subsequent launches
- App list refreshes on resume (detects installs/uninstalls)
- Dock shows pinned apps with real icons
- Common apps (Phone, Contacts, Messages, Camera, Chrome) auto-pinned on first launch
- `showLabels` toggle controls label visibility
- Themed Icons and Adaptify settings disabled with "coming soon"
- All metadata (pins, tags, aliases) keyed by `packageName`
- `lib/mock-apps.ts` deleted, no mock data remains
- No regressions in existing functionality (drawer gestures, search, widgets, clock, battery)

---

### Implementation Notes

- Load `vercel-react-native-skills` before writing list rendering code — follow memoization and callback stabilization patterns
- Load `building-native-ui` before using `expo-intent-launcher` APIs
- Load `building-components` before rewriting `AppIcon` — follow accessible component patterns
- The `AppListContext` is the single source of truth for installed apps — all other consumers read from it
- `DrawerMetadataContext` only stores user preferences (pins, tags, aliases) — never app data
- MMKV icon cache key format: `icon-cache` → `Record<packageName, base64URI>`
- SVG `<ClipPath>` with unique IDs per icon: use `packageName` hash to avoid ID collisions in flat lists
- `react-native-get-app-list` filters system apps by default — only user-installed apps appear
- `expo-intent-launcher.openApplication` returns void (fire-and-forget). No error handling needed for launch.
- For uninstall intent, use `startActivityAsync("android.intent.action.DELETE", { data: \`package:${packageName}\` })`
- The `AppState` listener fires on every foreground transition — keep the refresh fast (diff-based, not full re-cache)
- Run `bun x ultracite fix` before each commit to format code
