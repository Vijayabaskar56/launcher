import { openApplication } from "expo-intent-launcher";
import { Card, CloseButton, Tabs } from "heroui-native";
import {
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { GestureDetector, ScrollView } from "react-native-gesture-handler";
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
import { useScrollDismissHandoff } from "@/hooks/use-scroll-dismiss-handoff";
import { useSearch } from "@/hooks/use-search";
import { sortedSections } from "@/lib/search-service";
import { sortItems } from "@/lib/sort";
import type { IconShape } from "@/types/settings";

import { AppDrawerActionMenu } from "./app-drawer/action-menu";
import { AppDrawerEditSheet } from "./app-drawer/edit-sheet";
import { FavoritesEditSheet } from "./app-drawer/favorites-edit-sheet";
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
  boundary?: {
    isAtBottom: SharedValue<boolean>;
    isAtTop: SharedValue<boolean>;
  };
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
}

const ALL_PINNED_TAB = "__starred__";

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
  iconShape: IconShape;
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
        iconShape={iconShape}
        showLabel={showLabel}
        onPress={handlePress}
        onLongPress={handleLongPress}
        size={size}
        ref={handleRef}
      />
    </View>
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
  onEditPress,
  onTagPress,
  tags,
  iconRefs,
}: {
  activeTagId: string | null;
  apps: DrawerApp[];
  columns: number;
  iconSize: number;
  iconShape: IconShape;
  showLabels: boolean;
  onAppLongPress: (app: DrawerApp) => void;
  onAppPress: (packageName: string) => void;
  onEditPress: () => void;
  onTagPress: (tagId: string | null) => void;
  tags: DrawerTag[];
  iconRefs: React.MutableRefObject<Map<string, View | null>>;
}) => {
  const handleValueChange = useCallback(
    (value: string) => {
      onTagPress(value === ALL_PINNED_TAB ? null : value);
    },
    [onTagPress]
  );

  return (
    <Card
      variant="transparent"
      className="rounded-3xl p-4 gap-3"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
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
        <View className="gap-1 py-2">
          <Text className="text-base font-bold text-foreground">
            {activeTagId ? "No apps with this tag" : "No pinned apps yet"}
          </Text>
          <Text className="text-sm text-muted-foreground leading-5">
            {activeTagId
              ? "Tap the star to see all pinned apps, or long press an app to assign this tag."
              : "Long press any app to pin it here."}
          </Text>
        </View>
      )}

      <View className="flex-row items-center gap-2">
        <Tabs
          value={activeTagId ?? ALL_PINNED_TAB}
          onValueChange={handleValueChange}
          variant="primary"
          className="flex-1"
        >
          <Tabs.List className="bg-transparent p-0">
            <Tabs.ScrollView contentContainerClassName="gap-2">
              <Tabs.Indicator className="hidden" />
              <Tabs.Trigger
                value={ALL_PINNED_TAB}
                className="p-0 bg-transparent rounded-none"
              >
                {({ isSelected }) => (
                  <View
                    className={`rounded-full px-3 py-2 border items-center justify-center ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-secondary border-border"
                    }`}
                  >
                    <Icon name={ICON_MAP.star} size={14} />
                  </View>
                )}
              </Tabs.Trigger>
              {tags.map((tag) => (
                <Tabs.Trigger
                  key={tag.id}
                  value={tag.id}
                  className="p-0 bg-transparent rounded-none"
                >
                  {({ isSelected }) => (
                    <View
                      className={`rounded-full px-3 py-2 border flex-row items-center gap-1.5 ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "bg-secondary border-border"
                      }`}
                    >
                      <Icon name={ICON_MAP.tag} size={14} />
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {tag.label}
                      </Text>
                    </View>
                  )}
                </Tabs.Trigger>
              ))}
            </Tabs.ScrollView>
          </Tabs.List>
        </Tabs>

        <CloseButton onPress={onEditPress}>
          <Icon name={ICON_MAP.edit} size={14} />
        </CloseButton>
      </View>
    </Card>
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
  iconShape: IconShape;
  showLabels: boolean;
  onAppLongPress: (app: DrawerApp) => void;
  onAppPress: (packageName: string) => void;
  iconRefs: React.MutableRefObject<Map<string, View | null>>;
}) => (
  <Card
    variant="transparent"
    className="rounded-3xl p-4 gap-4"
    style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
  >
    <View className="gap-1">
      <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        All apps
      </Text>
      <Text className="text-lg font-bold text-foreground">Launcher</Text>
    </View>

    {apps.length > 0 ? (
      <View className="flex-row flex-wrap gap-y-4">
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
      <View className="gap-1">
        <Text className="text-base font-bold text-foreground">
          {emptyTitle}
        </Text>
        <Text className="text-sm text-muted-foreground leading-5">
          Try a different search term or clear the query to browse the full
          launcher list.
        </Text>
      </View>
    )}
  </Card>
);

const HiddenAppRow = ({
  app,
  onUnhide,
}: {
  app: DrawerApp;
  onUnhide: (packageName: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onUnhide(app.packageName);
  }, [app.packageName, onUnhide]);

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      alignItems: "center" as const,
      borderRadius: 12,
      flexDirection: "row" as const,
      gap: 12,
      opacity: pressed ? 0.7 : 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
    }),
    []
  );

  return (
    <Pressable onPress={handlePress} style={getStyle}>
      {app.icon ? (
        <Image
          source={{ uri: app.icon }}
          style={{ borderRadius: 10, height: 40, width: 40 }}
        />
      ) : (
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#6366f1",
            borderRadius: 10,
            height: 40,
            justifyContent: "center",
            width: 40,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "700",
            }}
          >
            {app.displayLabel.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text className="text-base font-medium text-foreground">
          {app.displayLabel}
        </Text>
        <Text className="text-xs text-muted-foreground">Tap to unhide</Text>
      </View>
      <Icon name={ICON_MAP.eye} size={20} />
    </Pressable>
  );
};

// eslint-disable-next-line complexity
export const AppDrawer = ({ boundary, offset, slideFrom }: AppDrawerProps) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const config = use(LauncherConfigContext);
  const appList = use(AppListContext);
  const drawerMetadata = use(DrawerMetadataContext);
  const settings = use(SettingsContext);
  const search = useSearchBar();
  const drawerActions = drawerMetadata?.actions;
  const columns = config?.state.gridColumns ?? 6;
  const localIsAtTop = useSharedValue(true);
  const localIsAtBottom = useSharedValue(true);
  const panelIsAtTop = boundary?.isAtTop ?? localIsAtTop;
  const panelIsAtBottom = boundary?.isAtBottom ?? localIsAtBottom;
  const scrollRef = useRef<ScrollView>(null);
  const scrollContentHeightRef = useRef(0);
  const scrollViewportHeightRef = useRef(0);
  const lastScrollOffsetRef = useRef(0);
  const { handleScrollGestureUpdate, scrollGesture } =
    useScrollDismissHandoff();
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<DrawerActionMenuState | null>(
    null
  );
  const [editorAppId, setEditorAppId] = useState<string | null>(null);
  const [editorFocusMode, setEditorFocusMode] =
    useState<DrawerEditorFocusMode | null>(null);
  const [showHiddenApps, setShowHiddenApps] = useState(false);
  const [showFavoritesEdit, setShowFavoritesEdit] = useState(false);

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

  useEffect(() => {
    if (isSearching) {
      if (!panelIsAtTop.value) {
        panelIsAtTop.value = true;
      }
      if (!panelIsAtBottom.value) {
        panelIsAtBottom.value = true;
      }
    }
  }, [isSearching, panelIsAtBottom, panelIsAtTop]);

  const handleCloseActionMenu = useCallback(() => {
    setActionMenu(null);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditorAppId(null);
    setEditorFocusMode(null);
    search?.actions.setHidden(false);
  }, [search]);

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

  const updateBoundaryFromScroll = useCallback(
    (nextOffset: number) => {
      lastScrollOffsetRef.current = nextOffset;
      panelIsAtTop.value = nextOffset <= 1;

      const viewportHeight = scrollViewportHeightRef.current;
      const contentHeight = scrollContentHeightRef.current;
      panelIsAtBottom.value =
        contentHeight <= viewportHeight + 1 ||
        nextOffset + viewportHeight >= contentHeight - 1;
    },
    [panelIsAtBottom, panelIsAtTop]
  );

  const resetScrollPosition = useCallback(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
    updateBoundaryFromScroll(0);
    handleCloseActionMenu();
    handleCloseEditor();
  }, [handleCloseActionMenu, handleCloseEditor, updateBoundaryFromScroll]);

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

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      updateBoundaryFromScroll(event.nativeEvent.contentOffset.y);
    },
    [updateBoundaryFromScroll]
  );

  const handleScrollLayout = useCallback(
    (event: LayoutChangeEvent) => {
      scrollViewportHeightRef.current = event.nativeEvent.layout.height;
      updateBoundaryFromScroll(lastScrollOffsetRef.current);
    },
    [updateBoundaryFromScroll]
  );

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      scrollContentHeightRef.current = height;
      updateBoundaryFromScroll(lastScrollOffsetRef.current);
    },
    [updateBoundaryFromScroll]
  );

  const panGesture = useDirectionalDismiss({
    isAtBottom: panelIsAtBottom,
    isAtTop: panelIsAtTop,
    offset,
    screenHeight,
    screenWidth,
    scrollGesture,
    slideFrom,
  });

  const iconShape = settings?.state.icons.iconShape ?? "circle";
  const showLabels = settings?.state.icons.showLabels ?? true;

  const allApps = useMemo<DrawerApp[]>(
    () =>
      drawerMetadata
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
        : [],
    [appList.apps, drawerMetadata]
  );

  const { appByPkg, hiddenApps, sortedApps } = useMemo(() => {
    const visible = allApps.filter((app) => app.visibility === "default");
    return {
      appByPkg: Object.fromEntries(
        allApps.map((app) => [app.packageName, app])
      ),
      hiddenApps: sortAppsAlphabetically(
        allApps.filter((app) => app.visibility === "hidden")
      ),
      sortedApps: sortAppsAlphabetically(visible),
    };
  }, [allApps]);

  const orderedTags = useMemo(
    () => (drawerMetadata ? getOrderedTags(drawerMetadata.state) : []),
    [drawerMetadata]
  );

  const pinnedApps = useMemo(() => {
    const orderedPinnedPkgs = drawerMetadata
      ? getOrderedPinnedPackages(drawerMetadata.state)
      : [];
    return orderedPinnedPkgs.flatMap((pkg) => {
      const app = appByPkg[pkg];
      return app && app.visibility === "default" ? [app] : [];
    });
  }, [appByPkg, drawerMetadata]);

  const filteredPinnedApps = useMemo(
    () =>
      activeTagId === null
        ? pinnedApps
        : pinnedApps.filter((app) => app.tagIds.includes(activeTagId)),
    [activeTagId, pinnedApps]
  );

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

  const handleOpenFavoritesEdit = useCallback(() => {
    setShowFavoritesEdit(true);
    search?.actions.setHidden(true);
  }, [search]);

  const handleCloseFavoritesEdit = useCallback(() => {
    setShowFavoritesEdit(false);
    search?.actions.setHidden(false);
  }, [search]);

  const handleTogglePinFromEdit = useCallback(
    (packageName: string, isPinned: boolean) => {
      drawerActions?.setPinned(packageName, isPinned);
    },
    [drawerActions]
  );

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
      search?.actions.setHidden(true);
    },
    [actionApp, search?.actions]
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

  const handleUnhideApp = useCallback(
    (packageName: string) => {
      drawerActions?.setVisibility(packageName, "default");
    },
    [drawerActions]
  );

  const handleOpenHidden = useCallback(() => {
    setShowHiddenApps(true);
  }, []);

  const handleCloseHidden = useCallback(() => {
    setShowHiddenApps(false);
  }, []);

  if (!config || !drawerMetadata || !search) {
    return null;
  }

  const contentPaddingBottom = insets.bottom + 96;
  const contentPaddingTop = insets.top + 76;

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          className="absolute bottom-0 left-0 right-0 top-0"
          style={[{ backgroundColor: "rgba(0,0,0,0.65)" }, animatedStyle]}
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
              onContentSizeChange={handleContentSizeChange}
              onGestureUpdate_CAN_CAUSE_INFINITE_RERENDER={
                handleScrollGestureUpdate
              }
              onLayout={handleScrollLayout}
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
                onEditPress={handleOpenFavoritesEdit}
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

              {hiddenApps.length > 0 ? (
                <Pressable
                  onPress={handleOpenHidden}
                  className="flex-row items-center bg-secondary border border-border rounded-2xl gap-2 px-4 py-3 min-h-[48px] justify-center"
                >
                  <Icon name={ICON_MAP.eyeOff} size={18} />
                  <Text className="text-base font-bold text-foreground">
                    Show Hidden Apps ({hiddenApps.length})
                  </Text>
                </Pressable>
              ) : null}
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

      <FavoritesEditSheet
        allApps={sortedApps}
        iconShape={iconShape}
        onClose={handleCloseFavoritesEdit}
        onCreateTag={handleCreateTag}
        onRemoveTag={handleRemoveTag}
        onReorderPinnedApps={handleReorderPinnedApps}
        onReorderTags={handleReorderTags}
        onTogglePin={handleTogglePinFromEdit}
        pinnedApps={pinnedApps}
        tags={orderedTags}
        visible={showFavoritesEdit}
      />

      <Modal
        visible={showHiddenApps}
        transparent
        animationType="fade"
        onRequestClose={handleCloseHidden}
        statusBarTranslucent
      >
        <Pressable
          style={{
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
            flex: 1,
            justifyContent: "center",
            padding: 32,
          }}
          onPress={handleCloseHidden}
        >
          <Pressable
            style={{
              backgroundColor: "#1a1a2e",
              borderCurve: "continuous",
              borderRadius: 20,
              maxHeight: "70%",
              overflow: "hidden",
              width: "100%",
            }}
          >
            <View
              style={{
                gap: 4,
                paddingBottom: 12,
                paddingHorizontal: 24,
                paddingTop: 24,
              }}
            >
              <Text className="text-xl font-bold text-foreground">
                Hidden Apps
              </Text>
              <Text className="text-sm text-muted-foreground">
                Tap an app to unhide it
              </Text>
            </View>
            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={{
                paddingBottom: 20,
                paddingHorizontal: 12,
              }}
              showsVerticalScrollIndicator={false}
            >
              {hiddenApps.map((app) => (
                <HiddenAppRow
                  key={app.packageName}
                  app={app}
                  onUnhide={handleUnhideApp}
                />
              ))}
              {hiddenApps.length === 0 ? (
                <View style={{ alignItems: "center", padding: 24 }}>
                  <Text className="text-sm text-muted-foreground">
                    No hidden apps
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
