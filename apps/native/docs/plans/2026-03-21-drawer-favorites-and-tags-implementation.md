# Drawer Favorites And Tags Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out:
>
> - `building-native-ui` for native interaction structure, bottom sheets, and section UX
> - `vercel-react-native-skills` for React Native list, interaction, and performance decisions
> - `vercel-react-best-practices` for React state boundaries, component structure, and derived state
> - `react-native-unistyles-v3` for all new styling, theme tokens, variants, and layout states
> - `reanimated-dnd` for all manual reordering interactions
> - `vercel-composition-patterns` for the drawer component architecture and compound component APIs

**Goal:** Redesign the app drawer into two sections: a top `Pinned apps` section with tag chips and manual ordering, plus the existing alphabetical launcher section underneath.

**Reference Direction:** Match the supplied mock closely:

- long press on any app opens actions
- actions lead into a bottom-sheet metadata editor
- pinned apps are shown separately from the full launcher
- tags filter pinned apps only
- tags and pinned apps can be rearranged manually

**Architecture:** Keep the existing full-screen animated drawer, but refactor its internals into composition-based sections backed by a persisted metadata store for aliases, pinned state, pinned order, and tag assignments.

**Tech Stack:** Expo Router, React Native, react-native-reanimated, react-native-gesture-handler, react-native-unistyles v3, expo-secure-store, react-native-reanimated-dnd

---

### Product Decisions Locked

- Favorites section label: `Pinned apps`
- Layout: single stacked scroll
- Launcher source for this phase: existing placeholder apps only
- Pin entry point: long press menu
- Tags: user-created, multi-tag assignment per app
- Tag filtering: single selected tag, inclusive matching
- Tag chips source: all created tags
- Tag chip order: manual
- Favorites ordering: manual
- Launcher ordering: alphabetical
- Search behavior: search the launcher, hide pinned apps while searching
- Rename behavior: alias replaces original app name everywhere
- Original name after rename: hidden
- Persistence: pinned state, alias, tags, pinned order, and tag order must survive relaunch
- Long press availability: both pinned apps and launcher apps
- Favorites default state: seeded on first launch only

---

### Task 1: Refactor The Drawer Into Composable Sections

**Required skills:** `building-native-ui`, `vercel-composition-patterns`, `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`
- Create: `apps/native/components/app-drawer/` subcomponents as needed

**Step 1: Split the drawer into composition-oriented sections**

Refactor the current drawer so it is no longer a single large grid implementation. Introduce composition-friendly pieces for:

- root drawer container
- search/header area
- pinned apps section
- tag chips row
- launcher section
- app action menu
- app metadata bottom sheet

The parent drawer owns shared state and derived selectors. Child sections stay focused on rendering and interaction callbacks.

**Step 2: Keep the existing stacked scroll behavior**

Render the pinned section above the launcher section in one vertical scroll flow so the favorites header and chips scroll away naturally with the rest of the drawer content.

**Step 3: Preserve current drawer open/close behavior**

Do not redesign the overall drawer animation model in this phase. Keep the existing gesture/open-close behavior and only replace the internals of the open drawer content.

**Step 4: Define clear composition boundaries**

The implementation should expose explicit props or compound-component slots for:

- `searchQuery`
- `activeTagId`
- `onSearchChange`
- `onTagSelect`
- `onAppPress`
- `onAppLongPress`

Avoid burying interaction logic inside item renderers.

---

### Task 2: Introduce Persisted Drawer Metadata State

**Required skills:** `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/context/launcher-config.tsx`
- Create: `apps/native/context/drawer-metadata.tsx` or equivalent

**Step 1: Keep layout config separate from app organization state**

Do not overload the existing launcher config object with per-app metadata. Add a dedicated persisted drawer metadata store for app organization concerns.

**Step 2: Create normalized metadata types**

Add internal types equivalent to:

```ts
type DrawerAppMetadata = {
  appId: string;
  alias?: string;
  isPinned: boolean;
  pinnedOrder?: number;
  tagIds: string[];
};

type DrawerTag = {
  id: string;
  label: string;
  order: number;
};

type DrawerMetadataState = {
  seeded: boolean;
  apps: Record<string, DrawerAppMetadata>;
  tags: DrawerTag[];
};
```

**Step 3: Add first-run seeding**

Seed a small default pinned set exactly once on first load. After the seeded flag is set, never overwrite the user’s saved pinned state again.

**Step 4: Add derived selectors**

Provide selectors/helpers for:

- pinned apps in manual order
- all tags in manual order
- alphabetical launcher apps
- display label with alias fallback
- pinned apps filtered by selected tag

**Step 5: Persist immediately on user-driven state changes**

Persist after pin/unpin, rename, tag assignment, pinned reorder, and tag reorder.

---

### Task 3: Build The `Pinned apps` Section

**Required skills:** `building-native-ui`, `vercel-react-native-skills`, `react-native-unistyles-v3`

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`
- Modify or create pinned section components under `apps/native/components/app-drawer/`

**Step 1: Add the favorites header and tag chip row**

Render a top section labeled `Pinned apps` with:

- section title
- tag chip row sourced from all created tags
- compact pinned app grid below

**Step 2: Apply the chosen tag behavior**

Only one tag may be active at a time. The active tag filters pinned apps only. The launcher section never changes based on tag selection.

**Step 3: Respect search behavior**

When the search query is non-empty:

- hide the entire pinned section
- show launcher search results only

**Step 4: Keep the pinned grid compact and vertically growing**

Use a compact multi-column layout for pinned apps. The section should expand vertically as items are added instead of collapsing into a horizontally scrolling strip.

**Step 5: Add empty states**

Handle:

- no pinned apps at all
- no pinned apps for the selected tag
- no tags created yet

Do not silently remove the section in those states.

---

### Task 4: Keep The Launcher Section Alphabetical And Independent

**Required skills:** `vercel-react-native-skills`, `vercel-react-best-practices`

**Files:**

- Modify: `apps/native/components/app-drawer.tsx`

**Step 1: Preserve the launcher as the full app list**

The lower section remains the full launcher grid using placeholder app data from the current implementation.

**Step 2: Sort launcher items alphabetically by display label**

Use:

- alias if present
- otherwise the original app name

This keeps rename behavior visible everywhere.

**Step 3: Keep launcher behavior separate from favorites**

Pinned state does not remove items from the launcher. The same app can appear in `Pinned apps` and in the launcher list.

**Step 4: Keep tag filters out of the launcher**

Tag chips must never filter or reorder the launcher section.

---

### Task 5: Add Long-Press Actions On Any App

**Required skills:** `building-native-ui`, `vercel-composition-patterns`, `vercel-react-native-skills`

**Files:**

- Modify: `apps/native/components/app-icon.tsx`
- Modify: `apps/native/components/app-drawer.tsx`
- Create: action menu component if needed

**Step 1: Add long-press support to both surfaces**

Long press must work on:

- pinned apps
- launcher apps

Tap continues to launch/open the item as it does today.

**Step 2: Add the required action set**

The long-press menu must support:

- pin or unpin
- edit tags
- rename label

Use one shared action pathway for both pinned and launcher items.

**Step 3: Match the reference interaction flow**

The visual treatment should follow the supplied mock:

- long press opens a contextual action menu
- editing continues inside a bottom sheet

This is a behavior and layout requirement, not a license to add extra product actions that were not requested.

---

### Task 6: Build The Bottom-Sheet Metadata Editor

**Required skills:** `building-native-ui`, `react-native-unistyles-v3`, `vercel-react-best-practices`

**Files:**

- Create or modify bottom-sheet-related components under `apps/native/components/app-drawer/`

**Step 1: Create a dedicated metadata editing sheet**

The sheet should show the selected app and support:

- alias editing
- tag assignment
- pin or unpin state

**Step 2: Support multi-tag assignment**

An app can belong to multiple tags. The sheet should reflect assigned tags clearly and make add/remove actions obvious.

**Step 3: Add tag management controls**

Within the sheet flow, support:

- creating a new tag
- removing a tag
- rearranging tag order

**Step 4: Use explicit commit semantics**

Edits should not be half-applied by transient input state. Structure the sheet so save/apply behavior is explicit and predictable.

**Step 5: Keep rename behavior global**

Once saved, the alias must replace the original label in both:

- pinned apps
- launcher

Do not display the original label as a subtitle in this phase.

---

### Task 7: Add Drag-And-Drop Reordering

**Required skills:** `reanimated-dnd`, `vercel-react-native-skills`, `react-native-unistyles-v3`

**Files:**

- Modify pinned section components
- Modify tag management UI components

**Step 1: Reorder pinned apps with `react-native-reanimated-dnd`**

Use drag-and-drop for manual ordering inside the pinned apps grid.

**Step 2: Reorder tags with `react-native-reanimated-dnd`**

Use drag-and-drop for manual ordering of tags in the management surface.

**Step 3: Persist on drop completion**

Write the new ordering to storage immediately after a successful reorder.

**Step 4: Protect primary interactions**

Dragging must not break:

- tap to open
- long press to open actions
- normal scrolling

Resolve gesture priority deliberately.

---

### Task 8: Style The New Drawer Surfaces With Unistyles

**Required skills:** `react-native-unistyles-v3`, `building-native-ui`

**Files:**

- Modify style definitions for drawer-related components

**Step 1: Add drawer-specific style tokens and variants**

Introduce consistent styling for:

- section spacing
- chip states
- pinned grid density
- action menu surface
- metadata sheet surface
- drag state visuals

**Step 2: Match the current launcher visual language**

Do not introduce a new visual system. The redesign should feel like a direct extension of the current launcher.

**Step 3: Keep density usable on mobile**

The pinned section should remain useful without pushing the launcher too far off-screen on typical phone heights.

---

### Task 9: Validate Behavior, Performance, And Regressions

**Required skills:** `vercel-react-native-skills`, `vercel-react-best-practices`

**Step 1: Functional verification**

Verify:

- pinned section appears above launcher
- launcher remains alphabetical
- tag chips filter pinned apps only
- search hides pinned apps
- long press works in both sections
- rename updates labels everywhere
- pin/unpin updates the pinned section correctly
- metadata persists after app relaunch

**Step 2: Reordering verification**

Verify:

- pinned app order persists after relaunch
- tag order persists after relaunch
- dense grids still reorder correctly

**Step 3: Regression verification**

Verify:

- drawer open/close gesture still works
- launcher search still works
- no crashes from gesture conflicts
- no obvious list performance regressions from the new two-section structure

---

### Acceptance Criteria

- Drawer shows `Pinned apps` above the launcher in one stacked scroll experience
- `Pinned apps` uses a compact manual-order grid
- Tag chips filter pinned apps only, with single-select behavior
- Search hides the pinned section and filters the launcher only
- Long press is available on both pinned and launcher apps
- Bottom sheet supports rename, tag editing, and pin/unpin
- Aliases replace original names everywhere
- Tags and pinned apps are both manually reorderable
- All metadata persists locally across relaunches
- Launcher remains alphabetical and continues using placeholder app data for this phase

---

### Implementation Notes

- Prefer small composable section components over adding more conditional rendering into a single drawer file
- Keep business state in a dedicated metadata store and keep rendering state derived from selectors
- Use composition patterns to avoid prop sprawl and boolean-driven component APIs
- Keep drag-and-drop limited to the two manual-order surfaces only
- Avoid changing unrelated launcher features in this phase
