import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

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

export const getSearchActions = (
  query: string,
  searchEngine: string
): SearchActionMatch[] => {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const actions: SearchActionMatch[] = [];

  // Phone number → Call + SMS
  if (PHONE_PATTERN.test(trimmed)) {
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
  }

  // Email address
  if (EMAIL_PATTERN.test(trimmed)) {
    actions.push({
      icon: "mail-outline",
      label: `Email ${trimmed}`,
      onPress: () => {
        Linking.openURL(`mailto:${trimmed}`);
      },
      type: "email",
    });
  }

  // URL
  if (URL_PATTERN.test(trimmed) || trimmed.includes("www.")) {
    const url = URL_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`;
    actions.push({
      icon: "open-outline",
      label: `Open ${trimmed}`,
      onPress: () => {
        WebBrowser.openBrowserAsync(url);
      },
      type: "url",
    });
  }

  // Web search (always when query >= 2 chars)
  if (trimmed.length >= 2) {
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
  }

  return actions;
};
