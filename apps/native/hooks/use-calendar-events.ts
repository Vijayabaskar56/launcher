import * as Calendar from "expo-calendar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { storage } from "@/lib/storage";

const PERMISSION_KEY = "calendar-permission-state";

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  startDate: Date;
}

export type EventsByDate = Record<string, CalendarEvent[]>;

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

interface FormatterOptions {
  uses24h: boolean;
  locale: string;
}

const formatEventTime = (
  start: Date,
  end: Date,
  allDay: boolean,
  { uses24h, locale }: FormatterOptions
): string => {
  if (allDay) {
    return "All day";
  }
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    hour12: !uses24h,
    minute: "2-digit",
  };
  const fmt = new Intl.DateTimeFormat(locale, opts);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (!sameDay) {
    const dateFmt = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
    });
    return `Until ${dateFmt.format(end)}`;
  }
  return `${fmt.format(start)} - ${fmt.format(end)}`;
};

interface UseCalendarEventsOptions {
  weekAnchor: Date;
  uses24h: boolean;
  locale: string;
  enabled?: boolean;
}

interface UseCalendarEventsResult {
  eventsByDate: EventsByDate;
  hasPermission: boolean;
  loading: boolean;
  requestPermission: () => Promise<void>;
}

export const useCalendarEvents = ({
  weekAnchor,
  uses24h,
  locale,
  enabled = true,
}: UseCalendarEventsOptions): UseCalendarEventsResult => {
  const [hasPermission, setHasPermission] = useState<boolean>(
    () => storage.getString(PERMISSION_KEY) === "granted"
  );
  const [eventsByDate, setEventsByDate] = useState<EventsByDate>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [foregroundTick, setForegroundTick] = useState(0);

  // Snap to week start (Sunday) and pad ±1 week
  const rangeKey = useMemo(() => {
    const start = new Date(weekAnchor);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay() - 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 21);
    return { end, key: `${start.getTime()}-${end.getTime()}`, start };
  }, [weekAnchor]);

  useEffect(() => {
    if (!(enabled && hasPermission)) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const calendars = await Calendar.getCalendarsAsync(
          Calendar.EntityTypes.EVENT
        );
        const ids = calendars.map((c) => c.id);
        if (ids.length === 0 || cancelled) {
          if (!cancelled) {
            setEventsByDate({});
          }
          return;
        }
        const events = await Calendar.getEventsAsync(
          ids,
          rangeKey.start,
          rangeKey.end
        );
        if (cancelled) {
          return;
        }

        const grouped: EventsByDate = {};
        for (const event of events) {
          if (!event.title) {
            continue;
          }
          const start = new Date(event.startDate as string | number);
          const end = new Date(event.endDate as string | number);
          const key = toDateKey(start);
          const item: CalendarEvent = {
            id: event.id,
            startDate: start,
            time: formatEventTime(start, end, Boolean(event.allDay), {
              locale,
              uses24h,
            }),
            title: event.title,
          };
          if (grouped[key]) {
            grouped[key].push(item);
          } else {
            grouped[key] = [item];
          }
        }
        for (const key of Object.keys(grouped)) {
          grouped[key].sort(
            (a, b) => a.startDate.getTime() - b.startDate.getTime()
          );
        }
        if (!cancelled) {
          setEventsByDate(grouped);
        }
      } catch {
        if (!cancelled) {
          setEventsByDate({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, hasPermission, rangeKey, locale, uses24h, foregroundTick]);

  // Refresh on foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setForegroundTick((t) => t + 1);
      }
    });
    return () => sub.remove();
  }, []);

  const requestPermission = useCallback(async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    const granted = status === "granted";
    storage.set(PERMISSION_KEY, granted ? "granted" : "denied");
    setHasPermission(granted);
  }, []);

  return { eventsByDate, hasPermission, loading, requestPermission };
};
