import * as Calendar from "expo-calendar";
import * as Contacts from "expo-contacts";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";
import { Platform, Linking } from "react-native";

import type { SearchActionMatch } from "@/types/search";

const SEARCH_ENGINES: Record<string, string> = {
  // eslint-disable-next-line no-template-curly-in-string -- Intentional placeholder syntax
  bing: "https://www.bing.com/search?q=${1}",
  // eslint-disable-next-line no-template-curly-in-string -- Intentional placeholder syntax
  duckduckgo: "https://duckduckgo.com/?q=${1}",
  // eslint-disable-next-line no-template-curly-in-string -- Intentional placeholder syntax
  google: "https://www.google.com/search?q=${1}",
};

const PHONE_PATTERN = /^\+?[\d\s\-().]{7,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\//i;
const TIME_PATTERN = /^(?:alarm\s+)?(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i;
const TIMER_PATTERN =
  /^(?:timer\s+)?(?:(\d+)\s*h(?:ours?)?)?[\s]*(?:(\d+)\s*m(?:in(?:utes?)?)?)?[\s]*(?:(\d+)\s*s(?:ec(?:onds?)?)?)?$/i;
const EVENT_PATTERN =
  /(?:meeting|lunch|dinner|event|appointment|call|standup|sync)\s+(?:on\s+)?(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
const EVENT_KEYWORD_PATTERN = /\bevent\b/i;

const getDayOffset = (dayName: string): number => {
  const lower = dayName.toLowerCase();
  if (lower === "today") {
    return 0;
  }
  if (lower === "tomorrow") {
    return 1;
  }
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const targetIndex = days.indexOf(lower);
  if (targetIndex === -1) {
    return 0;
  }
  const todayIndex = new Date().getDay();
  const diff = (targetIndex - todayIndex + 7) % 7;
  return diff === 0 ? 7 : diff;
};

const addPhoneActions = (
  actions: SearchActionMatch[],
  trimmed: string
): void => {
  const cleaned = trimmed.replaceAll(/[\s\-().]/g, "");
  actions.push({
    icon: "call-outline",
    label: `Call ${trimmed}`,
    onPress: () => {
      Linking.openURL(`tel:${cleaned}`);
    },
    type: "call",
  });
  actions.push({
    icon: "chatbubble-outline",
    label: `SMS ${trimmed}`,
    onPress: () => {
      Linking.openURL(`sms:${cleaned}`);
    },
    type: "sms",
  });
};

const addEmailAction = (
  actions: SearchActionMatch[],
  trimmed: string
): void => {
  actions.push({
    icon: "mail-outline",
    label: `Email ${trimmed}`,
    onPress: () => {
      Linking.openURL(`mailto:${trimmed}`);
    },
    type: "email",
  });
};

const addUrlAction = (actions: SearchActionMatch[], trimmed: string): void => {
  const url = URL_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`;
  actions.push({
    icon: "open-outline",
    label: `Open ${trimmed}`,
    onPress: () => {
      WebBrowser.openBrowserAsync(url);
    },
    type: "url",
  });
};

const addContactAction = (
  actions: SearchActionMatch[],
  trimmed: string
): void => {
  const isPhone = PHONE_PATTERN.test(trimmed);
  actions.push({
    icon: "person-add-outline",
    label: "Create Contact",
    onPress: async () => {
      const contact: Contacts.Contact = {
        contactType: Contacts.ContactTypes.Person,
        name: "",
      };
      if (isPhone) {
        const cleaned = trimmed.replaceAll(/[\s\-().]/g, "");
        contact.phoneNumbers = [
          { isPrimary: true, label: "mobile", number: cleaned },
        ];
      } else {
        contact.emails = [{ email: trimmed, isPrimary: true, label: "home" }];
      }
      await Contacts.presentFormAsync(null, contact);
    },
    type: "create-contact",
  });
};

const addAlarmAction = (
  actions: SearchActionMatch[],
  timeMatch: RegExpExecArray
): void => {
  let hour = Number.parseInt(timeMatch[1], 10);
  const minutes = Number.parseInt(timeMatch[2], 10);
  const meridiem = timeMatch[3]?.toLowerCase();

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  } else if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  const displayTime = meridiem
    ? `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3].toUpperCase()}`
    : `${timeMatch[1]}:${timeMatch[2]}`;

  actions.push({
    icon: "alarm-outline",
    label: `Set Alarm ${displayTime}`,
    onPress: () => {
      if (Platform.OS === "android") {
        IntentLauncher.startActivityAsync("android.intent.action.SET_ALARM", {
          extra: {
            "android.intent.extra.alarm.HOUR": hour,
            "android.intent.extra.alarm.MINUTES": minutes,
          },
        });
      }
    },
    type: "set-alarm",
  });
};

const addTimerAction = (
  actions: SearchActionMatch[],
  timerMatch: RegExpExecArray
): void => {
  const hours = timerMatch[1] ? Number.parseInt(timerMatch[1], 10) : 0;
  const minutes = timerMatch[2] ? Number.parseInt(timerMatch[2], 10) : 0;
  const seconds = timerMatch[3] ? Number.parseInt(timerMatch[3], 10) : 0;
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (totalSeconds <= 0) {
    return;
  }

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} min`);
  }
  if (seconds > 0) {
    parts.push(`${seconds} sec`);
  }
  const displayDuration = parts.join(" ");

  actions.push({
    icon: "timer-outline",
    label: `Start Timer ${displayDuration}`,
    onPress: () => {
      if (Platform.OS === "android") {
        IntentLauncher.startActivityAsync("android.intent.action.SET_TIMER", {
          extra: {
            "android.intent.extra.alarm.LENGTH": totalSeconds,
            "android.intent.extra.alarm.MESSAGE": `Timer ${displayDuration}`,
          },
        });
      }
    },
    type: "start-timer",
  });
};

const addCalendarEventAction = (
  actions: SearchActionMatch[],
  trimmed: string
): void => {
  const dayMatch =
    /(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.exec(
      trimmed
    );
  const title = trimmed
    .replace(
      /\s*(?:on\s+)?(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      ""
    )
    .trim();

  actions.push({
    icon: "calendar-outline",
    label: "Create Calendar Event",
    onPress: async () => {
      if (Platform.OS === "android") {
        const startDate = new Date();
        if (dayMatch) {
          startDate.setDate(startDate.getDate() + getDayOffset(dayMatch[0]));
        }
        startDate.setHours(9, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setHours(10, 0, 0, 0);

        await IntentLauncher.startActivityAsync(
          "android.intent.action.INSERT",
          {
            data: "content://com.android.calendar/events",
            extra: {
              beginTime: startDate.getTime(),
              endTime: endDate.getTime(),
              title: title || "New Event",
            },
          }
        );
      } else {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status === "granted") {
          const calendars = await Calendar.getCalendarsAsync(
            Calendar.EntityTypes.EVENT
          );
          const defaultCalendar =
            calendars.find((c) => c.isPrimary) ?? calendars[0];
          if (defaultCalendar) {
            const startDate = new Date();
            if (dayMatch) {
              startDate.setDate(
                startDate.getDate() + getDayOffset(dayMatch[0])
              );
            }
            startDate.setHours(9, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setHours(10, 0, 0, 0);

            await Calendar.createEventAsync(defaultCalendar.id, {
              endDate,
              startDate,
              title: title || "New Event",
            });
          }
        }
      }
    },
    type: "create-event",
  });
};

const addWebSearchAction = (
  actions: SearchActionMatch[],
  trimmed: string,
  searchEngine: string
): void => {
  const engineKey = searchEngine.toLowerCase();
  const template = SEARCH_ENGINES[engineKey] ?? SEARCH_ENGINES.google;
  const engineName = `${engineKey.charAt(0).toUpperCase()}${engineKey.slice(1)}`;
  // eslint-disable-next-line no-template-curly-in-string -- Intentional placeholder syntax
  const searchUrl = template.replace("${1}", encodeURIComponent(trimmed));

  actions.push({
    icon: "search-outline",
    label: `Search ${engineName}`,
    onPress: () => {
      WebBrowser.openBrowserAsync(searchUrl);
    },
    type: "web-search",
  });
};

export const getSearchActions = (
  query: string,
  searchEngine: string
): SearchActionMatch[] => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const actions: SearchActionMatch[] = [];

  if (PHONE_PATTERN.test(trimmed)) {
    addPhoneActions(actions, trimmed);
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    addEmailAction(actions, trimmed);
  }

  if (URL_PATTERN.test(trimmed) || trimmed.includes("www.")) {
    addUrlAction(actions, trimmed);
  }

  if (PHONE_PATTERN.test(trimmed) || EMAIL_PATTERN.test(trimmed)) {
    addContactAction(actions, trimmed);
  }

  const timeMatch = TIME_PATTERN.exec(trimmed);
  if (timeMatch) {
    addAlarmAction(actions, timeMatch);
  }

  const timerMatch = TIMER_PATTERN.exec(trimmed);
  if (timerMatch) {
    addTimerAction(actions, timerMatch);
  }

  if (EVENT_PATTERN.test(trimmed) || EVENT_KEYWORD_PATTERN.test(trimmed)) {
    addCalendarEventAction(actions, trimmed);
  }

  if (trimmed.length >= 2) {
    addWebSearchAction(actions, trimmed, searchEngine);
  }

  return actions;
};
