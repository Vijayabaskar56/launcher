import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Card, Input, TextField, useThemeColor } from "heroui-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import type { DrawerTag } from "@/context/drawer-metadata";
import type { IconShape } from "@/types/settings";

import { AppIcon } from "../app-icon";
import { Icon, ICON_MAP } from "../ui/icon";
import { IconButton } from "../ui/icon-button";
import type { DrawerApp } from "./types";

interface FavoritesEditSheetProps {
  visible: boolean;
  onClose: () => void;
  tags: DrawerTag[];
  pinnedApps: DrawerApp[];
  allApps: DrawerApp[];
  iconShape: IconShape;
  onCreateTag: (label: string) => string | null;
  onRemoveTag: (tagId: string) => void;
  onReorderTags: (tagIds: string[]) => void;
  onReorderPinnedApps: (packageNames: string[]) => void;
  onTogglePin: (packageName: string, isPinned: boolean) => void;
}

const TagChip = ({
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
    <Card
      variant="transparent"
      className="flex-row items-center rounded-xl border border-border px-3 py-2.5 gap-2"
    >
      <Text className="text-sm font-semibold text-foreground">
        # {tag.label}
      </Text>
      <IconButton onPress={handleRemove} accessibilityLabel="Remove tag">
        <Icon name={ICON_MAP.close} size={14} />
      </IconButton>
    </Card>
  );
};

const PinnedAppRow = ({
  app,
  iconShape,
  onRemove,
}: {
  app: DrawerApp;
  iconShape: IconShape;
  onRemove: (packageName: string) => void;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(app.packageName);
  }, [onRemove, app.packageName]);

  return (
    <View className="flex-row items-center gap-3 py-2">
      <AppIcon
        packageName={app.packageName}
        label={app.displayLabel}
        letter={app.letter}
        icon={app.icon}
        iconShape={iconShape}
        showLabel={false}
        size={36}
      />
      <Text className="flex-1 text-sm font-semibold text-foreground">
        {app.displayLabel}
      </Text>
      <IconButton onPress={handleRemove} accessibilityLabel="Unpin app">
        <Icon name={ICON_MAP.close} size={18} />
      </IconButton>
    </View>
  );
};

const UnpinnedAppRow = ({
  app,
  iconShape,
  onAdd,
}: {
  app: DrawerApp;
  iconShape: IconShape;
  onAdd: (packageName: string) => void;
}) => {
  const handleAdd = useCallback(() => {
    onAdd(app.packageName);
  }, [onAdd, app.packageName]);

  return (
    <View className="flex-row items-center gap-3 py-2">
      <AppIcon
        packageName={app.packageName}
        label={app.displayLabel}
        letter={app.letter}
        icon={app.icon}
        iconShape={iconShape}
        showLabel={false}
        size={36}
      />
      <Text className="flex-1 text-sm font-semibold text-foreground">
        {app.displayLabel}
      </Text>
      <IconButton onPress={handleAdd} accessibilityLabel="Add to favorites">
        <Icon name={ICON_MAP.add} size={20} />
      </IconButton>
    </View>
  );
};

export const FavoritesEditSheet = ({
  visible,
  onClose,
  tags,
  pinnedApps,
  allApps,
  iconShape,
  onCreateTag,
  onRemoveTag,
  onReorderTags: _onReorderTags,
  onReorderPinnedApps: _onReorderPinnedApps,
  onTogglePin,
}: FavoritesEditSheetProps) => {
  const fieldPlaceholder = useThemeColor("field-placeholder");
  const sheetRef = useRef<TrueSheet>(null);
  const [newTagLabel, setNewTagLabel] = useState("");

  const unpinnedApps = useMemo(
    () => allApps.filter((app) => !app.isPinned),
    [allApps]
  );

  const handleCreateTag = useCallback(() => {
    const trimmed = newTagLabel.trim();
    if (!trimmed) {
      return;
    }

    const result = onCreateTag(trimmed);
    if (result !== null) {
      setNewTagLabel("");
    }
  }, [onCreateTag, newTagLabel]);

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      onRemoveTag(tagId);
    },
    [onRemoveTag]
  );

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

  const renderItem = useCallback(
    ({ item }: { item: DrawerApp }) => (
      <UnpinnedAppRow app={item} iconShape={iconShape} onAdd={handlePin} />
    ),
    [handlePin, iconShape]
  );

  const keyExtractor = useCallback((item: DrawerApp) => item.packageName, []);

  if (!visible) {
    return null;
  }

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.75, 0.95]}
      initialDetentIndex={0}
      cornerRadius={28}
      grabber
      dimmed
      scrollable
      onDidDismiss={onClose}
    >
      <FlatList<DrawerApp>
        data={unpinnedApps}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <View className="gap-4 pb-4">
            {/* Tags section */}
            <View className="gap-3">
              <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
                Tags
              </Text>

              {tags.length > 0 && (
                <View className="flex-row flex-wrap gap-2">
                  {tags.map((tag) => (
                    <TagChip
                      key={tag.id}
                      tag={tag}
                      onRemove={handleRemoveTag}
                    />
                  ))}
                </View>
              )}

              <View className="flex-row items-center gap-2">
                <TextField className="flex-1">
                  <Input
                    className="bg-background border border-border rounded-xl text-foreground text-sm min-h-[44px] px-3"
                    onChangeText={setNewTagLabel}
                    onSubmitEditing={handleCreateTag}
                    placeholder="New tag name"
                    placeholderTextColor={fieldPlaceholder}
                    returnKeyType="done"
                    value={newTagLabel}
                  />
                </TextField>
                <Pressable
                  onPress={handleCreateTag}
                  className="h-10 w-10 rounded-full bg-secondary items-center justify-center"
                >
                  <Icon name={ICON_MAP.add} size={20} />
                </Pressable>
              </View>
            </View>

            {/* Pinned apps section */}
            <View className="gap-3">
              <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
                Pinned apps
              </Text>

              {pinnedApps.length > 0 ? (
                <View>
                  {pinnedApps.map((app) => (
                    <PinnedAppRow
                      key={app.packageName}
                      app={app}
                      iconShape={iconShape}
                      onRemove={handleUnpin}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-muted-foreground leading-5">
                  No pinned apps yet. Add apps from the list below.
                </Text>
              )}
            </View>

            {/* All apps header */}
            <Text className="text-sm font-bold uppercase text-foreground tracking-wide">
              All apps
            </Text>
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <Text className="text-sm text-muted-foreground leading-5">
            All apps are pinned.
          </Text>
        }
      />
    </TrueSheet>
  );
};
