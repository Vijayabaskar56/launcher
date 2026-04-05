# Widget Host Nitro Module Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task.
>
> - `build-nitro-modules` for scaffolding, HybridObject/HybridView spec authoring, nitro.json config, Nitrogen codegen, Kotlin implementation
> - `react-native-best-practices` for New Architecture considerations, native module integration patterns
> - `vercel-react-best-practices` for hook design, context boundaries, effect lifecycle
> - `heroui-native` for HeroUI component usage in widget picker, error state UI
> - `building-components` for accessible, composable widget wrapper components
> - `agent-device` for automated device testing

**Goal:** Build a `react-native-widget-host` Nitro module that enables hosting native Android AppWidgets inside React Native views. Includes: widget provider discovery, allocation/bind/configure flow, native `HybridView` rendering, lifecycle management, error handling with Remove/Replace UI, and unified widget picker.

**Reference:** [POC launcher-kit AppWidgetHostModule.kt](file:///Users/vijayabaskar/work/super-launcher/packages/launcher-kit/android/src/main/kotlin/expo/modules/launcherkit/AppWidgetHostModule.kt) — widget allocation, binding, activity result handling
**Reference:** [POC launcher-kit AppWidgetHostViewManager.kt](file:///Users/vijayabaskar/work/super-launcher/packages/launcher-kit/android/src/main/kotlin/expo/modules/launcherkit/AppWidgetHostViewManager.kt) — native view wrapping, sizing, touch handling
**Reference:** [Kvaesitso AppWidgetHost.kt](file:///Users/vijayabaskar/work/references/Kvaesitso/app/ui/src/main/java/de/mm20/launcher2/ui/launcher/widgets/external/AppWidgetHost.kt) — Compose wrapper, theme color injection, nested scroll
**Reference:** [Existing Nitro modules](file:///Users/vijayabaskar/work/launcher/packages/) — scaffolding pattern, Kotlin implementation

---

### Design Decisions Locked

- **Architecture:** New Nitro module (`react-native-widget-host`) with `HybridObject` for lifecycle + `HybridView` for rendering
- **Bind flow:** Fully native async — `allocateAndBindWidget(provider): Promise<number>`. Native handles system permission + configure activities internally, returns widget ID
- **Widget updates:** Automatic — `AppWidgetHostView` receives `RemoteViews` from the system with no JS involvement
- **Host lifecycle:** Auto-managed — registers `ActivityLifecycleCallbacks`, calls `startListening()` on RESUMED, `stopListening()` on PAUSED
- **View sizing:** Props (`widgetWidth`, `widgetHeight`) as initial hints, `onLayout()` measurements as truth. `updateAppWidgetSize()` called with actual dimensions
- **Error handling:** `onStatusChange(callback)` via `hybridRef` reports `"loading"` / `"ready"` / `"error"`. JS shows Remove/Replace error UI
- **Widget list:** Unified — built-in JS widgets and native Android widgets in same `widgetOrder` array. IDs: `"clock"` (built-in), `"native:12345"` (native)
- **Widget picker:** Combined bottom sheet — built-in widgets first, then app widgets grouped by app, searchable
- **Persistence:** Extend existing `widget-config.tsx` — `nativeWidgets` record stores `appWidgetId`, `provider`, `label` per native widget
- **iOS:** Empty stubs

---

### TypeScript API

```typescript
import type {
  HybridObject,
  HybridView,
  HybridViewProps,
  HybridViewMethods,
} from "react-native-nitro-modules";

// --- HybridObject: Widget host service ---

interface WidgetProviderInfo {
  provider: string; // ComponentName flattened string
  packageName: string;
  label: string;
  minWidth: number; // pixels
  minHeight: number; // pixels
}

interface WidgetHostService extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  getInstalledWidgetProviders(): WidgetProviderInfo[];
  allocateAndBindWidget(provider: string): Promise<number>;
  deleteWidget(widgetId: number): void;
}

// --- HybridView: Native widget renderer ---

interface AppWidgetViewProps extends HybridViewProps {
  appWidgetId: number;
  widgetWidth: number; // dp
  widgetHeight: number; // dp
}

interface AppWidgetViewMethods extends HybridViewMethods {
  onStatusChange(callback: (status: string) => void): void;
}

export type AppWidgetView = HybridView<
  AppWidgetViewProps,
  AppWidgetViewMethods
>;
```

---

### Task 1: Scaffold the Nitro module

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-widget-host/` (full scaffold)

**Step 1: Create directory structure**

Mirror the `react-native-launcher-service` pattern:

- `src/specs/widget-host.nitro.ts`
- `src/index.ts`
- `android/` with `build.gradle`, `CMakeLists.txt`, `gradle.properties`, `fix-prefab.gradle`
- `android/src/main/cpp/cpp-adapter.cpp`
- `android/src/main/AndroidManifest.xml`
- `ios/Bridge.h`
- `nitro.json`, `package.json`, `tsconfig.json`, `babel.config.js`, `react-native.config.js`
- `NitroWidgetHost.podspec`

**Step 2: Configure nitro.json**

```json
{
  "$schema": "https://nitro.margelo.com/nitro.schema.json",
  "cxxNamespace": ["widgethost"],
  "ios": {
    "iosModuleName": "NitroWidgetHost"
  },
  "android": {
    "androidNamespace": ["widgethost"],
    "androidCxxLibName": "NitroWidgetHost"
  },
  "autolinking": {
    "WidgetHostService": {
      "android": {
        "language": "kotlin",
        "implementationClassName": "HybridWidgetHostService"
      }
    },
    "AppWidgetView": {
      "android": {
        "language": "kotlin",
        "implementationClassName": "HybridAppWidgetView"
      }
    }
  },
  "ignorePaths": ["**/node_modules"]
}
```

Note: Two autolinking entries — one for the `HybridObject` (service), one for the `HybridView` (renderer).

**Step 3: Commit**

```
chore: scaffold react-native-widget-host Nitro module
```

---

### Task 2: Write the TypeScript specs and run codegen

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-widget-host/src/specs/widget-host.nitro.ts`
- Create: `packages/react-native-widget-host/src/index.ts`

**Step 1: Write the spec**

Write both the `WidgetHostService` HybridObject and the `AppWidgetView` HybridView in the same spec file, as defined in the **TypeScript API** section above. Include the `WidgetProviderInfo` interface.

**Step 2: Export from index.ts**

```typescript
import { NitroModules, getHostComponent } from "react-native-nitro-modules"
import type { WidgetHostService, AppWidgetView, WidgetProviderInfo } from "./specs/widget-host.nitro"

export const widgetHostService =
  NitroModules.createHybridObject<WidgetHostService>("WidgetHostService")

// Native view component — use getHostComponent for HybridView
export const NativeAppWidgetView = getHostComponent<...>("AppWidgetView", ...)

export type { WidgetHostService, AppWidgetView, WidgetProviderInfo }
```

Note: The exact `getHostComponent` usage depends on the Nitro HybridView API. Consult `react-native-nitro-modules/src/views/` for the correct signature.

**Step 3: Run Nitrogen codegen**

```bash
cd packages/react-native-widget-host && npx nitrogen
```

Verify generated files include both `HybridWidgetHostServiceSpec.kt` and `HybridAppWidgetViewSpec.kt`.

**Step 4: Commit**

```
feat: add WidgetHostService and AppWidgetView specs and run codegen
```

---

### Task 3: Implement AppWidgetHostManager (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-widget-host/android/src/main/java/com/margelo/nitro/widgethost/AppWidgetHostManager.kt`

**Step 1: Build the singleton host manager**

Manages the `AppWidgetHost` singleton and lifecycle. Follow the POC's `AppWidgetHostModule.kt` pattern:

- **Singleton host:** `AppWidgetHost(context, HOST_ID)` with `HOST_ID = 1024`
- **Custom host class:** `LauncherAppWidgetHost` extends `AppWidgetHost`, overrides `onCreateView()` to return `TrackedAppWidgetHostView` (tracks ready/error state)
- **Lifecycle auto-management:** Register `Application.ActivityLifecycleCallbacks` on init
  - `onActivityResumed()` → `host.startListening()`
  - `onActivityPaused()` → `host.stopListening()`
  - Wrap in try-catch (both can throw)
- **`allocateAndBindWidget(provider): Promise<number>`:**
  - Allocate ID via `host.allocateAppWidgetId()`
  - Try `bindAppWidgetIdIfAllowed()`
  - If denied: launch `ACTION_APPWIDGET_BIND` via `currentActivity.startActivityForResult()`
  - Register `ActivityEventListener` to capture result
  - If widget has configure activity: launch it via `host.startAppWidgetConfigureActivityForResult()`
  - Resolve promise with widget ID on success, reject + cleanup on cancel
- **`deleteWidget(widgetId)`:** `host.deleteAppWidgetId(widgetId)`
- **`getInstalledWidgetProviders()`:** Query `AppWidgetManager.installedProviders`, filter hidden (API 28+), return `WidgetProviderInfo` array

**Step 2: Build TrackedAppWidgetHostView**

Extend `AppWidgetHostView` to track rendering state:

- Override `updateAppWidget(RemoteViews)` — set status to `"ready"` on successful update
- Catch errors — set status to `"error"`
- Expose `statusCallback: ((String) -> Unit)?` for the HybridView to subscribe

**Step 3: Commit**

```
feat: add AppWidgetHostManager with singleton host, lifecycle, and bind flow
```

---

### Task 4: Implement HybridAppWidgetView (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-widget-host/android/src/main/java/com/margelo/nitro/widgethost/HybridAppWidgetView.kt`

**Step 1: Implement the HybridView**

Extend the generated `HybridAppWidgetViewSpec` (which extends Nitro's `HybridView`):

- **`val view: View`** — Return a `FrameLayout` container that holds the `AppWidgetHostView`
- **Props:** `appWidgetId`, `widgetWidth`, `widgetHeight` — implemented as Kotlin properties
- **`afterUpdate()`** — Called when props change. If `appWidgetId` changed:
  1. Remove previous `AppWidgetHostView` from container
  2. Get shared host from `AppWidgetHostManager`
  3. Call `host.createView(context, widgetId, providerInfo)`
  4. Enable nested scroll (recursive `isNestedScrollingEnabled = true` on ListView/ScrollView)
  5. Set touch listener to prevent parent interception
  6. Call `setAppWidget(widgetId, providerInfo)`
  7. Add to container
- **`onLayout()`** — Measure actual dimensions, call `updateAppWidgetSize()` with real dp values
  - API 31+: `updateAppWidgetSize(Bundle(), listOf(SizeF(widthDp, heightDp)))`
  - Pre-31: `updateAppWidgetSize(null, widthDp, heightDp, widthDp, heightDp)`
- **`onStatusChange(callback)`** — Subscribe to the `TrackedAppWidgetHostView`'s status callback
- **`onDropView()`** — Clean up: remove host view from container

**Step 2: Commit**

```
feat: add HybridAppWidgetView with native widget rendering and sizing
```

---

### Task 5: Implement HybridWidgetHostService (Kotlin)

**Required skills:** `build-nitro-modules`

**Files:**

- Create: `packages/react-native-widget-host/android/src/main/java/com/margelo/nitro/widgethost/HybridWidgetHostService.kt`
- Create: `packages/react-native-widget-host/android/src/main/java/com/margelo/nitro/widgethost/NitroWidgetHostPackage.kt`

**Step 1: Implement the HybridObject**

Extend the generated `HybridWidgetHostServiceSpec`. Delegate to `AppWidgetHostManager`:

- **`getInstalledWidgetProviders()`** → `AppWidgetHostManager.getInstalledWidgetProviders()`
- **`allocateAndBindWidget(provider)`** → `AppWidgetHostManager.allocateAndBindWidget(provider)` (returns `Promise<Double>`)
- **`deleteWidget(widgetId)`** → `AppWidgetHostManager.deleteWidget(widgetId)`

**Step 2: Register package**

Create `NitroWidgetHostPackage.kt` (same pattern as other modules).

**Step 3: Commit**

```
feat: implement HybridWidgetHostService wiring to AppWidgetHostManager
```

---

### Task 6: Extend widget-config.tsx for native widgets

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/context/widget-config.tsx`

**Step 1: Expand types**

```typescript
// Widget IDs are now strings — "clock", "battery", "native:12345"
export type WidgetId = string;

export interface NativeWidgetInfo {
  appWidgetId: number;
  provider: string;
  label: string;
}

export interface WidgetConfigState {
  activeWidgetIds: string[];
  widgetOpacity: number;
  widgetOrder: string[];
  widgetSizes: Record<string, WidgetSize>;
  nativeWidgets: Record<string, NativeWidgetInfo>; // keyed by "native:{id}"
}
```

**Step 2: Add actions**

```typescript
addNativeWidget(appWidgetId: number, provider: string, label: string): string  // returns "native:{id}"
removeNativeWidget(widgetId: string): void  // also calls deleteWidget on native side
replaceNativeWidget(widgetId: string, newAppWidgetId: number, provider: string, label: string): void
```

**Step 3: Update sanitization**

Sanitize `nativeWidgets` record on load. Handle legacy state without `nativeWidgets` field gracefully.

**Step 4: Commit**

```
feat: extend widget config to support native Android widgets
```

---

### Task 7: Update widget panel to render native widgets

**Required skills:** `vercel-react-best-practices`, `heroui-native`

**Files:**

- Modify: `apps/native/components/widget-panel.tsx`
- Create: `apps/native/components/widgets/native-widget-card.tsx`

**Step 1: Build NativeWidgetCard**

A wrapper component for native Android widgets:

- Renders `<NativeAppWidgetView>` inside the standard widget card styling
- Subscribes to `onStatusChange` via `hybridRef`
- On `"error"` status: shows error UI with warning icon, "App widget failed to load" text, Remove and Replace buttons
- On `"loading"`: shows subtle loading indicator
- On `"ready"`: shows the native widget

**Step 2: Update widget panel rendering**

In the widget panel's render loop, check if the widget ID starts with `"native:"`:

- If yes → render `<NativeWidgetCard>`
- If no → render built-in widget component from `WIDGET_MAP`

**Step 3: Commit**

```
feat: render native Android widgets in widget panel with error handling
```

---

### Task 8: Update widget picker to show native widget providers

**Required skills:** `heroui-native`, `building-components`

**Files:**

- Modify: `apps/native/components/widgets/add-widget-sheet.tsx`

**Step 1: Fetch providers**

On sheet mount, call `widgetHostService.getInstalledWidgetProviders()` to get available native widget providers.

**Step 2: Update UI**

Restructure the bottom sheet:

- **Section 1: "Built-in"** — existing 5 widgets (weather, clock, calendar, battery, music)
- **Section 2: "App widgets"** — native widget providers grouped by `packageName`, each row showing icon + label
- **Search** filters across both sections
- Tapping a native widget triggers `allocateAndBindWidget(provider)`, awaits the promise, then calls `addNativeWidget()` on the config

**Step 3: Commit**

```
feat: add native widget providers to widget picker with grouped display
```

---

### Task 9: Wire into app and install

**Required skills:** `react-native-best-practices`

**Files:**

- Modify: `apps/native/package.json` — add `"react-native-widget-host": "workspace:*"`

**Step 1: Install**

```bash
bun install
```

**Step 2: Prebuild**

```bash
npx expo prebuild --clean && npx expo run:android
```

**Step 3: Commit**

```
feat: wire react-native-widget-host into launcher app
```

---

### Task 10: Build and test on device

**Required skills:** `react-native-best-practices`

**Files:**

- No file changes — build and manual test

**Step 1: Test widget discovery**

- Open widget picker
- Verify native widget providers appear grouped by app
- Verify search filters providers correctly

**Step 2: Test widget binding**

- Tap a native widget provider (e.g. Google Calendar, Clock)
- Verify system bind permission dialog appears (if needed)
- Verify widget configuration activity launches (if applicable)
- Verify widget ID is returned and persisted

**Step 3: Test widget rendering**

- Verify native widget renders inside the widget panel card
- Verify widget updates automatically (e.g. clock ticks, weather refreshes)
- Verify widget scroll interaction works (for scrollable widgets like Calendar)
- Verify widget touch interaction works (tapping launches the widget's PendingIntent)

**Step 4: Test widget sizing**

- Verify widgets render at correct dimensions
- Verify size updates when container dimensions change

**Step 5: Test error handling**

- Uninstall an app that provides a widget
- Verify error state shows with "Remove" and "Replace" buttons
- Verify "Remove" deletes the widget and cleans up the ID
- Verify "Replace" opens the picker and swaps the widget

**Step 6: Test lifecycle**

- Background the app, wait, foreground — verify widgets update
- Rotate device (if unlocked) — verify widgets resize
- Kill and restart app — verify persisted widgets reload

**Step 7: Commit (if any fixes)**

```
fix: widget host edge case fixes from device testing
```

---

### Task 11: Automated device testing with agent-device

**Required skills:** `agent-device`

**Files:**

- No file changes — automated device verification

Use `agent-device` CLI to verify the widget host on a real device/emulator. Load the skill from the project root folder. Follow the default flow: bootstrap → exploration → verification.

**Step 1: Bootstrap**

Load `agent-device` skill references (`bootstrap-install.md` then `exploration.md`). Confirm correct Android target, dev client installed, app session open.

**Step 2: Verify widget panel**

- Swipe to open widget panel
- Use `snapshot` to verify built-in widgets render
- Verify "Edit widgets" pill is visible and tappable

**Step 3: Verify widget picker**

- Enter edit mode, tap "Add widget"
- Use `snapshot` to verify bottom sheet shows built-in + native widget sections
- Verify search input works

**Step 4: Verify native widget rendering**

- Add a native widget (e.g. Clock)
- Use `snapshot` to verify it renders in the widget panel
- Verify widget content is visible (not blank)

**Step 5: Verify error state**

- If testable: verify error UI appears for invalid widgets
- Verify Remove button works

**Step 6: Capture proof**

Use `snapshot` to capture final state. Close the app session.
