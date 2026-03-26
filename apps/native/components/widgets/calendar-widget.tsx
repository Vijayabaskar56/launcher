import { Text, View } from "react-native";

import type { WidgetSize } from "@/context/widget-config";

import { WidgetCard } from "./widget-card";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const getCalendarDays = function getCalendarDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: number[] = [];
  for (let i = 0; i < firstDay; i += 1) {
    days.push(0);
  }
  for (let i = 1; i <= daysInMonth; i += 1) {
    days.push(i);
  }

  return { days, today };
};

const CalendarWidget = function CalendarWidget({
  opacity,
  size = "medium",
}: {
  opacity?: number;
  size?: WidgetSize;
}) {
  const { days, today } = getCalendarDays();
  const isSmall = size === "small";

  return (
    <WidgetCard opacity={opacity} size={size}>
      {!isSmall && (
        <View className="flex-row mb-1">
          {DAYS.map((day) => (
            <View
              key={day}
              className="flex-1 items-center aspect-square justify-center"
            >
              <Text className="text-xs font-semibold text-muted-foreground text-center">
                {day}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View className="flex-row flex-wrap">
        {days.map((day, index) => {
          const cellKey = day > 0 ? `day-${day}` : `empty-${index}`;
          return (
            <View
              key={cellKey}
              className={`items-center aspect-square justify-center ${day === today ? "bg-primary rounded-sm" : ""}`}
              style={{ width: `${100 / 7}%` }}
            >
              {day > 0 ? (
                <Text
                  className={`text-xs ${day === today ? "text-primary-foreground font-bold" : "text-foreground"}`}
                >
                  {day}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      {!isSmall && (
        <View className="flex-row items-center gap-2 mt-2">
          <View className="bg-primary rounded w-2 h-2" />
          <Text className="text-sm font-semibold text-foreground">
            Team Standup — 11:00 AM
          </Text>
        </View>
      )}
    </WidgetCard>
  );
};

export { CalendarWidget };
