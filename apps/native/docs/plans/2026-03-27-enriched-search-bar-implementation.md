# Enriched Search Bar Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task.
>
> - `vercel-react-native-skills` for keyboard handling, gesture integration, native component patterns
> - `vercel-react-best-practices` for hook design, ref patterns, uncontrolled component handling
> - `heroui-native` for HeroUI component usage, `className` token classes, `useThemeColor` hook
> - `building-components` for accessible, composable popup components
> - `vercel-composition-patterns` for compound component architecture

**Goal:** Replace the current plain `TextInput` search bar with `react-native-enriched`'s `EnrichedTextInput`, adding rich text triggers for mentions (`@`), filters (`#`), emojis (`:`), and slash commands (`/`). This creates a dual-purpose input: a launcher search bar AND a future-ready AI chat box.

**Reference:** [react-native-enriched example app](https://github.com/software-mansion/react-native-enriched/tree/main/apps/example)

---

### Key Library Facts

- **Uncontrolled component** — no `value` prop. Use `ref.current.setValue()` and `ref.current.getPlainText()` instead.
- **Mention system** via `mentionIndicators` prop — any character can be a trigger (`@`, `#`, `:`, `/`).
- **Events:** `onStartMention(indicator)`, `onChangeMention({ indicator, text })`, `onEndMention(indicator)` drive the popup lifecycle.
- **Complete a mention:** `ref.current.setMention(indicator, displayText, attributes)`.
- **Styling:** Per-indicator mention colors via `htmlStyle.mention`.
- **Submit:** `submitBehavior: 'submit'` + `onSubmitEditing` for send-on-enter.
- **New Architecture only** — requires dev client (not Expo Go).

---

### Product Decisions Locked

- **4 trigger indicators:** `@` (people), `#` (filters), `:` (emojis), `/` (commands)
- **Input ↔ search bridge:** Hybrid — `onChangeText` mirrors plain text into React state for search, enriched input owns rich content. Clear uses ref + state reset.
- **Trigger tokens stripped from search:** Mention text is NOT sent to search providers. Only non-trigger plain text feeds into `useSearch()`. Each trigger has its own side effect.
- **@ People picker:** Shows contacts (if granted) + mock names as fallback. Selecting `@John` activates contacts filter + searches "John". Pressing Enter with an `@mention` triggers call to primary number via default dialer.
- **# Filter picker:** Selecting `#Contacts` inserts a green-styled mention that stays visible in input. Activates that search filter. Delete the mention to deactivate. Multiple `#filters` supported (e.g., `#Contacts #Tools query`).
- **: Emoji picker:** `:shortcode` is replaced with the emoji character as plain text. No mention wrapping — just a character swap.
- **/ Commands:** Selecting a command executes it and clears the entire input.
- **Visual styling:** `@mentions` in accent color, `#filters` in green, `/commands` in blue. Emojis render as plain characters.
- **Submit behavior:** `submitBehavior: 'submit'` — pressing Enter/Go launches first search result, or if `@mention` is active, calls primary number.
- **No rich text toolbar:** This is a search bar, not an editor. No bold/italic/underline buttons.
- **Suggestion popup:** Floating between search bar and filter bar, pushing search bar up. Max 5 items, no scroll. Dark themed.
- **Search still works normally:** Typing plain text (no triggers) still does multi-provider search as before.
- **No fallback:** No feature flag. Install, rebuild, ship.

---

### Packages to Install

```bash
bun add --cwd apps/native react-native-enriched
```

Requires dev client build (`npx expo prebuild`). New Architecture must be enabled (default in SDK 55).

---

### Task 1: Install react-native-enriched

**Required skills:** `building-native-ui`

**Files:**

- Modify: `apps/native/package.json`

**Step 1: Install**

```bash
bun add --cwd apps/native react-native-enriched
```

**Step 2: Rebuild dev client**

Since this has native code, a dev client rebuild is needed:

```bash
npx expo prebuild --clean
npx expo run:android
```

**Step 3: Verify import works**

Create a throwaway test — import `EnrichedTextInput` and render it in a screen. Confirm it mounts without crash.

**Step 4: Commit**

```
chore: install react-native-enriched for rich search bar
```

---

### Task 2: Define Enriched Search Types

**Files:**

- Create: `apps/native/types/enriched-search.ts`

**Step 1: Define trigger types and suggestion data**

```ts
export type TriggerIndicator = "@" | "#" | ":" | "/";

export interface PersonSuggestion {
  id: string;
  name: string;
  icon?: string; // URI or undefined
}

export interface FilterSuggestion {
  id: string;
  label: string;
  icon: string; // ionicon name
  filterKey: SearchFilter;
}

export interface EmojiSuggestion {
  shortcode: string; // e.g. "smile"
  emoji: string; // e.g. "😄"
}

export interface CommandSuggestion {
  command: string; // e.g. "/search"
  label: string; // e.g. "Search the web"
  icon: string; // ionicon name
  action: () => void;
}

export type Suggestion =
  | { type: "person"; data: PersonSuggestion }
  | { type: "filter"; data: FilterSuggestion }
  | { type: "emoji"; data: EmojiSuggestion }
  | { type: "command"; data: CommandSuggestion };
```

**Step 2: Commit**

```
feat: define enriched search types for triggers and suggestions
```

---

### Task 3: Build Suggestion Data Hooks

**Required skills:** `vercel-react-best-practices`

**Files:**

- Create: `apps/native/hooks/use-people-suggestions.ts`
- Create: `apps/native/hooks/use-filter-suggestions.ts`
- Create: `apps/native/hooks/use-emoji-suggestions.ts`
- Create: `apps/native/hooks/use-command-suggestions.ts`

**Step 1: People suggestions hook**

```ts
function usePeopleSuggestions(query: string): PersonSuggestion[];
```

- Try to load contacts from `expo-contacts` (if permission already granted)
- Fallback to hardcoded mock names: "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"
- Filter by query (case-insensitive startsWith)
- Return top 5 matches

**Step 2: Filter suggestions hook**

```ts
function useFilterSuggestions(query: string): FilterSuggestion[];
```

- Static list mapping to search filters:
  - `{ id: "apps", label: "Apps", icon: "grid-outline", filterKey: "apps" }`
  - `{ id: "contacts", label: "Contacts", icon: "person-outline", filterKey: "contacts" }`
  - `{ id: "calendar", label: "Calendar", icon: "calendar-outline", filterKey: "events" }`
  - `{ id: "tools", label: "Tools", icon: "calculator-outline", filterKey: "tools" }`
  - `{ id: "web", label: "Web", icon: "globe-outline", filterKey: "web" }`
- Filter by query

**Step 3: Emoji suggestions hook**

```ts
function useEmojiSuggestions(query: string): EmojiSuggestion[];
```

- Hardcoded map of ~50 common emoji shortcodes:
  - `smile` → 😄, `heart` → ❤️, `fire` → 🔥, `thumbsup` → 👍, `rocket` → 🚀, etc.
- Filter by query (startsWith on shortcode)
- Return top 8 matches

**Step 4: Command suggestions hook**

```ts
function useCommandSuggestions(query: string): CommandSuggestion[];
```

- Static commands:
  - `/search` — "Search the web" → opens web search
  - `/settings` — "Open settings" → navigates to settings
  - `/clear` — "Clear search" → clears input
  - `/weather` — "Show weather" → focuses weather widget
  - `/calculator` — "Open calculator" → types `=` to trigger calc mode
- Filter by query

**Step 5: Commit**

```
feat: add suggestion hooks for people, filters, emojis, and commands
```

---

### Task 4: Build Suggestion Popup Component

**Required skills:** `heroui-native`, `building-components`, `vercel-composition-patterns`

**Files:**

- Create: `apps/native/components/search/suggestion-popup.tsx`

**Step 1: Build the popup**

A floating popup that renders above the search bar showing filtered suggestions:

- Positioned absolutely above the enriched input
- Dark themed (matches app theme via `useThemeColor`)
- FlatList of suggestion items
- Each item type has a specific renderer:
  - **Person:** Avatar circle + name
  - **Filter:** Icon + label
  - **Emoji:** Emoji character + shortcode
  - **Command:** Icon + command + description
- `onSelect(suggestion)` callback
- Animated enter/exit (FadeIn/FadeOut)
- Max height ~200px, scrollable
- Only renders when there are suggestions

**Step 2: Commit**

```
feat: add suggestion popup component for enriched search triggers
```

---

### Task 5: Build useEnrichedSearch Hook

**Required skills:** `vercel-react-best-practices`

**Files:**

- Create: `apps/native/hooks/use-enriched-search.ts`

**Step 1: Orchestrate trigger state and suggestions**

```ts
interface UseEnrichedSearchResult {
  // Trigger state
  activeTrigger: TriggerIndicator | null;
  triggerQuery: string;
  suggestions: Suggestion[];

  // Event handlers for EnrichedTextInput
  onStartMention: (indicator: string) => void;
  onChangeMention: (event: { indicator: string; text: string }) => void;
  onEndMention: (indicator: string) => void;

  // Selection handler
  onSelectSuggestion: (suggestion: Suggestion) => void;

  // Plain text for search (trigger tokens stripped)
  searchText: string;
  onChangeText: (event: { text: string }) => void;
}
```

- Manages which trigger is active (`@`, `#`, `:`, `/` or null)
- Routes to the appropriate suggestion hook based on active trigger
- Max 5 suggestions returned regardless of source
- `onSelectSuggestion` behavior per trigger:
  - `@`: calls `ref.current.setMention('@', '@Name', { id, type: 'person' })` + activates contacts filter + searches the name. On Enter with active `@mention`, calls primary phone number.
  - `#`: calls `ref.current.setMention('#', '#FilterName', { filterKey })` + toggles the search filter. Mention stays visible. Delete to deactivate.
  - `:`: replaces `:shortcode` with emoji character as plain text (no mention span)
  - `/`: executes command action + clears entire input via `ref.current.setValue('')`
- `searchText` extracts plain text from `onChangeText` events and strips trigger tokens (`@Name`, `#Filter` removed, only free text kept for search providers)
- `onChangeText` also handles the `@mention` → contact search side effect

**Step 2: Commit**

```
feat: add useEnrichedSearch hook orchestrating triggers and suggestions
```

---

### Task 6: Replace SearchBar.Input with EnrichedTextInput

**Required skills:** `vercel-react-native-skills`, `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/components/search-bar.tsx`

**Step 1: Replace TextInput with EnrichedTextInput**

Key changes:

- Import `EnrichedTextInput` from `react-native-enriched`
- Use ref instead of value/onChangeText (uncontrolled)
- Configure `mentionIndicators={['@', '#', ':', '/']}`.
- Wire `onStartMention`, `onChangeMention`, `onEndMention` to the hook
- Wire `onChangeText` to extract plain text for search
- Style mentions per indicator:
  ```ts
  htmlStyle={{
    mention: {
      '@': { color: accentColor, backgroundColor: 'rgba(99,102,241,0.15)' },
      '#': { color: '#22C55E', backgroundColor: 'rgba(34,197,94,0.15)' },
      ':': { color: foreground },
      '/': { color: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.15)' },
    }
  }}
  ```
- `submitBehavior="submit"` + `onSubmitEditing` → launch first search result
- Clear button calls `ref.current.setValue('')` instead of `setQuery('')`

**Step 2: Update SearchBarContext**

The context changes to hybrid controlled/uncontrolled:

- Keep `query` in state — but rename to `searchText` (the trigger-stripped plain text for search)
- Add `enrichedRef: RefObject<EnrichedTextInputInstance>` for imperative access
- `onChangeText` from enriched input → strip trigger tokens → update `searchText` state
- `deactivate()` calls `ref.current.setValue('')` AND `setSearchText('')`
- `setQuery(text)` calls `ref.current.setValue(text)` for programmatic text setting
- Expose `isActive`, `searchText`, `enrichedRef` to consumers

**Step 3: Mount suggestion popup**

Render `SuggestionPopup` between the search bar and filter bar when `activeTrigger !== null`:

- Popup pushes search bar up by its height (~5 items × 44px = 220px max)
- Filter bar stays in its keyboard-docked position
- Search bar bottom offset = keyboardHeight + filterBarHeight + popupHeight
- Popup animates in with FadeIn, out with FadeOut

**Step 4: Commit**

```
feat: replace TextInput with EnrichedTextInput in search bar
```

---

### Task 7: Wire Enriched Search to Existing Search System

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`
- Modify: `apps/native/hooks/use-search.ts`

**Step 1: Feed plain text to useSearch**

The `useSearch(query)` hook currently receives the raw query string. Now it should receive `plainText` from the enriched input (which strips mention markup but keeps the display text).

Example: User types `@John weather` → plainText is `@John weather` → search providers see `@John weather`.

**Step 2: Wire # filter trigger**

When user selects `#Contacts` from suggestions:

- The mention is inserted as `#Contacts` in the input
- Also calls `searchResults.toggleFilter('contacts')` to activate the filter
- The filter bar pill highlights accordingly

**Step 3: Wire / command execution**

When user selects `/settings`:

- The command executes immediately (navigates to settings)
- Input clears

**Step 4: Commit**

```
feat: wire enriched search bar to existing multi-provider search system
```

---

### Task 8: Validate Enriched Search Bar

**Step 1: Basic text search**

- Type plain text → search results appear as before
- All existing search features still work (apps, calculator, contacts, etc.)

**Step 2: @ Mentions**

- Type `@` → people suggestion popup appears
- Type `@Jo` → popup filters to matching names
- Tap a name → `@John Doe` inserted with accent color styling
- Continue typing → search includes the mention text

**Step 3: # Filters**

- Type `#` → filter category popup appears
- Tap `#Contacts` → inserted with green styling + contacts filter activated
- Filter bar pill highlights

**Step 4: : Emojis**

- Type `:` → emoji popup appears
- Type `:smi` → filters to smile-related emojis
- Tap emoji → emoji character inserted (😄)

**Step 5: / Commands**

- Type `/` → command list popup appears
- Type `/set` → filters to `/settings`
- Tap command → executes action

**Step 6: Clear button**

- Tap X → input clears completely (including mentions)
- Drawer close → input clears

**Step 7: Submit**

- Press Enter/Go → launches first search result or web search

**Step 8: Regression**

- Keyboard positioning still works
- Filter bar still docks above keyboard
- Search bar moves above filter bar when keyboard open
- Drawer open/close animations unaffected

---

### Acceptance Criteria

- EnrichedTextInput replaces plain TextInput in search bar
- 4 trigger indicators work: `@` (people), `#` (filters), `:` (emojis), `/` (commands)
- Suggestion popup appears/filters/selects correctly for each trigger
- Mentions styled with per-indicator colors
- Plain text extracted for multi-provider search (existing search unaffected)
- `#` filter selections activate search filters
- `/` commands execute actions
- Submit launches first search result
- Future-ready for AI chat features (the enriched input supports inline images, HTML, etc.)
- No regressions in existing search functionality
- Run `bun x ultracite fix` before each commit

---

### Implementation Notes

- `EnrichedTextInput` is **uncontrolled** — no `value` prop. This is a major architectural shift from the current `value`/`onChangeText` pattern. The `SearchBarContext` must adapt.
- Use `ref.current.getPlainText()` to get text without HTML markup for search queries.
- The mention system is event-driven (`onStartMention` → `onChangeMention` → `onEndMention`). The suggestion popup lifecycle maps directly to these events.
- `:emoji:` triggers should insert the actual emoji character, not a mention span. Use `ref.current.setMention(':', '😄', { shortcode: 'smile' })` or insert plain text.
- `/commands` should execute immediately on selection and clear the command text from the input.
- The library requires New Architecture (Fabric) — confirm it's enabled in the dev client build.
- Suggestion data hooks should be memoized to avoid re-filtering on every render.

### Phase 2 (Future — AI Chat Features)

- AI response rendering in the search bar area
- Conversation history
- Image paste support via `onPasteImages`
- Rich text responses with formatting
- Streaming AI responses
- Context-aware suggestions (based on visible apps, recent searches)
