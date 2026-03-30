import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Sortable,
  SortableGrid,
  SortableGridItem,
  SortableItem,
} from "react-native-reanimated-dnd";
import type {
  GridPositions,
  SortableGridRenderItemProps,
  SortableRenderItemProps,
} from "react-native-reanimated-dnd";

import type { DrawerTag } from "@/context/drawer-metadata";

import { AppIcon } from "../app-icon";
import { Icon, IconMuted, ICON_MAP } from "../ui/icon";
import type {
  DrawerApp,
  DrawerEditorDraft,
  DrawerEditorFocusMode,
} from "./types";

interface AppDrawerEditSheetProps {
  app: DrawerApp | null;
  focusMode: DrawerEditorFocusMode | null;
  onClose: () => void;
  onCreateTag: (label: string) => string | null;
  onRemoveTag: (tagId: string) => void;
  onReorderPinnedApps: (appIds: string[]) => void;
  onReorderTags: (tagIds: string[]) => void;
  onSave: (draft: DrawerEditorDraft) => void;
  pinnedApps: DrawerApp[];
  tags: DrawerTag[];
  visible: boolean;
}

const TAG_ROW_HEIGHT = 52;

const TagToggleButton = ({
  tagId,
  label,
  isSelected,
  onToggle,
}: {
  tagId: string;
  label: string;
  isSelected: boolean;
  onToggle: (tagId: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onToggle(tagId);
  }, [onToggle, tagId]);

  return (
    <Pressable
      onPress={handlePress}
      className="flex-1 flex-row items-center gap-2"
    >
      <Text className="text-base text-foreground">
        {isSelected ? "\u25CF" : "\u25CB"}
      </Text>
      <Text className="flex-1 text-sm font-semibold text-foreground">
        {label}
      </Text>
    </Pressable>
  );
};

const RemoveTagButton = ({
  tagId,
  onRemoveTag,
  onDeselectTag,
}: {
  tagId: string;
  onRemoveTag: (tagId: string) => void;
  onDeselectTag: (tagId: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onRemoveTag(tagId);
    onDeselectTag(tagId);
  }, [onRemoveTag, onDeselectTag, tagId]);

  return (
    <Pressable
      hitSlop={8}
      onPress={handlePress}
      className="h-7 w-7 items-center justify-center bg-secondary rounded-sm"
    >
      <Icon name={ICON_MAP.close} size={16} />
    </Pressable>
  );
};

const TagChip = ({
  tag,
  isSelected,
  onToggle,
}: {
  tag: DrawerTag;
  isSelected: boolean;
  onToggle: (tagId: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onToggle(tag.id);
  }, [onToggle, tag.id]);

  return (
    <Pressable
      onPress={handlePress}
      className={`rounded-full px-3.5 py-2.5 border flex-row items-center gap-1.5 ${
        isSelected ? "bg-primary border-primary" : "bg-secondary border-border"
      }`}
    >
      <Icon name={ICON_MAP.tag} size={14} />
      <Text
        className={`text-sm font-semibold ${
          isSelected ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {tag.label}
      </Text>
    </Pressable>
  );
};

const renderBottomSheetBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    disappearsOnIndex={-1}
    appearsOnIndex={0}
    opacity={0.5}
  />
);

const sortItems = function sortItems<T>(
  items: T[],
  compare: (left: T, right: T) => number
) {
  const nextItems = [...items];
  for (let index = 1; index < nextItems.length; index += 1) {
    const item = nextItems[index];
    let cursor = index - 1;
    while (cursor >= 0 && compare(nextItems[cursor] as T, item as T) > 0) {
      nextItems[cursor + 1] = nextItems[cursor] as T;
      cursor -= 1;
    }
    nextItems[cursor + 1] = item as T;
  }
  return nextItems;
};

const getOrderedIdsFromPositions = (positions?: Record<string, number>) =>
  sortItems(
    Object.entries(positions ?? {}),
    (left, right) => left[1] - right[1]
  ).map(([id]) => id);

const getOrderedIdsFromGridPositions = (positions?: GridPositions) =>
  sortItems(
    Object.entries(positions ?? {}),
    (left, right) => left[1].index - right[1].index
  ).map(([id]) => id);

export const AppDrawerEditSheet = ({
  app,
  focusMode,
  onClose,
  onCreateTag,
  onRemoveTag,
  onReorderPinnedApps,
  onReorderTags,
  onSave,
  pinnedApps,
  tags,
  visible,
}: AppDrawerEditSheetProps) => {
  const { width } = useWindowDimensions();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [alias, setAlias] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [visibility, setVisibility] = useState<
    "default" | "search-only" | "hidden"
  >("default");
  const [newTagLabel, setNewTagLabel] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const snapPoints = useMemo(() => ["90%"], []);

  useEffect(() => {
    if (!app) {
      return;
    }

    setAlias(app.alias ?? app.displayLabel);
    setIsPinned(app.isPinned);
    setVisibility(app.visibility ?? "default");
    setNewTagLabel("");
    setSelectedTagIds(app.tagIds);
  }, [app]);

  useEffect(() => {
    if (visible && app) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, app]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index < 0 && visible) {
        onClose();
      }
    },
    [visible, onClose]
  );

  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((currentTagId) => currentTagId !== tagId)
        : [...current, tagId]
    );
  }, []);

  const handleCreateTag = useCallback(() => {
    const createdTagId = onCreateTag(newTagLabel);
    if (!createdTagId) {
      return;
    }

    setSelectedTagIds((current) =>
      current.includes(createdTagId) ? current : [...current, createdTagId]
    );
    setNewTagLabel("");
  }, [onCreateTag, newTagLabel]);

  const handleSave = useCallback(() => {
    onSave({
      alias,
      isPinned,
      tagIds: selectedTagIds,
      visibility,
    });
  }, [onSave, alias, isPinned, selectedTagIds, visibility]);

  const handleSetPinnedFalse = useCallback(() => {
    setIsPinned(false);
  }, []);

  const handleSetPinnedTrue = useCallback(() => {
    setIsPinned(true);
  }, []);

  const handleSetVisibilityDefault = useCallback(() => {
    setVisibility("default");
  }, []);

  const handleSetVisibilitySearchOnly = useCallback(() => {
    setVisibility("search-only");
  }, []);

  const handleSetVisibilityHidden = useCallback(() => {
    setVisibility("hidden");
  }, []);

  const handleDeselectTag = useCallback((tagId: string) => {
    setSelectedTagIds((current) =>
      current.filter((currentTagId) => currentTagId !== tagId)
    );
  }, []);

  const handleTagDrop = useCallback(
    (_: unknown, __: unknown, positions?: Record<string, number>) => {
      const orderedIds = getOrderedIdsFromPositions(positions);
      if (orderedIds.length > 0) {
        onReorderTags(orderedIds);
      }
    },
    [onReorderTags]
  );

  const handlePinnedDrop = useCallback(
    (_: unknown, __: unknown, positions?: GridPositions) => {
      const orderedIds = getOrderedIdsFromGridPositions(positions);
      if (orderedIds.length > 0) {
        onReorderPinnedApps(orderedIds);
      }
    },
    [onReorderPinnedApps]
  );

  const renderTagRow = useCallback(
    ({ id, item, ...rest }: SortableRenderItemProps<DrawerTag>) => {
      const isSelected = selectedTagIds.includes(item.id);

      return (
        <SortableItem
          key={id}
          id={id}
          data={item}
          onDrop={handleTagDrop}
          {...rest}
        >
          <View
            className={`flex-row items-center bg-secondary border border-border rounded-xl h-[48px] mb-1 px-2 gap-2 ${
              isSelected ? "border-primary" : ""
            }`}
          >
            <TagToggleButton
              tagId={item.id}
              label={item.label}
              isSelected={isSelected}
              onToggle={handleToggleTag}
            />

            <RemoveTagButton
              tagId={item.id}
              onRemoveTag={onRemoveTag}
              onDeselectTag={handleDeselectTag}
            />

            <SortableItem.Handle>
              <View className="h-8 w-8 items-center justify-center">
                <IconMuted name={ICON_MAP.drag} size={16} />
              </View>
            </SortableItem.Handle>
          </View>
        </SortableItem>
      );
    },
    [
      selectedTagIds,
      handleTagDrop,
      handleToggleTag,
      onRemoveTag,
      handleDeselectTag,
    ]
  );

  const renderPinnedItem = useCallback(
    ({ id, item, ...rest }: SortableGridRenderItemProps<DrawerApp>) => (
      <SortableGridItem
        key={id}
        id={id}
        data={item}
        onDrop={handlePinnedDrop}
        {...rest}
      >
        <View className="bg-secondary border border-border rounded-xl items-center justify-center h-full">
          <SortableGridItem.Handle>
            <View className="absolute right-1 top-0.5 z-10">
              <IconMuted name={ICON_MAP.drag} size={16} />
            </View>
          </SortableGridItem.Handle>
          <AppIcon
            packageName={item.packageName}
            label={item.displayLabel}
            letter={item.letter}
            icon={item.icon}
            size={52}
          />
        </View>
      </SortableGridItem>
    ),
    [handlePinnedDrop]
  );

  if (!app) {
    return null;
  }

  const pinnedColumns = Math.max(4, Math.min(5, pinnedApps.length || 4));
  const pinnedGap = 12;
  const pinnedSurfacePadding = 12;
  const pinnedItemWidth = Math.floor(
    (width - 32 - pinnedSurfacePadding * 2 - pinnedGap * (pinnedColumns - 1)) /
      pinnedColumns
  );
  const pinnedItemHeight = Math.max(92, pinnedItemWidth + 22);
  const pinnedRows = Math.max(
    1,
    Math.ceil(Math.max(pinnedApps.length, 1) / pinnedColumns)
  );
  const pinnedGridHeight =
    pinnedRows * pinnedItemHeight + Math.max(pinnedRows - 1, 0) * pinnedGap;
  const tagListHeight = Math.max(tags.length * TAG_ROW_HEIGHT, TAG_ROW_HEIGHT);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBottomSheetBackdrop}
      onChange={handleSheetChange}
      backgroundStyle={{
        backgroundColor: "transparent",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
      handleIndicatorStyle={{
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        height: 5,
        width: 44,
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
        contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-4">
          <AppIcon
            packageName={app.packageName}
            label={app.displayLabel}
            letter={app.letter}
            icon={app.icon}
            size={64}
          />
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-bold text-foreground">
              Customize app
            </Text>
            <Text className="text-sm text-muted-foreground">{app.appName}</Text>
          </View>
        </View>

        <View className="bg-card border border-border rounded-2xl gap-3 p-4">
          <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
            Label
          </Text>
          <TextInput
            autoFocus={focusMode === "rename"}
            className="bg-background border border-border rounded-lg text-foreground text-base flex-1 min-h-[48px] px-3.5"
            onChangeText={setAlias}
            placeholder="Custom label"
            placeholderTextColor="#808080"
            value={alias}
          />
        </View>

        <View className="bg-card border border-border rounded-2xl gap-3 p-4">
          <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
            Show in
          </Text>
          <View className="flex-row bg-muted rounded-lg p-1 gap-1">
            <View
              className={`flex-1 rounded-md min-h-[40px] px-3 justify-center ${
                isPinned ? "bg-transparent" : "bg-primary"
              }`}
              onTouchEnd={handleSetPinnedFalse}
            >
              <Text
                className={`text-sm font-semibold text-center ${
                  isPinned ? "text-muted-foreground" : "text-primary-foreground"
                }`}
              >
                Launcher only
              </Text>
            </View>
            <View
              className={`flex-1 rounded-md min-h-[40px] px-3 justify-center ${
                isPinned ? "bg-primary" : "bg-transparent"
              }`}
              onTouchEnd={handleSetPinnedTrue}
            >
              <Text
                className={`text-sm font-semibold text-center ${
                  isPinned ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Pinned + launcher
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-card border border-border rounded-2xl gap-3 p-4">
          <View className="gap-1">
            <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
              Visibility
            </Text>
            <Text className="text-xs text-muted-foreground">
              Control where this app appears
            </Text>
          </View>
          <View className="gap-1.5">
            <Pressable
              className={`flex-row items-center gap-3 rounded-xl px-3.5 min-h-[48px] border ${
                visibility === "default"
                  ? "bg-primary/10 border-primary"
                  : "bg-secondary border-border"
              }`}
              onPress={handleSetVisibilityDefault}
            >
              <Text className="text-base text-foreground">
                {visibility === "default" ? "\u25CF" : "\u25CB"}
              </Text>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  Default
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Shows in drawer and search
                </Text>
              </View>
            </Pressable>
            <Pressable
              className={`flex-row items-center gap-3 rounded-xl px-3.5 min-h-[48px] border ${
                visibility === "search-only"
                  ? "bg-primary/10 border-primary"
                  : "bg-secondary border-border"
              }`}
              onPress={handleSetVisibilitySearchOnly}
            >
              <Text className="text-base text-foreground">
                {visibility === "search-only" ? "\u25CF" : "\u25CB"}
              </Text>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  Search only
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Hidden from drawer, appears in search
                </Text>
              </View>
            </Pressable>
            <Pressable
              className={`flex-row items-center gap-3 rounded-xl px-3.5 min-h-[48px] border ${
                visibility === "hidden"
                  ? "bg-primary/10 border-primary"
                  : "bg-secondary border-border"
              }`}
              onPress={handleSetVisibilityHidden}
            >
              <Text className="text-base text-foreground">
                {visibility === "hidden" ? "\u25CF" : "\u25CB"}
              </Text>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  Hidden
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Hidden from drawer and search
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View className="bg-card border border-border rounded-2xl gap-3 p-4">
          <View className="gap-1">
            <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
              Tags
            </Text>
            <Text className="text-xs text-muted-foreground">
              Single-select filter in drawer, multi-assign per app
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TextInput
              autoFocus={focusMode === "tags"}
              className="bg-background border border-border rounded-lg text-foreground text-base flex-1 min-h-[48px] px-3.5"
              onChangeText={setNewTagLabel}
              placeholder="Create new tag"
              placeholderTextColor="#808080"
              value={newTagLabel}
            />
            <Pressable
              onPress={handleCreateTag}
              className="h-12 w-12 items-center justify-center bg-primary rounded-lg"
            >
              <Icon name={ICON_MAP.add} size={24} />
            </Pressable>
          </View>

          {tags.length > 0 ? (
            <>
              <View className="flex-row flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    isSelected={selectedTagIds.includes(tag.id)}
                    onToggle={handleToggleTag}
                  />
                ))}
              </View>

              <View className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Reorder tags
                </Text>
                <View
                  className="bg-background rounded-lg p-1"
                  style={{ height: tagListHeight }}
                >
                  <Sortable
                    contentContainerStyle={{ gap: 4, padding: 4 }}
                    data={tags}
                    itemHeight={TAG_ROW_HEIGHT}
                    renderItem={renderTagRow}
                  />
                </View>
              </View>
            </>
          ) : (
            <Text className="text-sm text-muted-foreground leading-5">
              Create a tag first, then assign it to this app.
            </Text>
          )}
        </View>

        <View className="bg-card border border-border rounded-2xl gap-3 p-4">
          <View className="gap-1">
            <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
              Pinned - manually sorted
            </Text>
            <Text className="text-xs text-muted-foreground">
              Drag inside this grid to control favorites order
            </Text>
          </View>

          {pinnedApps.length > 0 ? (
            <SortableGrid
              contentContainerStyle={{ gap: 4, padding: 4 }}
              data={pinnedApps}
              dimensions={{
                columnGap: pinnedGap,
                columns: pinnedColumns,
                itemHeight: pinnedItemHeight,
                itemWidth: pinnedItemWidth,
                rowGap: pinnedGap,
              }}
              renderItem={renderPinnedItem}
              scrollEnabled={false}
              style={{ height: pinnedGridHeight }}
            />
          ) : (
            <Text className="text-sm text-muted-foreground leading-5">
              No pinned apps yet. Use the menu or save this app as pinned first.
            </Text>
          )}
        </View>
      </BottomSheetScrollView>

      <View className="flex-row gap-2 p-4 border-t border-border">
        <Pressable
          onPress={onClose}
          className="flex-1 items-center justify-center bg-secondary rounded-xl min-h-[48px]"
        >
          <Text className="text-base font-bold text-foreground">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          className="flex-1 items-center justify-center bg-primary rounded-xl min-h-[48px]"
        >
          <Text className="text-base font-bold text-primary-foreground">
            Save
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
};
