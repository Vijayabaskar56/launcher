import { openApplication } from "expo-intent-launcher";
import {
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { AppListContext } from "@/context/app-list";
import {
  DrawerMetadataContext,
  getDisplayLabelForApp,
  getOrderedPinnedPackages,
  getOrderedTags,
} from "@/context/drawer-metadata";
import type { DrawerTag } from "@/context/drawer-metadata";
import { LauncherConfigContext } from "@/context/launcher-config";
import { SettingsContext } from "@/context/settings";
import { useDirectionalDismiss } from "@/hooks/use-directional-dismiss";
import {
  isHorizontal,
  useDirectionalPanel,
} from "@/hooks/use-directional-panel";
import type { SlideFrom } from "@/hooks/use-directional-panel";
import { useSearch } from "@/hooks/use-search";
import { sortedSections } from "@/lib/search-service";

import { AppDrawerActionMenu } from "./app-drawer/action-menu";
import { AppDrawerEditSheet } from "./app-drawer/edit-sheet";
import type {
  DrawerActionMenuState,
  DrawerApp,
  DrawerEditorFocusMode,
} from "./app-drawer/types";
import { AppIcon } from "./app-icon";
import { useSearchBar } from "./search-bar";
import { SearchResultsList } from "./search/search-results-list";
import { Icon, ICON_MAP } from "./ui/icon";

interface AppDrawerProps {
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
}

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

const sortAppsAlphabetically = (apps: DrawerApp[]) =>
  sortItems(apps, (left, right) =>
    left.displayLabel.localeCompare(right.displayLabel)
  );

const DrawerAppIcon = ({
  app,
  isPinned,
  iconShape,
  showLabel,
  onPress,
  onLongPress,
  size,
  iconRefs,
  columns,
}: {
  app: DrawerApp;
  isPinned: boolean;
  iconShape: string;
  showLabel: boolean;
  onPress: (packageName: string) => void;
  onLongPress: (app: DrawerApp) => void;
  size: number;
  iconRefs: React.MutableRefObject<Map<string, View | null>>;
  columns: number;
}) => {
  const handlePress = useCallback(() => {
    onPress(app.packageName);
  }, [onPress, app.packageName]);

  const handleLongPress = useCallback(() => {
    onLongPress(app);
  }, [onLongPress, app]);

  const handleRef = useCallback(
    (el: View | null) => {
      iconRefs.current.set(app.packageName, el);
    },
    [iconRefs, app.packageName]
  );

  return (
    <View className="items-center" style={{ width: `${100 / columns}%` }}>
      <AppIcon
        isPinned={isPinned}
        packageName={app.packageName}
        label={app.displayLabel}
        letter={app.letter}
        icon={app.icon}
        iconShape={iconShape as never}
        showLabel={showLabel}
        onPress={handlePress}
        onLongPress={handleLongPress}
        size={size}
        ref={handleRef}
      />
    </View>
  );
};

const TagPill = ({
  tag,
  isActive,
  onTagPress,
}: {
  tag: DrawerTag;
  isActive: boolean;
  onTagPress: (tagId: string | null) => void;
}) => {
  const handlePress = useCallback(() => {
    onTagPress(isActive ? null : tag.id);
  }, [onTagPress, isActive, tag.id]);

  return (
    <Pressable
      className={`rounded-full px-3.5 py-2.5 border flex-row items-center gap-1.5 ${
        isActive ? "bg-primary border-primary" : "bg-secondary border-border"
      }`}
      onPress={handlePress}
    >
      <Icon name={ICON_MAP.tag} size={14} />
      <Text
        className={`text-sm font-semibold ${
          isActive ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {tag.label}
      </Text>
    </Pressable>
  );
};

const PinnedSection = ({
  activeTagId,
  apps,
  columns,
  iconSize,
  iconShape,
  showLabels,
  onAppLongPress,
  onAppPress,
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
  onTagPress: (tagId: string | null) => void;
  tags: DrawerTag[];
  iconRefs: React.MutableRefObject<Map<string, View | null>>;
}) => {
  const handleAllPress = useCallback(() => {
    onTagPress(null);
  }, [onTagPress]);

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Favorites
        </Text>
        <Text className="text-xl font-extrabold text-foreground">
          Pinned apps
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Pressable
          className={`rounded-full px-3.5 py-2.5 border flex-row items-center gap-1.5 ${
            activeTagId === null
              ? "bg-primary border-primary"
              : "bg-secondary border-border"
          }`}
          onPress={handleAllPress}
        >
          <Icon name={ICON_MAP.star} size={14} />
          <Text
            className={`text-sm font-semibold ${
              activeTagId === null
                ? "text-primary-foreground"
                : "text-foreground"
            }`}
          >
            All
          </Text>
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

      {apps.length > 0 ? (
        <View className="flex-row flex-wrap -mx-1 gap-y-3">
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
        <View className="bg-card border border-border rounded-2xl gap-1 p-4">
          <Text className="text-base font-bold text-foreground">
            No pinned apps here yet
          </Text>
          <Text className="text-sm text-muted-foreground leading-5">
            Long press any launcher app to pin it, or clear the active tag
            filter to see all favorites again.
          </Text>
        </View>
      )}
    </View>
  );
};

const LauncherSection = ({
  apps,
  columns,
  emptyTitle,
  iconSize,
  iconShape,
  showLabels,
  onAppLongPress,
  onAppPress,
  iconRefs,
}: {
  apps: DrawerApp[];
  columns: number;
  emptyTitle: string;
  iconSize: number;
  iconShape: string;
  showLabels: boolean;
  onAppLongPress: (app: DrawerApp) => void;
  onAppPress: (packageName: string) => void;
  iconRefs: React.MutableRefObject<Map<string, View | null>>;
}) => (
  <View className="gap-4">
    <View className="gap-1">
      <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        All apps
      </Text>
      <Text className="text-lg font-bold text-foreground">Launcher</Text>
    </View>

    {apps.length > 0 ? (
      <View className="flex-row flex-wrap -mx-1 gap-y-4">
        {apps.map((app) => (
          <DrawerAppIcon
            key={app.packageName}
            app={app}
            isPinned={app.isPinned}
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
      <View className="bg-card border border-border rounded-2xl gap-1 p-4">
        <Text className="text-base font-bold text-foreground">
          {emptyTitle}
        </Text>
        <Text className="text-sm text-muted-foreground leading-5">
          Try a different search term or clear the query to browse the full
          launcher list.
        </Text>
      </View>
    )}
  </View>
);

// eslint-disable-next-line complexity
export const AppDrawer = ({ offset, slideFrom }: AppDrawerProps) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const config = use(LauncherConfigContext);
  const appList = use(AppListContext);
  const drawerMetadata = use(DrawerMetadataContext);
  const settings = use(SettingsContext);
  const search = useSearchBar();
  const drawerActions = drawerMetadata?.actions;
  const columns = config?.state.gridColumns ?? 6;
  const scrollOffset = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<DrawerActionMenuState | null>(
    null
  );
  const [editorAppId, setEditorAppId] = useState<string | null>(null);
  const [editorFocusMode, setEditorFocusMode] =
    useState<DrawerEditorFocusMode | null>(null);

  const searchQuery = useDeferredValue(search?.state.searchText.trim() ?? "");
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const isSearching = normalizedSearchQuery.length > 0;

  const searchResults = useSearch(searchQuery);

  // Wire filter toggle ref so #filter suggestions can toggle search filters
  useEffect(() => {
    if (search?.filterToggleRef) {
      search.filterToggleRef.current = searchResults.handleToggleFilter;
    }
  }, [search, searchResults.handleToggleFilter]);

  // Wire submit ref so pressing Enter launches the best match
  const handleSubmitSearch = useCallback(() => {
    // Try the first result from the highest-priority section
    const sections = sortedSections(searchResults.results);
    if (sections.length > 0) {
      const [topSection] = sections;
      const [firstResult] = topSection.data;
      if (firstResult) {
        firstResult.onPress();
        return;
      }
    }

    // Fall back to the first quick action
    const [firstAction] = searchResults.actions;
    if (firstAction) {
      firstAction.onPress();
    }
  }, [searchResults.results, searchResults.actions]);

  useEffect(() => {
    if (search?.submitRef) {
      search.submitRef.current = handleSubmitSearch;
    }
  }, [search, handleSubmitSearch]);

  const handleCloseActionMenu = useCallback(() => {
    setActionMenu(null);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditorAppId(null);
    setEditorFocusMode(null);
  }, []);

  const resetScrollPosition = useCallback(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
    handleCloseActionMenu();
    handleCloseEditor();
  }, [handleCloseActionMenu, handleCloseEditor]);

  useAnimatedReaction(
    () => {
      const size = isHorizontal(slideFrom.value) ? screenWidth : screenHeight;
      return offset.value > size - 10;
    },
    (isClosed, wasClosed) => {
      if (isClosed && !wasClosed) {
        scheduleOnRN(resetScrollPosition);
      }
    },
    [screenHeight, screenWidth]
  );

  useEffect(() => {
    if (!drawerMetadata || !activeTagId) {
      return;
    }

    const tagStillExists = getOrderedTags(drawerMetadata.state).some(
      (tag) => tag.id === activeTagId
    );

    if (!tagStillExists) {
      setActiveTagId(null);
    }
  }, [activeTagId, drawerMetadata]);

  const { animatedStyle } = useDirectionalPanel({
    offset,
    screenHeight,
    screenWidth,
    slideFrom,
  });

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollOffset.value = event.nativeEvent.contentOffset.y;
    },
    [scrollOffset]
  );

  const panGesture = useDirectionalDismiss({
    offset,
    screenHeight,
    screenWidth,
    scrollOffset,
    slideFrom,
  });

  const iconShape = settings?.state.icons.iconShape ?? "circle";
  const showLabels = settings?.state.icons.showLabels ?? true;

  const allApps: DrawerApp[] = drawerMetadata
    ? appList.apps.map((app) => {
        const metadata = drawerMetadata.state.apps[app.packageName];

        return {
          ...app,
          alias: metadata?.alias,
          displayLabel: getDisplayLabelForApp(app, drawerMetadata.state),
          id: app.packageName,
          isPinned: metadata?.isPinned ?? false,
          pinnedOrder: metadata?.pinnedOrder,
          tagIds: metadata?.tagIds ?? [],
          visibility: metadata?.visibility ?? "default",
        };
      })
    : [];

  const drawerVisibleApps = allApps.filter(
    (app) => app.visibility === "default"
  );
  const sortedApps = sortAppsAlphabetically(drawerVisibleApps);
  const appByPkg = Object.fromEntries(
    allApps.map((app) => [app.packageName, app])
  );
  const orderedTags = drawerMetadata
    ? getOrderedTags(drawerMetadata.state)
    : [];
  const orderedPinnedPkgs = drawerMetadata
    ? getOrderedPinnedPackages(drawerMetadata.state)
    : [];
  const pinnedApps = orderedPinnedPkgs.flatMap((pkg) => {
    const app = appByPkg[pkg];
    return app && app.visibility === "default" ? [app] : [];
  });
  const filteredPinnedApps =
    activeTagId === null
      ? pinnedApps
      : pinnedApps.filter((app) => app.tagIds.includes(activeTagId));
  const actionApp = actionMenu ? appByPkg[actionMenu.packageName] : null;
  const editorApp = editorAppId ? appByPkg[editorAppId] : null;

  const cellWidth = Math.floor(
    (screenWidth - 32 - 8 * (columns - 1)) / columns
  );
  const iconSize = Math.max(44, Math.min(60, cellWidth - 16));
  const iconRefs = useRef<Map<string, View | null>>(new Map());

  const handleAppPress = useCallback((packageName: string) => {
    openApplication(packageName);
  }, []);

  const handleAppLongPress = useCallback((app: DrawerApp) => {
    if (Platform.OS !== "web") {
      Vibration.vibrate(10);
    }

    const view = iconRefs.current.get(app.packageName);
    if (view) {
      view.measureInWindow((x, y, width, height) => {
        setActionMenu({
          packageName: app.packageName,
          triggerBounds: { height, width, x, y },
        });
      });
    }
  }, []);

  const handleTogglePinned = useCallback(() => {
    if (!actionApp || !drawerActions) {
      return;
    }

    drawerActions.setPinned(actionApp.packageName, !actionApp.isPinned);
  }, [actionApp, drawerActions]);

  const handleOpenEditor = useCallback(
    (focusMode: DrawerEditorFocusMode) => {
      if (!actionApp) {
        return;
      }

      setEditorAppId(actionApp.packageName);
      setEditorFocusMode(focusMode);
    },
    [actionApp]
  );

  const handleOpenRename = useCallback(() => {
    handleOpenEditor("rename");
  }, [handleOpenEditor]);

  const handleOpenTags = useCallback(() => {
    handleOpenEditor("tags");
  }, [handleOpenEditor]);

  const handleSaveEditor = useCallback(
    ({
      alias,
      isPinned,
      tagIds,
      visibility,
    }: {
      alias: string;
      isPinned: boolean;
      tagIds: string[];
      visibility: "default" | "search-only" | "hidden";
    }) => {
      if (!editorApp) {
        return;
      }

      if (!drawerActions) {
        return;
      }

      drawerActions.setAlias(
        editorApp.packageName,
        alias.trim() === editorApp.appName ? "" : alias
      );
      drawerActions.setAppTags(editorApp.packageName, tagIds);
      drawerActions.setPinned(editorApp.packageName, isPinned);
      drawerActions.setVisibility(editorApp.packageName, visibility);
      handleCloseEditor();
    },
    [drawerActions, editorApp, handleCloseEditor]
  );

  const handleCreateTag = useCallback(
    (label: string) => drawerActions?.createTag(label) ?? null,
    [drawerActions]
  );

  const handleReorderPinnedApps = useCallback(
    (appIds: string[]) => {
      drawerActions?.reorderPinnedApps(appIds);
    },
    [drawerActions]
  );

  const handleReorderTags = useCallback(
    (tagIds: string[]) => {
      drawerActions?.reorderTags(tagIds);
    },
    [drawerActions]
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      if (activeTagId === tagId) {
        setActiveTagId(null);
      }
      drawerActions?.removeTag(tagId);
    },
    [activeTagId, drawerActions]
  );

  if (!config || !drawerMetadata || !search) {
    return null;
  }

  const contentPaddingBottom = insets.bottom + 96;
  const contentPaddingTop = insets.top + 76;

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          className="absolute bottom-0 left-0 right-0 top-0 bg-background"
          style={animatedStyle}
        >
          {isSearching ? (
            <View className="flex-1" style={{ paddingTop: contentPaddingTop }}>
              <SearchResultsList
                results={searchResults.results}
                actions={searchResults.actions}
                activeFilters={searchResults.activeFilters}
                availableFilters={searchResults.availableFilters}
                onToggleFilter={searchResults.handleToggleFilter}
                allowNetwork={searchResults.allowNetwork}
                onToggleNetwork={searchResults.handleToggleNetwork}
                filterBarEnabled={
                  settings?.state.search.filterBarEnabled ?? true
                }
              />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              className="flex-1"
              contentContainerStyle={{
                gap: 32,
                paddingBottom: contentPaddingBottom,
                paddingHorizontal: 16,
                paddingTop: contentPaddingTop,
              }}
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <PinnedSection
                activeTagId={activeTagId}
                apps={filteredPinnedApps}
                columns={columns}
                iconSize={iconSize}
                iconShape={iconShape}
                showLabels={showLabels}
                onAppLongPress={handleAppLongPress}
                onAppPress={handleAppPress}
                onTagPress={setActiveTagId}
                tags={orderedTags}
                iconRefs={iconRefs}
              />

              <LauncherSection
                apps={sortedApps}
                columns={columns}
                emptyTitle="No apps available"
                iconSize={iconSize}
                iconShape={iconShape}
                showLabels={showLabels}
                onAppLongPress={handleAppLongPress}
                onAppPress={handleAppPress}
                iconRefs={iconRefs}
              />
            </ScrollView>
          )}
        </Animated.View>
      </GestureDetector>

      <AppDrawerActionMenu
        app={actionApp}
        menuState={actionMenu}
        onClose={handleCloseActionMenu}
        onOpenRename={handleOpenRename}
        onOpenTags={handleOpenTags}
        onTogglePinned={handleTogglePinned}
      />

      <AppDrawerEditSheet
        app={editorApp}
        focusMode={editorFocusMode}
        onClose={handleCloseEditor}
        onCreateTag={handleCreateTag}
        onRemoveTag={handleRemoveTag}
        onReorderPinnedApps={handleReorderPinnedApps}
        onReorderTags={handleReorderTags}
        onSave={handleSaveEditor}
        pinnedApps={pinnedApps}
        tags={orderedTags}
        visible={editorApp !== null}
      />
    </>
  );
};
