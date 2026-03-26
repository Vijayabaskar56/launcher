import { router } from "expo-router";
import { useCallback, useRef, useState, use } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WidgetConfigContext, WIDGET_SIZES } from "@/context/widget-config";
import type { WidgetId, WidgetSize } from "@/context/widget-config";

import { BatteryWidget } from "./widgets/battery-widget";
import { CalendarWidget } from "./widgets/calendar-widget";
import { ClockWidget } from "./widgets/clock-widget";
import { MusicWidget } from "./widgets/music-widget";
import { WeatherWidget } from "./widgets/weather-widget";

const TIMING_CONFIG = { duration: 300, easing: Easing.out(Easing.cubic) };

interface WidgetPanelProps {
  translateY: SharedValue<number>;
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

const WidgetPanel = function WidgetPanel({ translateY }: WidgetPanelProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const widgetConfig = use(WidgetConfigContext);
  const scrollOffset = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  const resetScrollPosition = useCallback(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, []);

  useAnimatedReaction(
    () => translateY.value > screenHeight - 10,
    (isClosed, wasClosed) => {
      if (isClosed && !wasClosed) {
        runOnJS(resetScrollPosition)();
      }
    },
    [screenHeight]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [screenHeight, 0], [0, 1]),
    transform: [{ translateY: translateY.value }],
  }));

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollOffset.value = event.nativeEvent.contentOffset.y;
    },
    [scrollOffset]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      "worklet";
      if (scrollOffset.value <= 0 && event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      "worklet";
      translateY.value = withTiming(
        event.translationY > screenHeight * 0.25 || event.velocityY > 500
          ? screenHeight
          : 0,
        TIMING_CONFIG
      );
    })
    .activeOffsetY(10);

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
