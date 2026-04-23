import { TrueSheet } from "@lodev09/react-native-true-sheet";
import {
  Card,
  Chip,
  Label,
  Radio,
  RadioGroup,
  useThemeColor,
} from "heroui-native";
import { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
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
import { useTrueSheetVisibility } from "@/hooks/use-true-sheet-visibility";

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
    <Chip
      onPress={handlePress}
      variant={isSelected ? "primary" : "secondary"}
      color="default"
      className={`px-3.5 py-2.5 border ${
        isSelected ? "bg-primary border-primary" : "bg-secondary border-border"
      }`}
    >
      <Icon name={ICON_MAP.tag} size={14} />
      <Chip.Label
        className={`text-sm font-semibold ${
          isSelected ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {tag.label}
      </Chip.Label>
    </Chip>
  );
};

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
  const fieldPlaceholder = useThemeColor("field-placeholder");
  const sheetRef = useRef<TrueSheet>(null);
  const aliasInputRef = useRef<TextInput>(null);
  const [alias, setAlias] = useState(
    () => app?.alias ?? app?.displayLabel ?? ""
  );
  const [isPinned, setIsPinned] = useState(() => app?.isPinned ?? false);
  const [visibility, setVisibility] = useState<
    "default" | "search-only" | "hidden"
  >(() => app?.visibility ?? "default");
  const [newTagLabel, setNewTagLabel] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () => app?.tagIds ?? []
  );

  useTrueSheetVisibility(sheetRef, visible && !!app);

  const handleDidDismiss = useCallback(() => {
    if (visible) {
      onClose();
    }
  }, [visible, onClose]);

  const handleDidPresent = useCallback(() => {
    if (focusMode === "rename") {
      aliasInputRef.current?.focus();
    }
  }, [focusMode]);

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
    <TrueSheet
      key={app?.packageName}
      ref={sheetRef}
      detents={[0.9]}
      cornerRadius={28}
      grabber
      dimmed
      scrollable
      onDidDismiss={handleDidDismiss}
      onDidPresent={handleDidPresent}
    >
      <ScrollView
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

        <Card className="rounded-2xl gap-3 p-4">
          <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
            Label
          </Text>
          <TextInput
            ref={aliasInputRef}
            className="bg-background border border-border rounded-lg text-foreground text-base flex-1 min-h-[48px] px-3.5"
            onChangeText={setAlias}
            placeholder="Custom label"
            placeholderTextColor={fieldPlaceholder}
            value={alias}
          />
        </Card>

        <Card className="rounded-2xl gap-3 p-4">
          <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
            Show in
          </Text>
          <RadioGroup
            value={isPinned ? "pinned" : "launcher"}
            onValueChange={(value) => {
              if (value === "pinned") {
                handleSetPinnedTrue();
              } else {
                handleSetPinnedFalse();
              }
            }}
            className="flex-row bg-muted rounded-lg p-1 gap-1"
          >
            <RadioGroup.Item
              value="launcher"
              className="flex-1 rounded-md min-h-[40px] px-3 justify-center"
            >
              {({ isSelected }) => (
                <Label
                  className={`text-sm font-semibold text-center ${
                    isSelected
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Launcher only
                </Label>
              )}
            </RadioGroup.Item>
            <RadioGroup.Item
              value="pinned"
              className="flex-1 rounded-md min-h-[40px] px-3 justify-center"
            >
              {({ isSelected }) => (
                <Label
                  className={`text-sm font-semibold text-center ${
                    isSelected
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Pinned + launcher
                </Label>
              )}
            </RadioGroup.Item>
          </RadioGroup>
        </Card>

        <Card className="rounded-2xl gap-3 p-4">
          <View className="gap-1">
            <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
              Visibility
            </Text>
            <Text className="text-xs text-muted-foreground">
              Control where this app appears
            </Text>
          </View>
          <RadioGroup
            value={visibility}
            onValueChange={(value) =>
              setVisibility(value as "default" | "search-only" | "hidden")
            }
            className="gap-1.5"
          >
            <RadioGroup.Item
              value="default"
              className="rounded-xl px-3.5 min-h-[48px] gap-3"
            >
              <Radio />
              <View className="flex-1">
                <Label className="text-sm font-semibold text-foreground">
                  Default
                </Label>
                <Text className="text-xs text-muted-foreground">
                  Shows in drawer and search
                </Text>
              </View>
            </RadioGroup.Item>
            <RadioGroup.Item
              value="search-only"
              className="rounded-xl px-3.5 min-h-[48px] gap-3"
            >
              <Radio />
              <View className="flex-1">
                <Label className="text-sm font-semibold text-foreground">
                  Search only
                </Label>
                <Text className="text-xs text-muted-foreground">
                  Hidden from drawer, appears in search
                </Text>
              </View>
            </RadioGroup.Item>
            <RadioGroup.Item
              value="hidden"
              className="rounded-xl px-3.5 min-h-[48px] gap-3"
            >
              <Radio />
              <View className="flex-1">
                <Label className="text-sm font-semibold text-foreground">
                  Hidden
                </Label>
                <Text className="text-xs text-muted-foreground">
                  Hidden from drawer and search
                </Text>
              </View>
            </RadioGroup.Item>
          </RadioGroup>
        </Card>

        <Card className="rounded-2xl gap-3 p-4">
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
              placeholderTextColor={fieldPlaceholder}
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
                    useFlatList={false}
                  />
                </View>
              </View>
            </>
          ) : (
            <Text className="text-sm text-muted-foreground leading-5">
              Create a tag first, then assign it to this app.
            </Text>
          )}
        </Card>

        <Card className="rounded-2xl gap-3 p-4">
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
        </Card>
      </ScrollView>

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
    </TrueSheet>
  );
};
