import { useEffect, useRef, useState } from "react";
import {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

// Worklet-safe time formatting helpers
function padTwo(n: number): string {
  "worklet";
  return n < 10 ? `0${n}` : `${n}`;
}

const formatTimeWorklet = (ts: number, showSeconds: boolean): string => {
  "worklet";
  // Convert to local time components using offset-aware math
  // We pass the timezone offset from JS thread via a shared value
  const hours = Math.floor((ts / 3_600_000) % 24);
  const minutes = Math.floor((ts / 60_000) % 60);
  const seconds = Math.floor((ts / 1000) % 60);

  if (showSeconds) {
    return `${padTwo(hours)}:${padTwo(minutes)}:${padTwo(seconds)}`;
  }
  return `${padTwo(hours)}:${padTwo(minutes)}`;
};

/** Format date for display below clock */
const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

/**
 * Zero-rerender clock hook using Reanimated shared values.
 *
 * Returns shared values for time display and analog clock math.
 * Use `timeAnimatedProps` with an `Animated.TextInput` to display time
 * without triggering React re-renders.
 */
export const useClock = (showSeconds = false) => {
  const timestamp = useSharedValue(Date.now());
  const tzOffset = useSharedValue(new Date().getTimezoneOffset() * 60_000);

  // Date string changes once per day — use React state for this
  const [dateString, setDateString] = useState(() => formatDate(new Date()));
  const lastDay = useRef(new Date().getDate());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const update = () => {
      const now = Date.now();
      timestamp.value = now;

      // Update timezone offset (handles DST transitions)
      tzOffset.value = new Date(now).getTimezoneOffset() * 60_000;

      // Check if day changed — update date string on JS thread
      const currentDay = new Date(now).getDate();
      if (currentDay !== lastDay.current) {
        lastDay.current = currentDay;
        setDateString(formatDate(new Date(now)));
      }

      // Align to next second boundary
      const millis = now % 1000;
      const next = 1000 - millis;
      timeoutId = setTimeout(update, next < 200 ? next + 1000 : next);
    };

    // Start aligned to the next second
    timeoutId = setTimeout(update, 1000 - (Date.now() % 1000));

    return () => clearTimeout(timeoutId);
  }, [timestamp, tzOffset]);

  // Derived local timestamp (adjusted for timezone)
  const localTimestamp = useDerivedValue(
    () => timestamp.value - tzOffset.value
  );

  // Formatted time string — only recalculates when relevant unit changes
  const formattedTime = useDerivedValue(() => {
    const local = localTimestamp.value;

    return formatTimeWorklet(local, showSeconds);
  });

  // Animated props for TextInput display (zero re-renders)
  const timeAnimatedProps = useAnimatedProps(() => ({
    defaultValue: formattedTime.value,
    text: formattedTime.value,
  }));

  // Clock hand rotation values for analog clock
  const hours = useDerivedValue(() =>
    Math.floor((localTimestamp.value / 3_600_000) % 12)
  );

  const minutes = useDerivedValue(() =>
    Math.floor((localTimestamp.value / 60_000) % 60)
  );

  const seconds = useDerivedValue(() =>
    Math.floor((localTimestamp.value / 1000) % 60)
  );

  // Rotation angles in degrees for analog clock hands
  const hourRotation = useDerivedValue(() => {
    const h = (localTimestamp.value / 3_600_000) % 12;
    // 360 / 12 = 30 degrees per hour
    return h * 30;
  });

  const minuteRotation = useDerivedValue(() => {
    const m = (localTimestamp.value / 60_000) % 60;
    // 360 / 60 = 6 degrees per minute
    return m * 6;
  });

  const secondRotation = useDerivedValue(() => {
    const s = (localTimestamp.value / 1000) % 60;
    return s * 6;
  });

  return {
    dateString,
    formattedTime,
    hourRotation,
    hours,
    minuteRotation,
    minutes,
    secondRotation,
    seconds,
    timeAnimatedProps,
    timestamp,
  };
};
