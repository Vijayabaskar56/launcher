import * as WebBrowser from "expo-web-browser";
import { fetch } from "react-native-nitro-fetch";

import type {
  ProviderDeps,
  SearchProvider,
  SearchResult,
} from "@/types/search";

const URL_PATTERN = /^(https?:\/\/)?[^\s]+\.[^\s]{2,}$/;

const looksLikeUrl = (query: string): boolean => {
  const trimmed = query.trim();
  if (trimmed.includes(" ")) {
    return false;
  }
  return URL_PATTERN.test(trimmed);
};

const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const extractTitle = (html: string): string | null => {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match?.[1]) {
    return null;
  }
  return match[1].trim().replaceAll(/\s+/g, " ");
};

const extractMetaDescription = (html: string): string | null => {
  const match =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(
      html
    );
  if (match?.[1]) {
    return match[1].trim();
  }
  // Try reversed attribute order (content before name)
  const altMatch =
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(
      html
    );
  if (altMatch?.[1]) {
    return altMatch[1].trim();
  }
  return null;
};

const extractFaviconUrl = (html: string, baseUrl: string): string => {
  const match =
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i.exec(
      html
    );
  if (match?.[1]) {
    const [, href] = match;
    if (href.startsWith("http")) {
      return href;
    }
    try {
      const url = new URL(baseUrl);
      if (href.startsWith("/")) {
        return `${url.origin}${href}`;
      }
      return `${url.origin}/${href}`;
    } catch {
      return `${baseUrl}/favicon.ico`;
    }
  }
  try {
    const url = new URL(baseUrl);
    return `${url.origin}/favicon.ico`;
  } catch {
    return `${baseUrl}/favicon.ico`;
  }
};

export const websiteProvider: SearchProvider = {
  minQueryLength: 4,
  requiresNetwork: true,
  async search(query: string, _deps: ProviderDeps): Promise<SearchResult[]> {
    if (!looksLikeUrl(query)) {
      return [];
    }

    const fullUrl = normalizeUrl(query);

    try {
      const response = await fetch(fullUrl, {
        headers: {
          Accept: "text/html",
          "User-Agent": "Launcher/1.0 github.com/launcher",
        },
      });

      if (!response.ok) {
        return [];
      }

      const html = await response.text();
      const title = extractTitle(html) ?? query.trim();
      const description = extractMetaDescription(html);
      const faviconUrl = extractFaviconUrl(html, fullUrl);

      return [
        {
          data: { description, faviconUrl, url: fullUrl },
          icon: faviconUrl,
          iconType: "uri" as const,
          id: `website-${fullUrl}`,
          onPress: () => {
            WebBrowser.openBrowserAsync(fullUrl);
          },
          score: 0.95,
          subtitle: description ?? fullUrl,
          title,
          type: "website" as const,
        },
      ];
    } catch {
      return [];
    }
  },
  tier: "network",

  type: "website",
};
