import * as Calendar from "expo-calendar";
import { Linking } from "react-native";

import { matchScore } from "@/lib/search-service";
import { storage } from "@/lib/storage";
import type {
  ProviderDeps,
  SearchProvider,
  SearchResult,
} from "@/types/search";

const PERMISSION_KEY = "calendar-permission-state";
const MAX_RESULTS = 5;
const DAYS_AHEAD = 30;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

const formatEventDate = (startDate: string | Date | undefined): string => {
  if (!startDate) {
    return "";
  }
  try {
    return dateFormatter.format(new Date(startDate));
  } catch {
    return "";
  }
};

export const calendarProvider: SearchProvider = {
  minQueryLength: 2,
  requiresNetwork: false,
  async search(query: string, _deps: ProviderDeps): Promise<SearchResult[]> {
    try {
      const permissionState = storage.getString(PERMISSION_KEY) ?? "unknown";

      // First call — show soft permission prompt
      if (permissionState === "unknown") {
        return [
          {
            data: null,
            icon: "lock-closed-outline",
            iconType: "ionicon",
            id: "calendar-prompt",
            onPress: async () => {
              const { status } =
                await Calendar.requestCalendarPermissionsAsync();
              storage.set(
                PERMISSION_KEY,
                status === "granted" ? "granted" : "denied"
              );
            },
            score: 0.5,
            subtitle: "Requires calendar permission",
            title: "Tap to enable calendar search",
            type: "calendar",
          },
        ];
      }

      // Permission denied — return nothing
      if (permissionState !== "granted") {
        return [];
      }

      // Permission granted — search events
      const calendars = await Calendar.getCalendarsAsync();
      const calendarIds = calendars.map((c) => c.id);

      if (calendarIds.length === 0) {
        return [];
      }

      const startDate = new Date();
      const endDate = new Date(Date.now() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

      const events = await Calendar.getEventsAsync(
        calendarIds,
        startDate,
        endDate
      );

      const results: SearchResult[] = [];

      for (const event of events) {
        if (!event.title) {
          continue;
        }

        const score = matchScore(query, event.title);
        if (score <= 0) {
          continue;
        }

        results.push({
          data: { eventId: event.id },
          icon: "calendar-outline",
          iconType: "ionicon",
          id: `cal-${event.id}`,
          onPress: () => {
            try {
              Linking.openURL(
                `content://com.android.calendar/events/${event.id}`
              );
            } catch {
              // Silently ignore if the calendar URI can't be opened
            }
          },
          score,
          subtitle: formatEventDate(event.startDate),
          title: event.title,
          type: "calendar",
        });
      }

      results.sort((a, b) => b.score - a.score);
      return results.slice(0, MAX_RESULTS);
    } catch {
      return [];
    }
  },
  tier: "instant",

  type: "calendar",
};
