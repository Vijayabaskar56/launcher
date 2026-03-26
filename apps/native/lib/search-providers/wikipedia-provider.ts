import * as WebBrowser from "expo-web-browser";
import { fetch } from "react-native-nitro-fetch";

import type {
  ProviderDeps,
  SearchProvider,
  SearchResult,
} from "@/types/search";

export const wikipediaProvider: SearchProvider = {
  minQueryLength: 4,
  requiresNetwork: true,
  async search(query: string, _deps: ProviderDeps): Promise<SearchResult[]> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json`;
      const response = await fetch(url);
      const data = (await response.json()) as [
        string,
        string[],
        string[],
        string[],
      ];

      const [, titles, descriptions, urls] = data;

      return titles.map((title, index) => ({
        data: { url: urls[index] },
        icon: "book-outline",
        iconType: "ionicon" as const,
        id: `wiki-${index}-${title}`,
        onPress: () => {
          WebBrowser.openBrowserAsync(urls[index]);
        },
        score: 0.8 - index * 0.05,
        subtitle: descriptions[index] || "Wikipedia article",
        title,
        type: "wikipedia" as const,
      }));
    } catch {
      return [];
    }
  },
  tier: "network",

  type: "wikipedia",
};
