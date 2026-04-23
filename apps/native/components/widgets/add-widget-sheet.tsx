import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Accordion, SearchField, useThemeColor } from "heroui-native";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppListContext } from "@/context/app-list";
import type { WidgetId } from "@/context/widget-config";
import { DEFAULT_WIDGETS } from "@/context/widget-config";

import { ICON_MAP, IconMuted } from "../ui/icon";
import {
  BuiltinWidgetPreviewCard,
  NativeWidgetPreviewCard,
} from "./widget-picker-preview";

interface NativeProvider {
  label: string;
  minHeight: number;
  minWidth: number;
  packageName: string;
  provider: string;
}

interface NativeProviderGroup {
  appName: string;
  packageName: string;
  providers: NativeProvider[];
}

const BuiltinWidgetPreviewItem = ({
  onAdd,
  widget,
}: {
  onAdd: (id: WidgetId) => Promise<void> | void;
  widget: (typeof DEFAULT_WIDGETS)[number];
}) => {
  const handlePress = useCallback(() => {
    onAdd(widget.id);
  }, [onAdd, widget.id]);

  return (
    <BuiltinWidgetPreviewCard
      label={widget.label}
      onPress={handlePress}
      widgetId={widget.id}
    />
  );
};

const NativeWidgetPreviewItem = ({
  app,
  isBusy,
  onAdd,
  provider,
}: {
  app?:
    | {
        appName: string;
        icon: string | null;
        letter: string;
        packageName: string;
      }
    | undefined;
  isBusy: boolean;
  onAdd: (provider: string, label: string) => Promise<void> | void;
  provider: NativeProvider;
}) => {
  const handlePress = useCallback(() => {
    onAdd(provider.provider, provider.label);
  }, [onAdd, provider.label, provider.provider]);

  return (
    <NativeWidgetPreviewCard
      app={app}
      isBusy={isBusy}
      label={provider.label}
      minHeight={provider.minHeight}
      minWidth={provider.minWidth}
      onPress={handlePress}
    />
  );
};

let cachedNativeProviders: NativeProvider[] | null = null;

interface AddWidgetSheetProps {
  activeWidgetIds: WidgetId[];
  onAdd: (id: WidgetId) => Promise<void> | void;
  onAddNative?: (provider: string, label: string) => Promise<void> | void;
  onClose: () => void;
}

const AddWidgetSheet = function AddWidgetSheet({
  activeWidgetIds,
  onAdd,
  onAddNative,
  onClose,
}: AddWidgetSheetProps) {
  const sheetRef = useRef<TrueSheet>(null);
  const fieldPlaceholder = useThemeColor("field-placeholder");
  const appList = use(AppListContext);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [nativeProviders, setNativeProviders] = useState<NativeProvider[]>([]);
  const [pendingNativeProvider, setPendingNativeProvider] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    if (cachedNativeProviders) {
      setNativeProviders(cachedNativeProviders);
      return;
    }

    try {
      // eslint-disable-next-line unicorn/prefer-module, node/global-require -- conditional native module loading
      const { widgetHostService } = require("react-native-widget-host");
      const providers = widgetHostService.getInstalledWidgetProviders();
      cachedNativeProviders = providers;
      setNativeProviders(providers);
    } catch {
      setNativeProviders([]);
    }
  }, []);

  const query = searchQuery.toLowerCase().trim();

  const availableBuiltinWidgets = useMemo(() => {
    const activeSet = new Set(activeWidgetIds);
    return DEFAULT_WIDGETS.filter((widget) => {
      if (activeSet.has(widget.id)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return widget.label.toLowerCase().includes(query);
    });
  }, [activeWidgetIds, query]);

  const groupedNativeProviders = useMemo<NativeProviderGroup[]>(() => {
    const groups = new Map<string, NativeProvider[]>();

    for (const provider of nativeProviders) {
      if (query && !provider.label.toLowerCase().includes(query)) {
        const app = appList.getApp(provider.packageName);
        const appName = app?.appName ?? provider.packageName;
        if (!appName.toLowerCase().includes(query)) {
          continue;
        }
      }

      const currentProviders = groups.get(provider.packageName) ?? [];
      currentProviders.push(provider);
      groups.set(provider.packageName, currentProviders);
    }

    return [...groups.entries()]
      .map(([packageName, providers]) => {
        const sortedProviders = [...providers].sort((left, right) =>
          left.label.localeCompare(right.label)
        );
        const app = appList.getApp(packageName);
        return {
          appName: app?.appName ?? packageName.split(".").pop() ?? packageName,
          packageName,
          providers: sortedProviders,
        };
      })
      .sort((left, right) => left.appName.localeCompare(right.appName));
  }, [appList, nativeProviders, query]);

  useEffect(() => {
    const groupIds = new Set(
      groupedNativeProviders.map((group) => group.packageName)
    );

    if (query) {
      setExpandedGroups(
        groupedNativeProviders.map((group) => group.packageName)
      );
      return;
    }

    setExpandedGroups((current) => {
      const nextExpanded = current.filter((groupId) => groupIds.has(groupId));
      if (nextExpanded.length > 0) {
        return nextExpanded;
      }

      const [firstGroup] = groupedNativeProviders;
      return firstGroup ? [firstGroup.packageName] : [];
    });
  }, [groupedNativeProviders, query]);

  const hasResults =
    availableBuiltinWidgets.length > 0 || groupedNativeProviders.length > 0;
  const isNativeAddBusy = pendingNativeProvider !== null;

  const handleAddBuiltin = useCallback(
    async (widgetId: WidgetId) => {
      await onAdd(widgetId);
    },
    [onAdd]
  );

  const handleAddNative = useCallback(
    async (provider: string, label: string) => {
      if (!onAddNative || pendingNativeProvider) {
        return;
      }

      setPendingNativeProvider(provider);
      try {
        await onAddNative(provider, label);
      } finally {
        setPendingNativeProvider(null);
      }
    },
    [onAddNative, pendingNativeProvider]
  );

  const handleAccordionValueChange = useCallback(
    (value: string | string[] | undefined) => {
      setExpandedGroups(Array.isArray(value) ? value : []);
    },
    []
  );

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.72, 0.92]}
      initialDetentIndex={0}
      cornerRadius={28}
      grabber
      dimmed
      scrollable
      onDidDismiss={onClose}
    >
      <ScrollView
        contentContainerStyle={{
          gap: 16,
          paddingBottom: 40,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2 pt-1">
          <Text className="text-2xl font-semibold text-foreground">
            Add widgets
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Tap any preview card to add it. Android widgets that need
            customization will open their native setup before being inserted.
          </Text>
        </View>

        <SearchField value={searchQuery} onChange={setSearchQuery}>
          <SearchField.Group className="rounded-2xl h-[52px] px-4 bg-surface-secondary">
            <SearchField.SearchIcon iconProps={{ size: 18 }} />
            <SearchField.Input
              className="text-sm text-foreground"
              placeholder="Search widgets or apps"
              placeholderTextColor={fieldPlaceholder}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        {availableBuiltinWidgets.length > 0 && (
          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-muted-foreground">
                Launcher widgets
              </Text>
              <Text className="text-xs text-muted-foreground">
                {availableBuiltinWidgets.length} available
              </Text>
            </View>

            {availableBuiltinWidgets.map((widget) => (
              <BuiltinWidgetPreviewItem
                key={widget.id}
                onAdd={handleAddBuiltin}
                widget={widget}
              />
            ))}
          </View>
        )}

        {groupedNativeProviders.length > 0 && (
          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-muted-foreground">
                App widgets
              </Text>
              <Text className="text-xs text-muted-foreground">
                {groupedNativeProviders.length} apps
              </Text>
            </View>

            <Accordion
              className="rounded-[28px] border border-border/40 px-2"
              classNames={{
                container: "bg-surface-secondary",
                separator: "bg-border/40",
              }}
              onValueChange={handleAccordionValueChange}
              selectionMode="multiple"
              value={expandedGroups}
              variant="surface"
            >
              {groupedNativeProviders.map((group) => {
                const app = appList.getApp(group.packageName);

                return (
                  <Accordion.Item
                    key={group.packageName}
                    value={group.packageName}
                  >
                    <Accordion.Trigger className="py-4">
                      <View className="flex-1 flex-row items-center gap-3">
                        {app ? (
                          <View pointerEvents="none">
                            <AppIcon
                              icon={app.icon}
                              label={app.appName}
                              letter={app.letter}
                              packageName={app.packageName}
                              showLabel={false}
                              size={24}
                            />
                          </View>
                        ) : (
                          <View className="items-center justify-center rounded-full bg-surface-secondary p-2">
                            <IconMuted name={ICON_MAP.grid} size={16} />
                          </View>
                        )}

                        <View className="flex-1 gap-0.5">
                          <Text className="text-base font-semibold text-foreground">
                            {group.appName}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {group.providers.length} widget
                            {group.providers.length === 1 ? "" : "s"}
                          </Text>
                        </View>
                      </View>
                      <Accordion.Indicator />
                    </Accordion.Trigger>

                    <Accordion.Content className="gap-3 pb-4">
                      {group.providers.map((provider) => (
                        <NativeWidgetPreviewItem
                          key={provider.provider}
                          app={
                            app
                              ? {
                                  appName: app.appName,
                                  icon: app.icon,
                                  letter: app.letter,
                                  packageName: app.packageName,
                                }
                              : undefined
                          }
                          isBusy={isNativeAddBusy}
                          onAdd={handleAddNative}
                          provider={provider}
                        />
                      ))}
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </View>
        )}

        {!hasResults && (
          <View className="items-center justify-center gap-3 rounded-[28px] border border-border/40 px-6 py-10">
            <IconMuted name={ICON_MAP.search} size={22} />
            <Text className="text-base font-medium text-foreground">
              No matching widgets
            </Text>
            <Text className="text-center text-sm leading-5 text-muted-foreground">
              Try another app name or clear the search field.
            </Text>
          </View>
        )}
      </ScrollView>
    </TrueSheet>
  );
};

export { AddWidgetSheet };
