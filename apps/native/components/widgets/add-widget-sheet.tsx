import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { SearchField } from "heroui-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { DEFAULT_WIDGETS, WIDGET_ICONS } from "@/context/widget-config";
import type { WidgetId } from "@/context/widget-config";

import {
  SHEET_TRANSLUCENT_BACKGROUND,
  SHEET_TRANSLUCENT_HANDLE,
} from "../ui/bottom-sheet-styles";
import { Icon, IconAccent, ICON_MAP } from "../ui/icon";

const BuiltinWidgetRow = ({
  widget,
  onAdd,
}: {
  widget: { id: string; label: string };
  onAdd: (id: WidgetId) => void;
}) => {
  const handlePress = useCallback(() => {
    onAdd(widget.id);
  }, [onAdd, widget.id]);

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center rounded-xl border border-white/10 px-4 h-14 gap-3"
      style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    >
      <IconAccent name={ICON_MAP[WIDGET_ICONS[widget.id] ?? "box"]} size={22} />
      <Text className="flex-1 text-sm font-semibold text-white/90">
        {widget.label}
      </Text>
      <Icon name={ICON_MAP.add} size={20} />
    </Pressable>
  );
};

const NativeProviderRow = ({
  provider,
  onAddNative,
}: {
  provider: NativeProvider;
  onAddNative?: (provider: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onAddNative?.(provider.provider);
  }, [onAddNative, provider.provider]);

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center rounded-xl border border-white/10 px-4 h-14 gap-3"
      style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    >
      <Icon name={ICON_MAP.grid} size={22} />
      <Text className="flex-1 text-sm font-semibold text-white/90">
        {provider.label}
      </Text>
      <Icon name={ICON_MAP.add} size={20} />
    </Pressable>
  );
};

interface NativeProvider {
  provider: string;
  packageName: string;
  label: string;
}

let cachedNativeProviders: NativeProvider[] | null = null;

interface AddWidgetSheetProps {
  activeWidgetIds: WidgetId[];
  onAdd: (id: WidgetId) => void;
  onAddNative?: (provider: string) => void;
  onClose: () => void;
}

const AddWidgetSheet = function AddWidgetSheet({
  activeWidgetIds,
  onAdd,
  onAddNative,
  onClose,
}: AddWidgetSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nativeProviders, setNativeProviders] = useState<NativeProvider[]>([]);
  const snapPoints = useMemo(() => ["60%", "90%"], []);

  // Fetch native widget providers (cached at module scope after first call)
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }
    if (cachedNativeProviders) {
      setNativeProviders(cachedNativeProviders);
      return;
    }
    try {
      // eslint-disable-next-line unicorn/prefer-module, node/global-require
      const { widgetHostService } = require("react-native-widget-host");
      const providers = widgetHostService.getInstalledWidgetProviders();
      cachedNativeProviders = providers;
      setNativeProviders(providers);
    } catch {
      // Module not available
    }
  }, []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index < 0) {
        onClose();
      }
    },
    [onClose]
  );

  const query = searchQuery.toLowerCase().trim();

  const availableBuiltinWidgets = useMemo(() => {
    const activeSet = new Set(activeWidgetIds);
    return DEFAULT_WIDGETS.filter((w) => {
      if (activeSet.has(w.id)) {
        return false;
      }
      if (query && !w.label.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [activeWidgetIds, query]);

  // Group native providers by package
  const groupedNativeProviders = useMemo(() => {
    const filtered = query
      ? nativeProviders.filter((p) => p.label.toLowerCase().includes(query))
      : nativeProviders;

    const groups = new Map<string, NativeProvider[]>();
    for (const provider of filtered) {
      const existing = groups.get(provider.packageName) ?? [];
      existing.push(provider);
      groups.set(provider.packageName, existing);
    }
    return [...groups.entries()].toSorted(([a], [b]) => a.localeCompare(b));
  }, [nativeProviders, query]);

  const hasResults =
    availableBuiltinWidgets.length > 0 || groupedNativeProviders.length > 0;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={SHEET_TRANSLUCENT_BACKGROUND}
      handleIndicatorStyle={SHEET_TRANSLUCENT_HANDLE}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          gap: 12,
          paddingBottom: 40,
          paddingHorizontal: 16,
        }}
      >
        <SearchField value={searchQuery} onChange={setSearchQuery}>
          <SearchField.Group
            className="rounded-xl px-4 h-12"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <SearchField.SearchIcon iconProps={{ size: 18 }} />
            <SearchField.Input
              className="text-sm text-white"
              placeholder="Search"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        {!hasResults && (
          <View className="items-center py-8">
            <Text className="text-sm text-white/50">No matching widgets</Text>
          </View>
        )}

        {availableBuiltinWidgets.length > 0 && (
          <>
            <Text className="text-xs font-semibold uppercase tracking-wider text-white/40 px-1 pt-2">
              Built-in
            </Text>
            {availableBuiltinWidgets.map((widget) => (
              <BuiltinWidgetRow key={widget.id} widget={widget} onAdd={onAdd} />
            ))}
          </>
        )}

        {groupedNativeProviders.length > 0 && (
          <>
            <Text className="text-xs font-semibold uppercase tracking-wider text-white/40 px-1 pt-4">
              App widgets
            </Text>
            {groupedNativeProviders.map(([packageName, providers]) => (
              <View key={packageName} className="gap-2">
                <Text className="text-xs text-white/30 px-1">
                  {packageName.split(".").pop()}
                </Text>
                {providers.map((provider) => (
                  <NativeProviderRow
                    key={provider.provider}
                    provider={provider}
                    onAddNative={onAddNative}
                  />
                ))}
              </View>
            ))}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

export { AddWidgetSheet };
