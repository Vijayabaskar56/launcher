import { RESULT_TYPE_TO_FILTER, SECTION_ORDER } from "@/types/search";
import type {
  ProviderDeps,
  SearchFilter,
  SearchProvider,
  SearchResult,
  SearchResultType,
} from "@/types/search";

// --- Text Normalization ---

/**
 * Strips diacritical marks (accents) from text so that e.g. "cafe" matches "Café".
 * Uses Unicode NFD decomposition to separate base characters from combining marks,
 * then removes the combining diacritical marks range (U+0300–U+036F).
 */
export const normalizeText = (text: string): string =>
  text.normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "");

// --- Text Matching ---

export const matchScore = (query: string, target: string): number => {
  const q = normalizeText(query.toLowerCase());
  const t = normalizeText(target.toLowerCase());
  if (t === q) {
    return 1;
  }
  if (t.startsWith(q)) {
    return 0.95;
  }
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) {
      return 0.9;
    }
  }
  if (t.includes(q)) {
    return 0.85;
  }
  return 0;
};

// --- Scoring ---

export const scoreResult = (
  textScore: number,
  usageCount: number,
  maxUsage: number
): number => {
  const usageWeight = maxUsage > 0 ? usageCount / maxUsage : 0;
  return textScore * 0.6 + usageWeight * 0.4;
};

// --- Two-Tier Search Dispatcher ---

const NETWORK_DEBOUNCE_MS = 500;

interface SearchOptions {
  providers: SearchProvider[];
  query: string;
  deps: ProviderDeps;
  activeFilters: Set<SearchFilter> | null;
  allowNetwork: boolean;
  onResults: (results: Map<SearchResultType, SearchResult[]>) => void;
}

interface SearchSession {
  abort: () => void;
}

export const createSearchSession = (options: SearchOptions): SearchSession => {
  const { providers, query, deps, activeFilters, allowNetwork, onResults } =
    options;

  let aborted = false;
  let networkTimer: ReturnType<typeof setTimeout> | null = null;
  const abortController = new AbortController();

  const allResults = new Map<SearchResultType, SearchResult[]>();

  const eligibleProviders = providers.filter((p) => {
    if (query.length < p.minQueryLength) {
      return false;
    }
    if (p.requiresNetwork && !allowNetwork) {
      return false;
    }
    if (activeFilters && activeFilters.size > 0) {
      const filter = RESULT_TYPE_TO_FILTER[p.type];
      if (!activeFilters.has(filter)) {
        return false;
      }
    }
    return true;
  });

  const instantProviders = eligibleProviders.filter(
    (p) => p.tier === "instant"
  );
  const networkProviders = eligibleProviders.filter(
    (p) => p.tier === "network"
  );

  const mergeAndEmit = () => {
    if (aborted) {
      return;
    }
    onResults(new Map(allResults));
  };

  const runProviders = async (batch: SearchProvider[]) => {
    const results = await Promise.allSettled(
      batch.map((p) => p.search(query, deps))
    );

    if (aborted) {
      return;
    }

    for (const [i, result] of results.entries()) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        const { type } = batch[i];
        const existing = allResults.get(type) ?? [];
        const merged = [...existing, ...result.value];
        // Deduplicate by id
        const seen = new Set<string>();
        const deduped = merged.filter((r) => {
          if (seen.has(r.id)) {
            return false;
          }
          seen.add(r.id);
          return true;
        });
        // Sort by score descending
        deduped.sort((a, b) => b.score - a.score);
        allResults.set(type, deduped);
      }
    }

    mergeAndEmit();
  };

  // Instant tier — fire immediately
  if (instantProviders.length > 0) {
    runProviders(instantProviders);
  }

  // Network tier — fire after debounce
  if (networkProviders.length > 0) {
    networkTimer = setTimeout(() => {
      if (!aborted) {
        runProviders(networkProviders);
      }
    }, NETWORK_DEBOUNCE_MS);
  }

  return {
    abort: () => {
      aborted = true;
      abortController.abort();
      if (networkTimer) {
        clearTimeout(networkTimer);
      }
    },
  };
};

// --- Helpers ---

export const sortedSections = (
  results: Map<SearchResultType, SearchResult[]>
): { type: SearchResultType; data: SearchResult[] }[] => {
  const sections: { type: SearchResultType; data: SearchResult[] }[] = [];
  for (const type of SECTION_ORDER) {
    const data = results.get(type);
    if (data && data.length > 0) {
      sections.push({ data, type });
    }
  }
  return sections;
};

export const getAvailableFilters = (
  results: Map<SearchResultType, SearchResult[]>
): Set<SearchFilter> => {
  const filters = new Set<SearchFilter>();
  for (const [type, data] of results) {
    if (data.length > 0) {
      filters.add(RESULT_TYPE_TO_FILTER[type]);
    }
  }
  return filters;
};
