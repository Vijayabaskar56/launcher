import { router } from "expo-router";
import { useCallback, useRef, useState, use } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
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

import { WidgetConfigContext, WIDGET_SIZES } from "@/context/widget-config";
import type { WidgetId, WidgetSize } from "@/context/widget-config";
import { useDirectionalDismiss } from "@/hooks/use-directional-dismiss";
import {
  isHorizontal,
  useDirectionalPanel,
} from "@/hooks/use-directional-panel";
import type { SlideFrom } from "@/hooks/use-directional-panel";

import { BatteryWidget } from "./widgets/battery-widget";
import { CalendarWidget } from "./widgets/calendar-widget";
import { ClockWidget } from "./widgets/clock-widget";
import { MusicWidget } from "./widgets/music-widget";
import { WeatherWidget } from "./widgets/weather-widget";

interface WidgetPanelProps {
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

const WidgetPanel = function WidgetPanel({
  offset,
  slideFrom,
}: WidgetPanelProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const widgetConfig = use(WidgetConfigContext);
  const scrollOffset = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  const resetScrollPosition = useCallback(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, []);

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

  const [handleEditWidgets] = useState(() => () => {
    router.push("/widgets/edit" as const);
  });

  if (!widgetConfig) {
    return null;
  }

  const { activeWidgetIds, widgetOpacity, widgetOrder, widgetSizes } =
    widgetConfig.state;
  const orderedWidgets = widgetOrder.filter((id) =>
    activeWidgetIds.includes(id)
  );

  const contentPaddingBottom = insets.bottom + 96;
  const contentPaddingTop = insets.top + 76;

  const renderWidgetsInRows = () => {
    const rows: { id: WidgetId; size: WidgetSize }[][] = [];
    let currentRow: { id: WidgetId; size: WidgetSize }[] = [];

    for (const id of orderedWidgets) {
      const size = widgetSizes[id] || "medium";
      const currentSizeConfig = WIDGET_SIZES[size];

      if (currentSizeConfig.width === "full" || currentRow.length >= 2) {
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        rows.push([{ id, size }]);
      } else {
        currentRow.push({ id, size });
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows.map((row) => {
      const rowKey = row.map((w) => w.id).join("-");
      return (
        <View key={rowKey} className="flex-row flex-wrap gap-2">
          {row.map(({ id, size }) => {
            const WidgetComponent = WIDGET_MAP[id];
            if (!WidgetComponent) {
              return null;
            }
            return (
              <WidgetComponent key={id} opacity={widgetOpacity} size={size} />
            );
          })}
        </View>
      );
    });
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="absolute bottom-0 left-0 right-0 top-0 bg-background"
        style={animatedStyle}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            gap: 16,
            paddingBottom: contentPaddingBottom,
            paddingHorizontal: 16,
            paddingTop: contentPaddingTop,
          }}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Widgets
            </Text>
            <Text className="text-xl font-extrabold text-foreground">
              My Widgets
            </Text>
          </View>

          {renderWidgetsInRows()}

          <Pressable
            onPress={handleEditWidgets}
            className="flex-row items-center bg-secondary border border-border rounded-2xl gap-2 px-4 py-3 min-h-[48px] justify-center"
          >
            <Text className="text-base font-bold text-foreground">
              Edit Widgets
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
};

export { WidgetPanel };
