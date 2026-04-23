import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import type { CalendarEvent } from "@/hooks/use-calendar-events";

interface EventListProps {
  events: CalendarEvent[];
  hasPermission: boolean;
  onRequestPermission: () => void;
  dayKey: string;
}

const EmptyState = ({
  label,
  pressable,
  onPress,
}: {
  label: string;
  pressable?: boolean;
  onPress?: () => void;
}) => {
  const content = (
    <View className="items-center justify-center gap-3">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-surface-secondary">
        <Icon name="calendar-outline" size={24} />
      </View>
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
  if (pressable) {
    return (
      <Pressable
        className="h-full items-center justify-center"
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }
  return <View className="h-full items-center justify-center">{content}</View>;
};

export const EventList = ({
  events,
  hasPermission,
  onRequestPermission,
  dayKey,
}: EventListProps) => {
  const isEmpty = events.length === 0;

  return (
    <View
      className="relative mt-3 overflow-hidden rounded-3xl border border-border/40 bg-surface-secondary/60"
      style={{ height: 210 }}
    >
      <Animated.View
        className="flex-1"
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(150)}
        key={dayKey}
      >
        {!hasPermission && (
          <EmptyState
            label="Connect calendar"
            onPress={onRequestPermission}
            pressable
          />
        )}
        {hasPermission && isEmpty && <EmptyState label="No Events" />}
        {hasPermission && !isEmpty && (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            {events.map((event, index) => (
              <Animated.View
                className={`px-4 py-2 ${
                  index === events.length - 1 ? "" : "border-b border-border/40"
                }`}
                entering={FadeIn.duration(250).delay(index * 30)}
                key={event.id}
              >
                <Text
                  className="text-base font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {event.time}
                </Text>
              </Animated.View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};
