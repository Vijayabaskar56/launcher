import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { WidgetSize } from "@/context/widget-config";
import { toDateKey, useCalendarEvents } from "@/hooks/use-calendar-events";
import { useResolvedLocale } from "@/hooks/use-locale";

import { EventList } from "./calendar/event-list";
import { WeekStrip } from "./calendar/week-strip";
import { WidgetCard } from "./widget-card";

const SWIPE_THRESHOLD = 60;
const SPRING = { damping: 22, stiffness: 180 } as const;

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const monthYearLabel = (date: Date, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(
    date
  );

const CalendarWidget = function CalendarWidget({
  opacity,
  size = "medium",
}: {
  opacity?: number;
  size?: WidgetSize;
}) {
  const { languageCode, timeFormat } = useResolvedLocale();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayKey = toDateKey(today);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const { eventsByDate, hasPermission, requestPermission } = useCalendarEvents({
    enabled: size !== "small",
    locale: languageCode,
    uses24h: timeFormat === "24h",
    weekAnchor: weekStart,
  });

  const translateX = useSharedValue(0);
  const isSmall = size === "small";

  const shiftWeek = useCallback((direction: -1 | 1) => {
    setWeekStart((prev) => addDays(prev, direction * 7));
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          translateX.value = e.translationX;
        })
        .onEnd((e) => {
          if (e.translationX < -SWIPE_THRESHOLD) {
            translateX.value = withSpring(0, SPRING);
            scheduleOnRN(shiftWeek, 1);
          } else if (e.translationX > SWIPE_THRESHOLD) {
            translateX.value = withSpring(0, SPRING);
            scheduleOnRN(shiftWeek, -1);
          } else {
            translateX.value = withSpring(0, SPRING);
          }
        }),
    [shiftWeek, translateX]
  );

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      // If user taps a date in a different week (shouldn't happen here),
      // also shift the week to keep selection visible.
      const wk = startOfWeek(date);
      if (wk.getTime() !== weekStart.getTime()) {
        setWeekStart(wk);
      }
    },
    [weekStart]
  );

  const goToToday = useCallback(() => {
    setSelectedDate(today);
    setWeekStart(startOfWeek(today));
  }, [today]);

  const showTodayChip = toDateKey(selectedDate) !== todayKey;

  return (
    <WidgetCard opacity={opacity} size={size}>
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-foreground">
          {monthYearLabel(selectedDate, languageCode)}
        </Text>
        {showTodayChip ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <Pressable
              className="rounded-full border border-border px-3 py-1"
              onPress={goToToday}
            >
              <Text className="text-xs font-medium text-muted-foreground">
                Today
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={stripStyle}>
          <WeekStrip
            eventsByDate={eventsByDate}
            onSelect={handleSelect}
            selectedDate={selectedDate}
            todayKey={todayKey}
            weekStart={weekStart}
          />
        </Animated.View>
      </GestureDetector>

      {!isSmall && (
        <EventList
          dayKey={toDateKey(selectedDate)}
          events={eventsByDate[toDateKey(selectedDate)] ?? []}
          hasPermission={hasPermission}
          onRequestPermission={requestPermission}
        />
      )}
    </WidgetCard>
  );
};

export { CalendarWidget };
