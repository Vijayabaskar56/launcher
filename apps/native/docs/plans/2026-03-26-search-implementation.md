# Search System Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task. **Do NOT reload a skill if it is already loaded in the current conversation context.**
>
> - `vercel-react-native-skills` for SectionList performance, keyboard handling, gesture integration
> - `vercel-react-best-practices` for hook design, context boundaries, derived state, debouncing, parallel async
> - `heroui-native` for HeroUI component usage, `className` token classes, `useThemeColor` hook
> - `vercel-composition-patterns` for compound component architecture (search result types, provider registry)
> - `building-components` for accessible, composable search result components
> - `native-data-fetching` for fetch patterns, error handling, caching with react-native-nitro-fetch

**Goal:** Build a full multi-provider search system matching Kvaesitso's search functionality. Replace the current app-only filtering with a unified search architecture that queries multiple providers (apps, calculator, unit converter, contacts, calendar, web search actions, Wikipedia, locations) and displays categorized results.

**Reference Direction:** Match Kvaesitso's search behavior:

- Pull-up drawer activates search — typing queries all enabled providers in parallel
- Results grouped by category in vertical list (replaces app grid when searching)
- Quick actions on query patterns (phone → call, email → compose, URL → open, math → calculate)
- Filter bar above keyboard for toggling result categories
- Usage-based ranking (frequently launched items score higher)
- Privacy-first: network-dependent providers disabled by default

**Architecture:** Provider-based search with dependency injection. Providers are pure functions — the `useSearch()` hook reads React contexts and passes data (app list, settings) to providers as arguments. Central search service dispatches queries in two tiers: instant tier (apps, calculator, converter, contacts, calendar) fires immediately, network tier (Wikipedia, location) fires after 500ms debounce. Results are scored (60% text match + 40% usage weight), deduplicated, and grouped by category for display in a `SectionList`.

**Tech Stack:** Expo Router, react-native-nitro-fetch, expo-contacts, expo-calendar, expo-location, mathjs, react-native-gesture-handler, heroui-native/uniwind, MMKV

---

### Product Decisions Locked

- **Search activation:** Existing pull-up drawer with search bar (already works)
- **Result display:** Vertical categorized `SectionList` replaces app grid when searching. Empty search = existing app grid.
- **Search bar blur:** Query persists until drawer closes or user taps X. No auto-clear on blur. Results list uses `keyboardShouldPersistTaps="handled"`.
- **Provider architecture:** Dependency injection — providers are pure functions, `useSearch()` hook passes context data as arguments
- **Ranking:** 60% text match + 40% usage frequency (tracked in MMKV)
- **Debouncing:** Two-tier — instant for local providers (apps, calculator, converter, contacts, calendar), 500ms for network providers (Wikipedia, location)
- **Network privacy:** Two-layer with persistence — settings enable providers, runtime network toggle stored in MMKV, globe icon in filter bar. Wikipedia, location, website search disabled by default.
- **Filter bar:** 5 coarse categories (Apps, Contacts, Calendar, Tools, Web). Only show pills for categories that have results in the current search.
- **Section order:** Quick Actions → Apps → Calculator/Converter → Contacts → Calendar → Wikipedia → Locations (matches Kvaesitso)
- **Contact tap behavior:** Default: expandable inline actions (call/message/email buttons). User can toggle `contactCallOnTap` in settings to switch to direct-call-on-tap.
- **Calculator tap:** Copy result to clipboard via React Native built-in `Clipboard` API
- **Long press:** Existing `ActionMenu` for app results only. Other result types: Phase 2.
- **Web search:** Single "Search [engine]" action. User picks default engine in settings (Google/DuckDuckGo/Bing/Custom URL).
- **Location GPS:** Opportunistic — bias results near user if GPS already granted (from weather), never prompt from search.
- **Permissions:** Soft prompt — first time a provider would fire, show "Tap to enable contact search" row instead of system dialog. User taps → system permission dialog. Silent disable if denied.
- **Tags & custom labels:** DEFERRED to Phase 2
- **Hidden items / visibility levels:** DEFERRED to Phase 2
- **App shortcuts:** SKIPPED — requires custom native module
- **File search:** SKIPPED — partial coverage, low priority

---

### Packages to Install

```bash
bun add --cwd apps/native mathjs expo-contacts expo-calendar expo-location
```

All work in dev client. `expo-contacts` and `expo-calendar` require runtime permissions.

---

### Task 1: Install Dependencies

**Required skills:** `building-native-ui`

**Files:**

- Modify: `apps/native/package.json`

**Step 1: Install packages**

```bash
bun add --cwd apps/native mathjs expo-contacts expo-calendar expo-location
```

**Step 2: Add TypeScript types for mathjs**

```bash
bun add --cwd apps/native -d @types/mathjs
```

**Step 3: Verify compatibility**

Run `npx expo doctor` to check SDK 55 compatibility.

**Step 4: Commit**

```
chore: install mathjs, expo-contacts, expo-calendar, expo-location for search
```

---

### Task 2: Define Search Types & Provider Interface

**Required skills:** `vercel-composition-patterns` (for provider registry pattern)

**Files:**

- Create: `apps/native/types/search.ts`

**Step 1: Define the core types**

```ts
export type SearchResultType =
  | "app"
  | "contact"
  | "calendar"
  | "calculator"
  | "unit-converter"
  | "wikipedia"
  | "location"
  | "action";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  icon?: string; // URI or icon name
  iconType?: "uri" | "ionicon" | "material";
  score: number; // 0-1, used for ranking
  data: unknown; // provider-specific payload
  onPress: () => void;
  onLongPress?: () => void;
}

// Contact-specific result data for expandable inline actions
export interface ContactResultData {
  contactId: string;
  phoneNumbers: { label: string; number: string }[];
  emails: { label: string; email: string }[];
  imageUri?: string;
}

export interface ProviderDeps {
  apps: InstalledApp[];
  launchApp: (packageName: string) => void;
  settings: SearchSettings;
  usageCounts: Record<string, number>;
  maxUsage: number;
  locationCoords?: { lat: number; lon: number }; // opportunistic GPS
}

export interface SearchProvider {
  type: SearchResultType;
  minQueryLength: number;
  tier: "instant" | "network";
  requiresNetwork: boolean;
  search: (query: string, deps: ProviderDeps) => Promise<SearchResult[]>;
}

// 5 coarse filter categories — only shown when category has results
export type SearchFilter = "apps" | "contacts" | "events" | "tools" | "web";

// Maps result types to filter categories
export const RESULT_TYPE_TO_FILTER: Record<SearchResultType, SearchFilter> = {
  app: "apps",
  contact: "contacts",
  calendar: "events",
  calculator: "tools",
  "unit-converter": "tools",
  wikipedia: "web",
  location: "web",
  action: "apps", // actions don't get filtered
};

// Display order matching Kvaesitso
export const SECTION_ORDER: SearchResultType[] = [
  "action",
  "app",
  "calculator",
  "unit-converter",
  "contact",
  "calendar",
  "wikipedia",
  "location",
];

export interface SearchActionMatch {
  type: "call" | "sms" | "email" | "url" | "web-search" | "create-event";
  label: string;
  icon: string;
  onPress: () => void;
}

// Permission state for soft prompts
export type PermissionState = "unknown" | "granted" | "denied" | "prompt";
```

**Step 2: Commit**

```
feat: define search types, provider interface, and result types
```

---

### Task 3: Build Search Service (Central Dispatcher)

**Required skills:** `vercel-react-best-practices` (for parallel async, debouncing, cleanup)

**Files:**

- Create: `apps/native/lib/search-service.ts`

**Step 1: Build the two-tier dispatcher**

The search service:

- Accepts registered `SearchProvider` instances
- On `search(query, deps, filters, allowNetwork)`:
  - Filters providers by enabled status and active filters
  - Skips providers where `query.length < provider.minQueryLength`
  - Skips network providers when `allowNetwork` is false
  - **Instant tier:** Dispatches all `tier: "instant"` providers immediately with `Promise.allSettled()`
  - **Network tier:** Waits 500ms, then dispatches `tier: "network"` providers. Cancel previous network timer on new query.
  - Merges results, deduplicates by `result.id`
  - Sorts by score descending within each type
  - Groups by `result.type`, ordered by `SECTION_ORDER`
- Returns results progressively — instant results first, network results appended when ready
- Uses AbortController to cancel in-flight network requests on new query

**Step 2: Build scoring utility**

```ts
export function scoreResult(
  textScore: number,
  usageCount: number,
  maxUsage: number
): number {
  const usageWeight = maxUsage > 0 ? usageCount / maxUsage : 0;
  return textScore * 0.6 + usageWeight * 0.4;
}
```

**Step 3: Build text matching utility**

```ts
export function matchScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t === q) return 1.0;
  if (t.startsWith(q)) return 0.95;
  // Word boundary match
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return 0.9;
  }
  if (t.includes(q)) return 0.85;
  return 0;
}
```

**Step 4: Commit**

```
feat: add search service with two-tier dispatch and scoring
```

---

### Task 4: Build App Search Provider

**Required skills:** `vercel-react-best-practices` (for derived state)

**Files:**

- Create: `apps/native/lib/search-providers/app-provider.ts`

**Step 1: Implement the provider**

- Pure function receiving `ProviderDeps` containing app list
- Filters apps by `matchScore()` against `appName` and `packageName`
- Score threshold: 0.8 (skip results below this)
- Boosts score with usage weight via `scoreResult()`
- `type: "app"`, `minQueryLength: 1`, `tier: "instant"`, `requiresNetwork: false`
- `onPress`: launch app via `deps.launchApp(packageName)`, call `recordLaunch()`
- `onLongPress`: pass through for existing `ActionMenu` in drawer

**Step 2: Commit**

```
feat: add app search provider
```

---

### Task 5: Build Calculator & Unit Converter Providers

**Required skills:** `vercel-react-best-practices` (for error handling)

**Files:**

- Create: `apps/native/lib/search-providers/calculator-provider.ts`
- Create: `apps/native/lib/search-providers/unit-converter-provider.ts`

**Step 1: Calculator provider**

- Lazy-imports `mathjs` on first call (`let mathInstance: typeof math | null = null`)
- Uses `math.evaluate()` to compute expressions
- Detects number base prefixes: `0x` (hex), `0b` (binary), `0` (octal) and shows conversions
- Returns result with expression as title and answer as subtitle
- `type: "calculator"`, `minQueryLength: 1`, `tier: "instant"`, `requiresNetwork: false`
- `onPress`: copy result to clipboard via `Clipboard.setString()`
- Catches eval errors silently (returns empty array)

**Step 2: Unit converter provider**

- Shares the lazy-loaded `mathjs` instance with calculator
- Detects pattern: `[number] [unit]` or `[number] [unit] to [unit]` or `[number] [unit] >> [unit]`
- Uses `math.evaluate('5 inch to cm')` for conversion
- Returns conversion result with input as title, converted value as subtitle
- `type: "unit-converter"`, `minQueryLength: 3`, `tier: "instant"`, `requiresNetwork: false`
- `onPress`: copy converted value to clipboard

**Step 3: Commit**

```
feat: add calculator and unit converter search providers
```

---

### Task 6: Build Contact Search Provider

**Required skills:** `building-native-ui` (for expo-contacts API), `vercel-react-best-practices` (for permission handling)

**Files:**

- Create: `apps/native/lib/search-providers/contact-provider.ts`

**Step 1: Implement contact search with soft permission prompt**

- On first call, check permission state via `Contacts.getPermissionsAsync()`
- If permission is `"undetermined"`: return a single "Tap to enable contact search" result
  - `onPress`: calls `Contacts.requestPermissionsAsync()`, stores result in MMKV
  - If granted, re-triggers search
  - If denied, stores "denied" — provider returns empty on future calls
- If permission is `"granted"`:
  - Uses `Contacts.getContactsAsync({ name: query })` with fields: Name, PhoneNumbers, Emails, Image
  - Maps contacts to `SearchResult` with `ContactResultData` in `data` field
  - `onPress` behavior depends on `contactCallOnTap` setting:
    - If `true`: call primary phone number via `Linking.openURL('tel:...')`
    - If `false`: no-op (result expands to show inline action buttons — handled by UI component)
- `type: "contact"`, `minQueryLength: 2`, `tier: "instant"`, `requiresNetwork: false`

**Step 2: Commit**

```
feat: add contact search provider with soft permission prompt
```

---

### Task 7: Build Calendar Search Provider

**Required skills:** `building-native-ui` (for expo-calendar API)

**Files:**

- Create: `apps/native/lib/search-providers/calendar-provider.ts`

**Step 1: Implement calendar event search with soft permission prompt**

- Same soft permission pattern as contacts — "Tap to enable calendar search" result on first call
- If granted:
  - Uses `Calendar.getEventsAsync()` with date range: today to +30 days
  - Filters events by `matchScore()` against event title
  - Maps to `SearchResult` with event title, formatted date/time as subtitle
  - `onPress`: open calendar event via `Linking.openURL()` with content URI
- `type: "calendar"`, `minQueryLength: 2`, `tier: "instant"`, `requiresNetwork: false`

**Step 2: Commit**

```
feat: add calendar search provider with expo-calendar
```

---

### Task 8: Build Wikipedia Search Provider

**Required skills:** `native-data-fetching` (for fetch with nitro-fetch, error handling)

**Files:**

- Create: `apps/native/lib/search-providers/wikipedia-provider.ts`

**Step 1: Implement Wikipedia search**

- Uses MediaWiki API: `https://en.wikipedia.org/w/api.php?action=opensearch&search=${query}&limit=5&format=json`
- Uses `react-native-nitro-fetch` for the request
- Maps results to `SearchResult` with article title as title, description as subtitle
- `type: "wikipedia"`, `minQueryLength: 4`, `tier: "network"`, `requiresNetwork: true`
- `onPress`: open Wikipedia article URL via `expo-web-browser`
- Returns empty on error (no crash)

**Step 2: Commit**

```
feat: add Wikipedia search provider
```

---

### Task 9: Build Location Search Provider

**Required skills:** `native-data-fetching`, `building-native-ui` (for expo-location)

**Files:**

- Create: `apps/native/lib/search-providers/location-provider.ts`

**Step 1: Implement location search via Nominatim**

- Uses Nominatim API: `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`
- Uses `react-native-nitro-fetch` for the request
- Requires `User-Agent` header (Nominatim policy)
- **Opportunistic GPS bias:** If `deps.locationCoords` is provided (GPS already granted from weather), append `&viewbox=` parameter to bias results near user. If not provided, search globally.
- Maps results to `SearchResult` with place name as title, type/address as subtitle
- `type: "location"`, `minQueryLength: 2`, `tier: "network"`, `requiresNetwork: true`
- `onPress`: open in maps app via `Linking.openURL('geo:lat,lon?q=name')`

**Step 2: Commit**

```
feat: add location search provider with Nominatim
```

---

### Task 10: Build Quick Actions (Query Pattern Matching)

**Required skills:** `vercel-react-best-practices` (for regex patterns)

**Files:**

- Create: `apps/native/lib/search-actions.ts`

**Step 1: Build query pattern matchers**

Detect patterns and return `SearchActionMatch[]`:

- **Phone number**: `/^\+?[\d\s\-().]{7,}$/` → Call + SMS actions
- **Email**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → Email action
- **URL**: `/^https?:\/\//` or matches common TLDs → Open URL action
- **Web search**: Always shown when query length >= 2 → single "Search [Engine]" action

The default web search engine is stored in settings. Supported engines:

```ts
const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=${1}",
  duckduckgo: "https://duckduckgo.com/?q=${1}",
  bing: "https://www.bing.com/search?q=${1}",
} as const;
```

User selects engine in integration settings. Custom URL template support in Phase 2.

Each action uses `expo-linking` / `expo-web-browser`:

- `Linking.openURL('tel:...')` for call
- `Linking.openURL('sms:...')` for SMS
- `Linking.openURL('mailto:...')` for email
- `WebBrowser.openBrowserAsync(url)` for URLs and web search

**Step 2: Add web search engine setting**

Add to `IntegrationSettings` in `types/settings.ts`:

```ts
export type SearchEngine = "google" | "duckduckgo" | "bing";

export interface IntegrationSettings {
  // ... existing fields ...
  searchEngine: SearchEngine;
}
```

Default: `"google"`. Add a `SelectPreference` in `app/settings/integrations.tsx` under a new "Search" category.

**Step 3: Commit**

```
feat: add search quick actions for phone, email, URL, and web search
```

---

### Task 11: Build Usage Tracking

**Required skills:** `vercel-react-best-practices` (for storage patterns)

**Files:**

- Create: `apps/native/lib/usage-tracker.ts`

**Step 1: Implement usage tracking with MMKV**

```ts
const USAGE_KEY = "search-usage-counts";

export function getUsageCounts(): Record<string, number> {
  /* read from MMKV */
}
export function recordLaunch(itemId: string): void {
  /* increment count, write to MMKV */
}
export function getMaxUsage(counts: Record<string, number>): number {
  /* return max count */
}
```

- Store launch counts per item ID in MMKV (same storage instance as settings)
- `recordLaunch()` called when user taps any search result
- Counts passed to providers via `ProviderDeps` for score calculation
- Normalize usage to 0-1 in `scoreResult()` using `count / maxCount`

**Step 2: Commit**

```
feat: add search usage tracking with MMKV
```

---

### Task 12: Build the useSearch() Hook

**Required skills:** `vercel-react-best-practices` (for hook design, cleanup, derived state)

**Files:**

- Create: `apps/native/hooks/use-search.ts`

**Step 1: Create the search hook**

Orchestrates the search service with dependency injection:

```ts
interface UseSearchResult {
  results: Map<SearchResultType, SearchResult[]>;
  actions: SearchActionMatch[];
  isSearching: boolean;
  activeFilters: Set<SearchFilter>;
  availableFilters: Set<SearchFilter>; // only filters with results
  toggleFilter: (filter: SearchFilter) => void;
  resetFilters: () => void;
  allowNetwork: boolean;
  toggleNetwork: () => void;
}

function useSearch(query: string): UseSearchResult;
```

- Reads `SearchSettings` from `SettingsContext` to determine enabled providers
- Reads app list from `AppListContext`
- Reads usage counts from MMKV via `getUsageCounts()`
- Reads `allowNetwork` from MMKV (persisted two-layer toggle, default `false`)
- Reads GPS coords opportunistically: check if location permission already granted, if so get last known position — never prompt
- Builds `ProviderDeps` and passes to search service
- Two-tier dispatch: instant providers fire on every query change, network timer resets and fires after 500ms
- AbortController cancels in-flight network requests when query changes
- Computes `availableFilters` from which result types have results
- Returns empty when query is empty

**Step 2: Commit**

```
feat: add useSearch hook with two-tier dispatch and dependency injection
```

---

### Task 13: Build Search Result Components

**Required skills:** `heroui-native` (for styling), `building-components` (for composable result components), `vercel-react-native-skills` (for SectionList performance)

**Files:**

- Create: `apps/native/components/search/search-result-item.tsx`
- Create: `apps/native/components/search/contact-result-item.tsx`
- Create: `apps/native/components/search/search-action-row.tsx`
- Create: `apps/native/components/search/search-results-list.tsx`
- Create: `apps/native/components/search/search-filter-bar.tsx`
- Create: `apps/native/components/search/permission-prompt-item.tsx`

**Step 1: SearchResultItem component**

A reusable row component for non-contact search results:

- Icon (left) — renders URI image, Ionicon, or MaterialIcon based on `iconType`
- Title + subtitle (center)
- `onPress` and `onLongPress` handlers (long press only wired for `type: "app"`)
- Pressable with feedback
- Memo-wrapped for SectionList performance

**Step 2: ContactResultItem component**

Expandable contact result (default behavior when `contactCallOnTap` is off):

- Collapsed: icon + name + primary phone/email subtitle
- Tapping expands to show inline action buttons:
  - Call button for each phone number
  - Message button for each phone number
  - Email button for each email
- Each action button uses `Linking.openURL()` with appropriate URI scheme
- When `contactCallOnTap` is on: skip expansion, directly call primary number
- Animated expand/collapse with Reanimated `Layout` transition

**Step 3: PermissionPromptItem component**

Soft permission prompt row:

- Icon (lock/shield) + "Tap to enable [type] search" text
- Muted styling to distinguish from real results
- `onPress`: triggers system permission dialog, updates provider state

**Step 4: SearchActionRow component**

Horizontal row of quick action pills shown at top of results:

- Each action is a pill button with icon + label
- Scrollable horizontally
- Only renders when `actions.length > 0`
- Fixed height, doesn't scroll with results

**Step 5: SearchResultsList component**

`SectionList` grouping results by type:

- Sections ordered by `SECTION_ORDER` constant
- Section header per type (e.g., "Apps", "Calculator", "Contacts")
- "Show All" button when a section has >3 results (collapsed by default, shows first 3)
- Auto-expands section when only one filter is active
- Empty state: "No results found"
- `keyboardDismissMode="on-drag"`
- `keyboardShouldPersistTaps="handled"`

**Step 6: SearchFilterBar component**

Horizontal pill bar:

- 5 pill buttons: Apps, Contacts, Calendar, Tools, Web
- **Only show pills for categories that have results** (`availableFilters` from hook)
- Active state: filled accent color. Inactive: outline/muted
- Globe icon for network toggle (filled when `allowNetwork` is true, outline when false)
- Scroll horizontal, fixed height (~44px)
- Only visible when `filterBarEnabled` setting is true AND search is active

**Step 7: Commit**

```
feat: add search result components, filter bar, action row, and contact expansion
```

---

### Task 14: Fix SearchBar Blur Behavior

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/components/search-bar.tsx`

**Step 1: Remove auto-clear on blur**

In `SearchBar.Input`, remove the `onBlur` handler that calls `deactivate()` (which clears the query). The query should persist until:

- User taps the X/clear button explicitly
- Drawer closes (already handled — drawer close resets search state)

**Step 2: Add clear button**

Replace the placeholder eye icon button in `SearchBar.Actions` with a clear/X button that:

- Only shows when `query.length > 0`
- Calls `actions.setQuery("")` and refocuses input
- Uses the existing `close` icon from `ICON_MAP`

**Step 3: Commit**

```
fix: persist search query on blur, add clear button
```

---

### Task 15: Wire Search into App Drawer

**Required skills:** `vercel-react-native-skills` (for keyboard handling), `heroui-native` (for styling)

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`

**Step 1: Replace basic app filtering with useSearch**

Replace the current `doesAppMatchQuery` / `useDeferredValue` filtering:

- When query is empty: show existing app drawer layout (PinnedSection + LauncherSection in grid)
- When query is non-empty: hide grid entirely, show `SearchActionRow` + `SearchFilterBar` + `SearchResultsList`
- The `useSearch()` hook manages all provider dispatch and state

**Step 2: Handle keyboard interaction**

- Results `SectionList` has `keyboardDismissMode="on-drag"` and `keyboardShouldPersistTaps="handled"`
- Filter bar stays visible above keyboard

**Step 3: Wire app long press**

For app-type results in the search list, wire `onLongPress` to the existing `ActionMenu` system (same as the grid long-press behavior).

**Step 4: Commit**

```
feat: wire multi-provider search into app drawer with vertical results
```

---

### Task 16: Wire Search Settings & Network Toggle

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/hooks/use-search.ts`
- Modify: `apps/native/app/settings/integrations.tsx`
- Modify: `apps/native/types/settings.ts`

**Step 1: Connect settings to provider enablement**

Map `SearchSettings` fields to providers:

- `searchAllApps` → app provider
- `contactSearch` → contact provider
- `calendarSearch` → calendar provider
- `calculator` → calculator provider
- `unitConverter` → unit converter provider
- `wikipediaSearch` → wikipedia provider (also requires `allowNetwork`)
- `locationSearch` → location provider (also requires `allowNetwork`)

**Step 2: Persist network toggle**

Store `allowNetwork` boolean in MMKV under `"search-allow-network"`. Default: `false`. Toggle via globe icon in filter bar. Persists across sessions.

**Step 3: Add search engine selector to settings**

Add `searchEngine` field to `IntegrationSettings` type and defaults. Add a `SelectPreference` in integrations settings:

```tsx
<PreferenceCategory title="Search">
  <SelectPreference
    icon="search"
    title="Web Search Engine"
    value={integrations.searchEngine}
    options={[
      { label: "Google", value: "google" },
      { label: "DuckDuckGo", value: "duckduckgo" },
      { label: "Bing", value: "bing" },
    ]}
    onValueChange={(v) => actions.updateIntegrations({ searchEngine: v })}
  />
</PreferenceCategory>
```

**Step 4: Commit**

```
feat: connect search settings, persist network toggle, add search engine selector
```

---

### Task 17: Validate Search System

**Step 1: App search verification**

- Type app name → app appears in vertical results list
- Tap app → launches correctly
- Partial matches work (e.g., "chro" matches "Chrome")
- Long-press app result → existing ActionMenu appears

**Step 2: Calculator verification**

- Type `2+2` → shows "4" as result in Tools section
- Type `sqrt(144)` → shows "12"
- Type `0xFF` → shows decimal conversion
- Tap result → copies to clipboard

**Step 3: Unit converter verification**

- Type `5 inch to cm` → shows "12.7 cm"
- Type `100 km/h to mph` → shows conversion
- Type `5 inch >> cm` → same result
- Invalid expressions return no results (no crash)

**Step 4: Contact search verification**

- Type contact name → "Tap to enable contact search" appears on first time
- Tap prompt → system permission dialog
- If granted: contacts appear with expandable inline actions
- Tap call button → calls number
- Toggle `contactCallOnTap` → tapping contact directly calls
- If denied: contacts silently stop appearing

**Step 5: Calendar verification**

- Type event name → "Tap to enable calendar search" on first time
- After permission: matching events appear with date/time
- Tap event → opens calendar

**Step 6: Quick actions verification**

- Type phone number → Call + SMS action pills appear
- Type email → Email action pill appears
- Type URL → Open URL action pill appears
- Type any text → "Search Google" (or selected engine) appears
- Tap action → opens appropriate app

**Step 7: Network providers verification**

- Wikipedia/location results don't appear by default
- Tap globe icon in filter bar → network enabled
- Type 4+ chars → Wikipedia results appear after 500ms
- Type 2+ chars → location results appear after 500ms
- Close and reopen app → network toggle persists

**Step 8: Filter bar verification**

- Only pills for categories with results are shown
- Toggle filter → results update immediately, other categories hidden
- Globe icon shows network state
- Filter bar only shows when searching and `filterBarEnabled` is on

**Step 9: Search bar behavior verification**

- Type query → results appear
- Tap result → app launches, query persists
- Return to drawer → previous query and results still visible
- Tap X button → query clears, grid view returns
- Close drawer → query clears on reopen

**Step 10: Performance verification**

- Local results (apps, calculator) appear instantly while typing
- Network results appear ~500ms after typing stops
- Rapid typing doesn't cause stale results (AbortController works)
- Smooth scrolling through results (SectionList)
- No jank from mathjs lazy loading after first use

**Step 11: Regression verification**

- Empty search still shows normal app drawer grid
- Drawer open/close still works with gestures
- Widget panel unaffected
- Homescreen clock, battery, weather widgets unaffected
- Settings navigation intact
- Back button closes drawer correctly

---

### Acceptance Criteria

- Multi-provider search with two-tier parallel dispatch (instant + 500ms network)
- Vertical categorized `SectionList` replaces app grid when searching
- App, calculator, unit converter providers work locally (no network)
- Contact and calendar providers work with soft permission prompts
- Contact results expand to show inline call/message/email actions (default), or direct-call via setting
- Wikipedia and location providers work when network toggle is enabled
- Quick actions for phone, email, URL, and configurable web search engine
- Filter bar shows only categories with results, plus globe network toggle
- Usage-based ranking boosts frequently-launched items
- Search query persists on blur, clears on X button or drawer close
- All provider toggles in search settings are functional
- Network toggle persists in MMKV across sessions
- Providers fail gracefully — a crashed provider never blocks other results
- No regressions in existing launcher functionality
- Smooth 60fps during search input and result rendering
- All settings persist across restarts via MMKV
- Run `bun x ultracite fix` before each commit

---

### Implementation Notes

- Load `native-data-fetching` before writing any `nitro-fetch` code — it has the patterns for error handling and caching
- Load `vercel-react-native-skills` before building result lists — it has SectionList and list performance patterns
- Load `heroui-native` before writing any styled components — use `className` tokens
- Providers are **pure functions** — they receive `ProviderDeps`, never call `use()` or access React context directly
- Use `Promise.allSettled()` not `Promise.all()` for parallel provider dispatch
- AbortController for cancelling in-flight network requests when query changes
- `mathjs` is lazy-imported on first calculator/converter search to avoid startup cost
- Permission dialogs only triggered when user taps the soft "Tap to enable" prompt row
- The search bar context (`useSearchBar()`) already exists — extend it, don't replace it
- Existing `ActionMenu` component handles app long-press — pass through from search results
- GPS coordinates are opportunistic — check `expo-location` permission status, use last known position if granted, never prompt

### Phase 2 (Future)

- Custom labels and tags per item
- Hidden items and visibility levels (Default / SearchOnly / Hidden)
- Custom web search engines with URL templates (OpenSearch import)
- Currency conversion with live exchange rates
- File search (photos/media via expo-media-library)
- String normalization for diacritics and transliteration
- App shortcuts (requires custom native module)
- Long-press menus for non-app result types
- Expandable multi-engine web search actions
