import { useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { EventsByDate } from "@/hooks/use-calendar-events";
import { toDateKey } from "@/hooks/use-calendar-events";

const DAY_LETTERS = [
  { id: "sun", letter: "S" },
  { id: "mon", letter: "M" },
  { id: "tue", letter: "T" },
  { id: "wed", letter: "W" },
  { id: "thu", letter: "T" },
  { id: "fri", letter: "F" },
  { id: "sat", letter: "S" },
] as const;

const PILL_TIMING = { duration: 280, easing: Easing.out(Easing.cubic) };

const styles = StyleSheet.create({
  pill: {
    width: `${100 / 7}%`,
  },
  todayRing: {
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 20,
    borderWidth: 2,
  },
});

interface WeekStripProps {
  /** Sunday of the visible week */
  weekStart: Date;
  selectedDate: Date;
  todayKey: string;
  eventsByDate: EventsByDate;
  onSelect: (date: Date) => void;
}

const buildWeek = (start: Date): Date[] => {
  const result: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    d.setHours(0, 0, 0, 0);
    result.push(d);
  }
  return result;
};

interface DayCellProps {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  hasEvent: boolean;
  onSelect: (date: Date) => void;
}

const DayCell = ({
  date,
  isSelected,
  isToday,
  hasEvent,
  onSelect,
}: DayCellProps) => {
  const handlePress = useCallback(() => onSelect(date), [onSelect, date]);

  const todayStyle = isToday && !isSelected ? styles.todayRing : undefined;

  return (
    <Pressable
      className="flex-1 items-center justify-start"
      onPress={handlePress}
    >
      <View
        className="h-10 w-10 items-center justify-center"
        style={todayStyle}
      >
        <Text
          className={`text-base font-medium ${
            isSelected ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {date.getDate()}
        </Text>
      </View>
      <View className="mt-1 h-1.5 w-1.5">
        {hasEvent && !isSelected ? (
          <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        ) : null}
      </View>
    </Pressable>
  );
};

export const WeekStrip = ({
  weekStart,
  selectedDate,
  todayKey,
  eventsByDate,
  onSelect,
}: WeekStripProps) => {
  const days = useMemo(() => buildWeek(weekStart), [weekStart]);
  const selectedKey = toDateKey(selectedDate);
  const selectedIndex = days.findIndex((d) => toDateKey(d) === selectedKey);

  const pillX = useSharedValue(Math.max(selectedIndex, 0));

  useEffect(() => {
    if (selectedIndex !== -1) {
      pillX.value = withTiming(selectedIndex, PILL_TIMING);
    }
  }, [selectedIndex, pillX]);

  const pillStyle = useAnimatedStyle(() => ({
    left: `${(pillX.value / 7) * 100}%`,
  }));

  return (
    <View className="mt-2">
      <View className="flex-row">
        {DAY_LETTERS.map((entry) => (
          <View className="flex-1 items-center" key={entry.id}>
            <Text className="text-xs font-medium text-muted-foreground">
              {entry.letter}
            </Text>
          </View>
        ))}
      </View>

      <View className="relative mt-2 h-12 flex-row">
        <Animated.View
          className="absolute top-0 h-10 items-center justify-center self-center rounded-full bg-surface-secondary"
          pointerEvents="none"
          style={[styles.pill, pillStyle]}
        />
        {days.map((date) => {
          const key = toDateKey(date);
          return (
            <DayCell
              date={date}
              hasEvent={(eventsByDate[key]?.length ?? 0) > 0}
              isSelected={key === selectedKey}
              isToday={key === todayKey}
              key={key}
              onSelect={onSelect}
            />
          );
        })}
      </View>
    </View>
  );
};
