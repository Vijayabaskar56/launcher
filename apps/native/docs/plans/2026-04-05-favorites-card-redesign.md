# Favorites Card Redesign & Edit Sheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the favorites card to match Kvaesitso — tags at bottom with edit button, plus a new dedicated favorites edit bottom sheet for managing tags and pinned apps.

**Architecture:** Two changes: (1) Reorder PinnedSection JSX so tags + edit button sit below the app grid inside the card. (2) Create a new `FavoritesEditSheet` compound component using `@gorhom/bottom-sheet` that lets users manage tags (add/delete/reorder) and pinned apps (add/remove/reorder). The sheet reuses existing `drawerActions` handlers already wired in `app-drawer.tsx`.

**Tech Stack:** React Native, Expo, @gorhom/bottom-sheet, react-native-reanimated-dnd, HeroUI Native theming, composition patterns

---

### Task 1: Rearrange PinnedSection — tags to bottom with edit button

**Files:**

- Modify: `components/app-drawer.tsx:213-287` (PinnedSection return JSX)

**Step 1: Rearrange the PinnedSection JSX**

Move the tag pills below the app grid, remove the "Favorites" / "Pinned apps" header text (the card speaks for itself like Kvaesitso), and add an edit (pencil) button to the right of the tag row.

Current order: Header → Tags → App Grid
New order: App Grid → Tags + Edit Button (bottom row)

```tsx
const PinnedSection = ({
  activeTagId,
  apps,
  columns,
  iconSize,
  iconShape,
  showLabels,
  onAppLongPress,
  onAppPress,
  onEditPress,
  onTagPress,
  tags,
  iconRefs,
}: {
  activeTagId: string | null;
  apps: DrawerApp[];
  columns: number;
  iconSize: number;
  iconShape: string;
  showLabels: boolean;
  onAppLongPress: (app: DrawerApp) => void;
  onAppPress: (packageName: string) => void;
  onEditPress: () => void;
  onTagPress: (tagId: string | null) => void;
  tags: DrawerTag[];
  iconRefs: React.MutableRefObject<Map<string, View | null>>;
}) => {
  const handleAllPress = useCallback(() => {
    onTagPress(null);
  }, [onTagPress]);

  return (
    <View
      className="rounded-3xl p-4 gap-3"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      {/* App grid */}
      {apps.length > 0 ? (
        <View className="flex-row flex-wrap gap-y-3">
          {apps.map((app) => (
            <DrawerAppIcon
              key={app.packageName}
              app={app}
              isPinned
              iconShape={iconShape}
              showLabel={showLabels}
              onPress={onAppPress}
              onLongPress={onAppLongPress}
              size={iconSize}
              iconRefs={iconRefs}
              columns={columns}
            />
          ))}
        </View>
      ) : (
        <View className="gap-1 py-4">
          <Text className="text-base font-bold text-foreground">
            No pinned apps yet
          </Text>
          <Text className="text-sm text-muted-foreground leading-5">
            Long press any app to pin it here.
          </Text>
        </View>
      )}

      {/* Bottom row: tag pills + edit button */}
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row flex-wrap gap-2">
          <Pressable
            className={`rounded-full px-3 py-2 border flex-row items-center gap-1.5 ${
              activeTagId === null
                ? "bg-primary border-primary"
                : "bg-secondary border-border"
            }`}
            onPress={handleAllPress}
          >
            <Icon name={ICON_MAP.star} size={14} />
          </Pressable>

          {tags.map((tag) => (
            <TagPill
              key={tag.id}
              tag={tag}
              isActive={activeTagId === tag.id}
              onTagPress={onTagPress}
            />
          ))}
        </View>

        <Pressable
          className="h-9 w-9 rounded-full bg-secondary items-center justify-center"
          onPress={onEditPress}
          hitSlop={8}
        >
          <Icon name={ICON_MAP.edit} size={16} />
        </Pressable>
      </View>
    </View>
  );
};
```

Key changes:

- Added `onEditPress` prop
- Removed header text ("Favorites" / "Pinned apps")
- Moved tag pills below the app grid
- Star (All) button is icon-only (no "All" text) to save space
- Added edit pencil button to the right of the tags row
- Tag pills slightly smaller: `px-3 py-2` instead of `px-3.5 py-2.5`

**Step 2: Add `onEditPress` to PinnedSection invocation**

In `app-drawer.tsx`, where `PinnedSection` is rendered (inside the ScrollView), add the `onEditPress` prop:

```tsx
<PinnedSection
  // ... existing props ...
  onEditPress={handleOpenFavoritesEdit}
/>
```

Add the state and handler in the AppDrawer component:

```tsx
const [showFavoritesEdit, setShowFavoritesEdit] = useState(false);

const handleOpenFavoritesEdit = useCallback(() => {
  setShowFavoritesEdit(true);
}, []);

const handleCloseFavoritesEdit = useCallback(() => {
  setShowFavoritesEdit(false);
}, []);
```

**Step 3: Verify ICON_MAP has `edit` icon**

Check that `ICON_MAP.edit` exists in `components/ui/icon.tsx`. If not, add `edit: "pencil"` or `edit: "create-outline"`.

**Step 4: Commit**

```
git add components/app-drawer.tsx
git commit -m "feat: rearrange favorites card — tags at bottom with edit button"
```

---

### Task 2: Create FavoritesEditSheet component

**Files:**

- Create: `components/app-drawer/favorites-edit-sheet.tsx`

This is the main bottom sheet that opens when the user taps the pencil icon. It has two sections:

1. **Tags section** — list of tags with `# label ×` delete buttons, and a text input to add new tags
2. **Pinned apps section** — header "Pinned – manually sorted" with `+` button, list of pinned apps (reorderable)

Reference the existing `edit-sheet.tsx` for bottom sheet patterns.

**Step 1: Create the component file**

```tsx
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { InstalledApp } from "@/context/app-list";
import type { DrawerTag } from "@/context/drawer-metadata";

import { AppIcon } from "../app-icon";
import { Icon, ICON_MAP } from "../ui/icon";
import type { DrawerApp } from "./types";

// --- Types ---

interface FavoritesEditSheetProps {
  visible: boolean;
  onClose: () => void;
  tags: DrawerTag[];
  pinnedApps: DrawerApp[];
  allApps: DrawerApp[];
  iconShape: string;
  onCreateTag: (label: string) => string | null;
  onRemoveTag: (tagId: string) => void;
  onReorderTags: (tagIds: string[]) => void;
  onReorderPinnedApps: (packageNames: string[]) => void;
  onTogglePin: (packageName: string, isPinned: boolean) => void;
}

// --- Backdrop ---

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.5}
  />
);

// --- Tag Row ---

const TagRow = ({
  tag,
  onRemove,
}: {
  tag: DrawerTag;
  onRemove: (tagId: string) => void;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(tag.id);
  }, [onRemove, tag.id]);

  return (
    <View className="flex-row items-center rounded-xl border border-border px-3 py-2.5 gap-2">
      <Text className="text-sm text-muted-foreground">#</Text>
      <Text className="flex-1 text-sm font-semibold text-foreground">
        {tag.label}
      </Text>
      <Pressable hitSlop={8} onPress={handleRemove}>
        <Icon name={ICON_MAP.close} size={14} />
      </Pressable>
    </View>
  );
};

// --- Pinned App Row ---

const PinnedAppRow = ({
  app,
  iconShape,
  onUnpin,
}: {
  app: DrawerApp;
  iconShape: string;
  onUnpin: (packageName: string) => void;
}) => {
  const handleUnpin = useCallback(() => {
    onUnpin(app.packageName);
  }, [onUnpin, app.packageName]);

  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <AppIcon
        packageName={app.packageName}
        label={app.displayLabel}
        letter={app.letter}
        icon={app.icon}
        iconShape={iconShape}
        showLabel={false}
        size={36}
      />
      <Text className="flex-1 text-sm font-medium text-foreground">
        {app.displayLabel}
      </Text>
      <Pressable
        hitSlop={8}
        onPress={handleUnpin}
        className="h-7 w-7 items-center justify-center"
      >
        <Icon name={ICON_MAP.close} size={14} />
      </Pressable>
    </View>
  );
};

// --- Unpinned App Row ---

const UnpinnedAppRow = ({
  app,
  iconShape,
  onPin,
}: {
  app: DrawerApp;
  iconShape: string;
  onPin: (packageName: string) => void;
}) => {
  const handlePin = useCallback(() => {
    onPin(app.packageName);
  }, [onPin, app.packageName]);

  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <AppIcon
        packageName={app.packageName}
        label={app.displayLabel}
        letter={app.letter}
        icon={app.icon}
        iconShape={iconShape}
        showLabel={false}
        size={36}
      />
      <Text className="flex-1 text-sm font-medium text-foreground opacity-60">
        {app.displayLabel}
      </Text>
      <Pressable
        hitSlop={8}
        onPress={handlePin}
        className="h-7 w-7 items-center justify-center"
      >
        <Icon name={ICON_MAP.add} size={18} />
      </Pressable>
    </View>
  );
};

// --- Main Sheet ---

export const FavoritesEditSheet = ({
  visible,
  onClose,
  tags,
  pinnedApps,
  allApps,
  iconShape,
  onCreateTag,
  onRemoveTag,
  onReorderTags,
  onReorderPinnedApps,
  onTogglePin,
}: FavoritesEditSheetProps) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [newTagLabel, setNewTagLabel] = useState("");

  const snapPoints = useMemo(() => ["75%", "95%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const handleAddTag = useCallback(() => {
    const trimmed = newTagLabel.trim();
    if (trimmed.length === 0) {
      return;
    }
    onCreateTag(trimmed);
    setNewTagLabel("");
  }, [newTagLabel, onCreateTag]);

  const handleUnpin = useCallback(
    (packageName: string) => {
      onTogglePin(packageName, false);
    },
    [onTogglePin]
  );

  const handlePin = useCallback(
    (packageName: string) => {
      onTogglePin(packageName, true);
    },
    [onTogglePin]
  );

  const unpinnedApps = useMemo(
    () => allApps.filter((app) => !app.isPinned),
    [allApps]
  );

  if (!visible) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
      backgroundStyle={{
        backgroundColor: "#1a1a2e",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
      handleIndicatorStyle={{
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        height: 5,
        width: 44,
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ gap: 24, padding: 16, paddingBottom: 48 }}
      >
        {/* --- Tags Section --- */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-foreground">Tags</Text>

          {tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag) => (
                <TagRow key={tag.id} tag={tag} onRemove={onRemoveTag} />
              ))}
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground">
              No tags yet. Create one below.
            </Text>
          )}

          {/* Add tag input */}
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 bg-background border border-border rounded-xl text-foreground text-sm min-h-[44px] px-3"
              placeholder="Create new tag"
              placeholderTextColor="#808080"
              value={newTagLabel}
              onChangeText={setNewTagLabel}
              onSubmitEditing={handleAddTag}
              returnKeyType="done"
            />
            <Pressable
              className="h-10 w-10 rounded-full bg-secondary items-center justify-center"
              onPress={handleAddTag}
            >
              <Icon name={ICON_MAP.add} size={20} />
            </Pressable>
          </View>
        </View>

        {/* --- Pinned Apps Section --- */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-foreground">Pinned apps</Text>

          {pinnedApps.length > 0 ? (
            <View className="gap-1">
              {pinnedApps.map((app) => (
                <PinnedAppRow
                  key={app.packageName}
                  app={app}
                  iconShape={iconShape}
                  onUnpin={handleUnpin}
                />
              ))}
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground">
              No pinned apps. Add some from below.
            </Text>
          )}
        </View>

        {/* --- All Apps Section --- */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-foreground">All apps</Text>

          <View className="gap-1">
            {unpinnedApps.map((app) => (
              <UnpinnedAppRow
                key={app.packageName}
                app={app}
                iconShape={iconShape}
                onPin={handlePin}
              />
            ))}
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};
```

**Step 2: Commit**

```
git add components/app-drawer/favorites-edit-sheet.tsx
git commit -m "feat: create FavoritesEditSheet component"
```

---

### Task 3: Wire FavoritesEditSheet into AppDrawer

**Files:**

- Modify: `components/app-drawer.tsx`

**Step 1: Import and render the new sheet**

Add import:

```tsx
import { FavoritesEditSheet } from "./app-drawer/favorites-edit-sheet";
```

Add the sheet alongside the existing `AppDrawerEditSheet`:

```tsx
<FavoritesEditSheet
  visible={showFavoritesEdit}
  onClose={handleCloseFavoritesEdit}
  tags={orderedTags}
  pinnedApps={pinnedApps}
  allApps={allDrawerApps}
  iconShape={iconShape}
  onCreateTag={handleCreateTag}
  onRemoveTag={handleRemoveTag}
  onReorderTags={handleReorderTags}
  onReorderPinnedApps={handleReorderPinnedApps}
  onTogglePin={handleTogglePinFromEdit}
/>
```

**Step 2: Add the toggle pin handler**

```tsx
const handleTogglePinFromEdit = useCallback(
  (packageName: string, isPinned: boolean) => {
    drawerActions?.setPinned(packageName, isPinned);
  },
  [drawerActions]
);
```

**Step 3: Pass `allDrawerApps` to the sheet**

Check that `allDrawerApps` (the full visible app list used in LauncherSection) is accessible. It should already be computed in the AppDrawer component. If it's called something else (like `launcherApps`), use that.

**Step 4: Verify ICON_MAP entries**

Ensure these icons exist in `components/ui/icon.tsx`:

- `ICON_MAP.edit` (pencil icon)
- `ICON_MAP.add` (plus icon)
- `ICON_MAP.tag` (hash/tag icon)

If missing, add them.

**Step 5: Commit**

```
git add components/app-drawer.tsx components/ui/icon.tsx
git commit -m "feat: wire FavoritesEditSheet into app drawer"
```

---

### Task 4: Polish and edge cases

**Files:**

- Modify: `components/app-drawer/favorites-edit-sheet.tsx`
- Modify: `components/app-drawer.tsx`

**Step 1: Handle empty state in favorites card**

When there are no pinned apps AND no tags, the favorites card should still show the bottom row with just the star button and edit button, so users can discover the edit flow.

**Step 2: Ensure keyboard avoidance**

Add `keyboardBehavior="interactive"` and `keyboardBlurBehavior="restore"` to the BottomSheet in `FavoritesEditSheet` for the tag creation input.

**Step 3: Verify the sheet closes properly**

The sheet should close on pan-down and the `visible` state should reset. Verify the `handleSheetChange` callback properly calls `onClose` on index -1.

**Step 4: Commit**

```
git add components/app-drawer/favorites-edit-sheet.tsx components/app-drawer.tsx
git commit -m "feat: polish favorites edit sheet — keyboard, empty states"
```
