import { Card } from "heroui-native";
import { useCallback, useRef, useState, use } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { GestureDetector, ScrollView } from "react-native-gesture-handler";
import Animated, {
  FadeOut,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Sortable, SortableItem } from "react-native-reanimated-dnd";
import type { SortableRenderItemProps } from "react-native-reanimated-dnd";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import {
  WidgetConfigContext,
  WIDGET_ICONS,
  WIDGET_LABELS,
  isNativeWidgetId,
} from "@/context/widget-config";
import type {
  NativeWidgetInfo,
  WidgetId,
  WidgetSize,
} from "@/context/widget-config";
import { useDirectionalDismiss } from "@/hooks/use-directional-dismiss";
import {
  isHorizontal,
  useDirectionalPanel,
} from "@/hooks/use-directional-panel";
import type { SlideFrom } from "@/hooks/use-directional-panel";
import { useScrollDismissHandoff } from "@/hooks/use-scroll-dismiss-handoff";
import { getOrderedIdsFromPositions } from "@/lib/sort";
import { toast } from "@/lib/toast";

import { Icon, IconDanger, IconMuted, ICON_MAP } from "./ui/icon";
import { AddWidgetSheet } from "./widgets/add-widget-sheet";
import { BatteryWidget } from "./widgets/battery-widget";
import { CalendarWidget } from "./widgets/calendar-widget";
import { ClockWidget } from "./widgets/clock-widget";
import { ConfigureWidgetSheet } from "./widgets/configure-widget-sheet";
import { MusicWidget } from "./widgets/music-widget";
import { NativeWidgetCard } from "./widgets/native-widget-card";
import { WeatherWidget } from "./widgets/weather-widget";

interface WidgetPanelProps {
  boundary?: {
    isAtBottom: SharedValue<boolean>;
    isAtTop: SharedValue<boolean>;
  };
  offset: SharedValue<number>;
  slideFrom: SharedValue<SlideFrom>;
}

const WIDGET_MAP: Record<
  WidgetId,
  React.ComponentType<{ opacity?: number; size?: WidgetSize }>
> = {
  battery: BatteryWidget,
  calendar: CalendarWidget,
  clock: ClockWidget,
  music: MusicWidget,
  weather: WeatherWidget,
};

const EDIT_ITEM_HEIGHT = 60;

/** Inline edit row content for a single widget */
const EditWidgetRowContent = ({
  isNative,
  id,
  isAnimating,
  canRemove,
  label,
  onRemove,
  onConfigure,
}: {
  isNative: boolean;
  id: string;
  isAnimating: boolean;
  canRemove: boolean;
  label: string;
  onRemove: (id: WidgetId) => void;
  onConfigure: (id: WidgetId) => void;
}) => {
  const widgetId = id as WidgetId;

  const handleRemove = useCallback(() => {
    onRemove(widgetId);
  }, [onRemove, widgetId]);

  const handleConfigure = useCallback(() => {
    onConfigure(widgetId);
  }, [onConfigure, widgetId]);

  return (
    <Animated.View
      exiting={FadeOut.duration(150)}
      style={isAnimating ? { opacity: 0.3 } : undefined}
    >
      <Card
        variant="transparent"
        className="flex-row items-center rounded-2xl border border-border/30 h-[56px] px-3 bg-surface/70"
      >
        <SortableItem.Handle>
          <View className="h-10 w-10 items-center justify-center">
            <IconMuted name={ICON_MAP.drag} size={18} />
          </View>
        </SortableItem.Handle>
        <View className="flex-1 flex-row items-center gap-3">
          <IconMuted
            name={
              isNative
                ? ICON_MAP.grid
                : ICON_MAP[WIDGET_ICONS[widgetId] ?? "box"]
            }
            size={16}
          />
          <Text className="flex-1 text-sm font-semibold text-foreground">
            {label}
          </Text>
        </View>
        <Pressable
          onPress={handleConfigure}
          className="h-10 w-10 items-center justify-center"
        >
          <Icon name={ICON_MAP.settings} size={18} />
        </Pressable>
        <Pressable
          disabled={!canRemove}
          onPress={handleRemove}
          className="h-10 w-10 items-center justify-center"
        >
          {canRemove ? (
            <IconDanger name={ICON_MAP.trash} size={18} />
          ) : (
            <IconDanger
              name={ICON_MAP.trash}
              size={18}
              className="opacity-20"
            />
          )}
        </Pressable>
      </Card>
    </Animated.View>
  );
};

const NativeWidgetPanelItem = ({
  id,
  onRemove,
  opacity,
  size,
  widgetInfo,
}: {
  id: WidgetId;
  onRemove: (id: WidgetId) => void;
  opacity: number;
  size: WidgetSize;
  widgetInfo: NativeWidgetInfo;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  return (
    <NativeWidgetCard
      widgetInfo={widgetInfo}
      size={size}
      opacity={opacity}
      onRemove={handleRemove}
    />
  );
};

const WidgetPanel = function WidgetPanel({
  boundary,
  offset,
  slideFrom,
}: WidgetPanelProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const widgetConfig = use(WidgetConfigContext);
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

  const [isEditing, setIsEditing] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [configuringWidgetId, setConfiguringWidgetId] =
    useState<WidgetId | null>(null);
  const canRemove = (widgetConfig?.state.activeWidgetIds.length ?? 0) > 1;

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
  }, [updateBoundaryFromScroll]);

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

  const { animatedStyle } = useDirectionalPanel({
    offset,
    screenHeight,
    screenWidth,
    slideFrom,
  });

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

  const handleToggleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const handleRemoveWidget = useCallback(
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

  const handleDrop = useCallback(
    (_from: unknown, _to: unknown, positions?: Record<string, number>) => {
      const orderedIds = getOrderedIdsFromPositions(positions);
      if (orderedIds.length > 0) {
        widgetConfig?.actions.reorderWidgets(orderedIds as WidgetId[]);
      }
    },
    [widgetConfig]
  );

  const handleRemovePanelWidget = useCallback(
    (id: WidgetId) => {
      widgetConfig?.actions.removeWidget(id);
    },
    [widgetConfig]
  );

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
        // eslint-disable-next-line unicorn/prefer-module, node/global-require
        const { widgetHostService } = require("react-native-widget-host");
        const appWidgetId =
          await widgetHostService.allocateAndBindWidget(provider);
        if (appWidgetId > 0) {
          widgetConfig?.actions.addNativeWidget(appWidgetId, provider, label);
          toast.success("Widget added", { description: label });
        }
      } catch {
        toast.error("Couldn't add widget");
      }
      setShowAddSheet(false);
    },
    [widgetConfig]
  );

  const handleConfigureWidget = useCallback((id: WidgetId) => {
    setConfiguringWidgetId(id);
  }, []);

  const handleCloseConfigSheet = useCallback(() => {
    setConfiguringWidgetId(null);
  }, []);

  const handleSizeChange = useCallback(
    (size: WidgetSize) => {
      if (configuringWidgetId) {
        widgetConfig?.actions.setWidgetSize(configuringWidgetId, size);
      }
    },
    [widgetConfig, configuringWidgetId]
  );

  const resolveWidgetLabel = useCallback(
    (id: WidgetId) => {
      if (isNativeWidgetId(id)) {
        return widgetConfig?.state.nativeWidgets[id]?.label ?? "Widget";
      }

      return WIDGET_LABELS[id] ?? id;
    },
    [widgetConfig]
  );

  const renderEditItem = useCallback(
    ({
      id,
      item,
      ...sortableItemProps
    }: SortableRenderItemProps<{ id: string }>) => (
      <SortableItem
        key={id}
        id={id}
        data={item}
        onDrop={handleDrop}
        {...sortableItemProps}
      >
        <EditWidgetRowContent
          id={id}
          isAnimating={animatingId === id}
          canRemove={canRemove}
          isNative={isNativeWidgetId(id)}
          label={resolveWidgetLabel(id as WidgetId)}
          onConfigure={handleConfigureWidget}
          onRemove={handleRemoveWidget}
        />
      </SortableItem>
    ),
    [
      animatingId,
      canRemove,
      handleConfigureWidget,
      handleDrop,
      handleRemoveWidget,
      resolveWidgetLabel,
    ]
  );

  if (!widgetConfig) {
    return null;
  }

  const {
    activeWidgetIds,
    nativeWidgets,
    widgetOpacity,
    widgetOrder,
    widgetSizes,
  } = widgetConfig.state;
  const activeSet = new Set(activeWidgetIds);
  const orderedWidgets = widgetOrder.filter((id) => activeSet.has(id));

  const contentPaddingBottom = insets.bottom + 120;
  const contentPaddingTop = insets.top + 16;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="absolute bottom-0 left-0 right-0 top-0 bg-background/80"
        style={[animatedStyle]}
      >
        {isEditing ? (
          <View style={{ flex: 1, paddingTop: contentPaddingTop }}>
            <View className="px-4 pb-4">
              <Text className="text-lg font-bold text-foreground">
                Edit widgets
              </Text>
            </View>
            <Sortable
              contentContainerStyle={{
                gap: 8,
                paddingBottom: insets.bottom + 160,
                paddingHorizontal: 16,
              }}
              data={orderedWidgets.map((id) => ({ id }))}
              itemHeight={EDIT_ITEM_HEIGHT}
              renderItem={renderEditItem}
              style={{ backgroundColor: "transparent", flex: 1 }}
            />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{
              gap: 12,
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
            removeClippedSubviews
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {orderedWidgets.map((id) => {
              const size = widgetSizes[id] || "medium";

              if (isNativeWidgetId(id)) {
                const info = nativeWidgets[id];
                if (!info) {
                  return null;
                }
                return (
                  <NativeWidgetPanelItem
                    key={id}
                    id={id}
                    onRemove={handleRemovePanelWidget}
                    opacity={widgetOpacity}
                    size={size}
                    widgetInfo={info}
                  />
                );
              }

              const WidgetComponent = WIDGET_MAP[id];
              if (!WidgetComponent) {
                return null;
              }
              return (
                <WidgetComponent key={id} opacity={widgetOpacity} size={size} />
              );
            })}
          </ScrollView>
        )}

        <View
          className="absolute left-0 right-0 flex-row items-center justify-center gap-3"
          style={{ bottom: insets.bottom + 72 }}
          pointerEvents="box-none"
        >
          {isEditing && (
            <Pressable
              onPress={handleOpenAddSheet}
              className="flex-row items-center gap-2 rounded-full px-5 py-2.5 bg-surface-secondary"
            >
              <Icon name={ICON_MAP.add} size={16} />
              <Text className="text-sm font-semibold text-foreground">
                Add widget
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleToggleEdit}
            className="flex-row items-center gap-2 rounded-full px-5 py-2.5 bg-surface-secondary"
          >
            <Icon
              name={isEditing ? ICON_MAP.checkCircle : ICON_MAP.edit}
              size={16}
            />
            <Text className="text-sm font-semibold text-foreground">
              {isEditing ? "Done" : "Edit widgets"}
            </Text>
          </Pressable>
        </View>

        {showAddSheet && (
          <AddWidgetSheet
            activeWidgetIds={activeWidgetIds}
            onAdd={handleAddWidget}
            onAddNative={handleAddNativeWidget}
            onClose={handleCloseAddSheet}
          />
        )}

        {configuringWidgetId !== null && (
          <ConfigureWidgetSheet
            widgetId={configuringWidgetId}
            currentSize={widgetSizes[configuringWidgetId] ?? "medium"}
            onSizeChange={handleSizeChange}
            onClose={handleCloseConfigSheet}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
};

export { WidgetPanel };
