import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Card } from "heroui-native";
import { memo, useCallback, use, useMemo, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";
import { Sortable, SortableItem } from "react-native-reanimated-dnd";
import type { SortableRenderItemProps } from "react-native-reanimated-dnd";

import {
  DEFAULT_WIDGETS,
  isNativeWidgetId,
  WidgetConfigContext,
} from "@/context/widget-config";
import type { WidgetId, WidgetSize } from "@/context/widget-config";
import { toast } from "@/lib/toast";

import { Icon, IconAccent, IconDanger, IconMuted, ICON_MAP } from "../ui/icon";
import { AddWidgetSheet } from "./add-widget-sheet";

const WIDGET_LABELS: Record<WidgetId, string> = Object.fromEntries(
  DEFAULT_WIDGETS.map((w) => [w.id, w.label])
) as Record<WidgetId, string>;

const WIDGET_ICONS: Record<WidgetId, keyof typeof ICON_MAP> = {
  battery: "battery",
  calendar: "calendar",
  clock: "clock",
  music: "music",
  weather: "weather",
};

const ITEM_HEIGHT = 68;

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

interface WidgetEditSheetProps {
  widgetId: WidgetId | null;
  onClose: () => void;
}

const WidgetEditSheet = function WidgetEditSheet({
  widgetId,
  onClose,
}: WidgetEditSheetProps) {
  const sheetRef = useRef<TrueSheet>(null);
  const widgetConfig = use(WidgetConfigContext);
  const currentSize = widgetId
    ? widgetConfig?.state.widgetSizes[widgetId]
    : "medium";

  const handleSizeChange = useCallback(
    (size: WidgetSize) => {
      if (widgetId) {
        widgetConfig?.actions.setWidgetSize(widgetId, size);
      }
    },
    [widgetConfig, widgetId]
  );

  const handleSmall = useCallback(
    () => handleSizeChange("small"),
    [handleSizeChange]
  );
  const handleMedium = useCallback(
    () => handleSizeChange("medium"),
    [handleSizeChange]
  );
  const handleLarge = useCallback(
    () => handleSizeChange("large"),
    [handleSizeChange]
  );

  if (!widgetId) {
    return null;
  }

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.5]}
      initialDetentIndex={0}
      cornerRadius={28}
      grabber
      dimmed
      onDidDismiss={onClose}
    >
      <View className="gap-4 p-4">
        <View className="flex-row items-center justify-center gap-2">
          <IconAccent
            name={
              isNativeWidgetId(widgetId)
                ? ICON_MAP.grid
                : ICON_MAP[WIDGET_ICONS[widgetId]]
            }
            size={24}
          />
          <Text className="text-xl font-bold text-foreground">
            {isNativeWidgetId(widgetId)
              ? (widgetConfig?.state.nativeWidgets[widgetId]?.label ?? "Widget")
              : WIDGET_LABELS[widgetId]}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleSmall}
            className={`flex-1 items-center justify-center min-h-[80px] border rounded-xl ${
              currentSize === "small"
                ? "bg-primary border-primary"
                : "bg-secondary border-border"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                currentSize === "small"
                  ? "text-primary-foreground"
                  : "text-foreground"
              }`}
            >
              Small
            </Text>
          </Pressable>
          <Pressable
            onPress={handleMedium}
            className={`flex-1 items-center justify-center min-h-[80px] border rounded-xl ${
              currentSize === "medium"
                ? "bg-primary border-primary"
                : "bg-secondary border-border"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                currentSize === "medium"
                  ? "text-primary-foreground"
                  : "text-foreground"
              }`}
            >
              Medium
            </Text>
          </Pressable>
          <Pressable
            onPress={handleLarge}
            className={`flex-1 items-center justify-center min-h-[80px] border rounded-xl ${
              currentSize === "large"
                ? "bg-primary border-primary"
                : "bg-secondary border-border"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                currentSize === "large"
                  ? "text-primary-foreground"
                  : "text-foreground"
              }`}
            >
              Large
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={onClose}
          className="flex-row items-center justify-center bg-secondary border border-border rounded-full h-[52px] mx-4 my-2 gap-2"
        >
          <Text className="text-base font-semibold text-muted-foreground">
            Done
          </Text>
        </Pressable>
      </View>
    </TrueSheet>
  );
};

interface SortableWidgetItemProps {
  id: string;
  label: string;
  isNative: boolean;
  isAnimating: boolean;
  canRemove: boolean;
  onEditWidget: (id: WidgetId) => void;
  onRemoveWidget: (id: WidgetId) => void;
  onReorder: (ids: string[]) => void;
}

const SortableWidgetItemContent = memo(function SortableWidgetItemContent({
  id,
  label,
  isNative,
  isAnimating,
  canRemove,
  onEditWidget,
  onRemoveWidget,
}: Omit<SortableWidgetItemProps, "onReorder">) {
  const widgetId = id as WidgetId;

  const handleEdit = useCallback(() => {
    onEditWidget(widgetId);
  }, [onEditWidget, widgetId]);

  const handleRemovePress = useCallback(() => {
    onRemoveWidget(widgetId);
  }, [onRemoveWidget, widgetId]);

  return (
    <Animated.View
      exiting={FadeOut.duration(150)}
      style={isAnimating ? { opacity: 0.3 } : undefined}
    >
      <Card className="flex-row items-center rounded-xl h-[68px] px-2">
        <SortableItem.Handle>
          <View className="h-11 w-11 items-center justify-center">
            <IconMuted name={ICON_MAP.drag} size={20} />
          </View>
        </SortableItem.Handle>
        <View className="flex-1 flex-row items-center gap-4">
          <IconAccent
            name={isNative ? ICON_MAP.grid : ICON_MAP[WIDGET_ICONS[widgetId]]}
            size={28}
          />
          <Text className="text-base font-semibold text-foreground">
            {label}
          </Text>
        </View>
        <Pressable
          onPress={handleEdit}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon name={ICON_MAP.cog} size={22} />
        </Pressable>
        <Pressable
          disabled={!canRemove}
          onPress={handleRemovePress}
          className="h-11 w-11 items-center justify-center"
        >
          {canRemove ? (
            <IconDanger name={ICON_MAP.trash} size={22} />
          ) : (
            <IconDanger
              name={ICON_MAP.trash}
              size={22}
              className="opacity-30"
            />
          )}
        </Pressable>
      </Card>
    </Animated.View>
  );
});

export const EditWidgetsList = function EditWidgetsList() {
  const { height: screenHeight } = useWindowDimensions();
  const widgetConfig = use(WidgetConfigContext);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<WidgetId | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const handleReorder = useCallback(
    (ids: string[]) => {
      widgetConfig?.actions.reorderWidgets(ids as WidgetId[]);
    },
    [widgetConfig]
  );

  const handleRemove = useCallback(
    (id: WidgetId) => {
      if (widgetConfig && widgetConfig.state.activeWidgetIds.length <= 1) {
        return;
      }
      setAnimatingId(id);
      setTimeout(() => {
        widgetConfig?.actions.removeWidget(id);
        setAnimatingId(null);
      }, 200);
    },
    [widgetConfig]
  );

  const handleEditWidget = useCallback((id: WidgetId) => {
    setEditingWidgetId(id);
  }, []);

  const handleCloseEditSheet = useCallback(() => {
    setEditingWidgetId(null);
  }, []);

  const handleOpenAddSheet = useCallback(() => {
    setShowAddSheet(true);
  }, []);

  const handleCloseAddSheet = useCallback(() => {
    setShowAddSheet(false);
  }, []);

  const handleAddWidget = useCallback(
    (id: WidgetId) => {
      widgetConfig?.actions.addWidget(id);
      setShowAddSheet(false);
    },
    [widgetConfig]
  );

  const handleAddNativeWidget = useCallback(
    async (provider: string, label: string) => {
      try {
        // eslint-disable-next-line unicorn/prefer-module, node/global-require -- conditional native module loading
        const { widgetHostService } = require("react-native-widget-host");
        const appWidgetId =
          await widgetHostService.allocateAndBindWidget(provider);

        if (appWidgetId > 0) {
          widgetConfig?.actions.addNativeWidget(appWidgetId, provider, label);
          toast.success("Widget added", { description: label });
        }
      } catch {
        toast.error("Couldn't add widget");
      } finally {
        setShowAddSheet(false);
      }
    },
    [widgetConfig]
  );

  const handleDrop = useCallback(
    (_: unknown, __: unknown, positions?: Record<string, number>) => {
      const orderedIds = getOrderedIdsFromPositions(positions);
      if (orderedIds.length > 0) {
        handleReorder(orderedIds);
      }
    },
    [handleReorder]
  );

  const canRemove = widgetConfig
    ? widgetConfig.state.activeWidgetIds.length > 1
    : false;

  const nativeWidgets = useMemo(
    () => widgetConfig?.state.nativeWidgets ?? {},
    [widgetConfig?.state.nativeWidgets]
  );

  const resolveLabel = useCallback(
    (id: string): string => {
      if (isNativeWidgetId(id)) {
        return nativeWidgets[id]?.label ?? "Widget";
      }
      return WIDGET_LABELS[id as WidgetId] ?? id;
    },
    [nativeWidgets]
  );

  const renderSortableItem = useCallback(
    ({
      id,
      item,
      ...sortableItemProps
    }: SortableRenderItemProps<{ id: string }>) => (
      <SortableItem
        data={item}
        id={id}
        key={id}
        onDrop={handleDrop}
        {...sortableItemProps}
      >
        <SortableWidgetItemContent
          canRemove={canRemove}
          id={id}
          isAnimating={animatingId === id}
          isNative={isNativeWidgetId(id)}
          label={resolveLabel(id)}
          onEditWidget={handleEditWidget}
          onRemoveWidget={handleRemove}
        />
      </SortableItem>
    ),
    [
      handleDrop,
      animatingId,
      canRemove,
      handleEditWidget,
      handleRemove,
      resolveLabel,
    ]
  );

  if (!widgetConfig) {
    return null;
  }

  const { activeWidgetIds, widgetOrder } = widgetConfig.state;
  const orderedWidgets = widgetOrder.filter((id) =>
    activeWidgetIds.includes(id)
  );

  const sortableData = orderedWidgets.map((id) => ({ id }));

  return (
    <View className="flex-1">
      <Sortable
        contentContainerStyle={{ paddingHorizontal: 16 }}
        data={sortableData}
        itemHeight={ITEM_HEIGHT}
        renderItem={renderSortableItem}
        style={{ height: screenHeight }}
      />

      <Pressable
        className="flex-row items-center justify-center bg-secondary border border-border rounded-full h-[52px] mx-4 my-4 gap-2"
        onPress={handleOpenAddSheet}
      >
        <Icon name={ICON_MAP.add} size={20} />
        <Text className="text-base font-semibold text-muted-foreground">
          Add Widget
        </Text>
      </Pressable>

      <WidgetEditSheet
        widgetId={editingWidgetId}
        onClose={handleCloseEditSheet}
      />

      {showAddSheet && (
        <AddWidgetSheet
          activeWidgetIds={activeWidgetIds}
          onAdd={handleAddWidget}
          onAddNative={handleAddNativeWidget}
          onClose={handleCloseAddSheet}
        />
      )}
    </View>
  );
};
