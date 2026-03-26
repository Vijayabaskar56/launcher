import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppListContext } from "@/context/app-list";
import { SettingsContext } from "@/context/settings";
import { getSearchActions } from "@/lib/search-actions";
import { appProvider } from "@/lib/search-providers/app-provider";
import { calculatorProvider } from "@/lib/search-providers/calculator-provider";
import { calendarProvider } from "@/lib/search-providers/calendar-provider";
import { contactProvider } from "@/lib/search-providers/contact-provider";
import { locationProvider } from "@/lib/search-providers/location-provider";
import { unitConverterProvider } from "@/lib/search-providers/unit-converter-provider";
import { wikipediaProvider } from "@/lib/search-providers/wikipedia-provider";
import { createSearchSession, getAvailableFilters } from "@/lib/search-service";
import { storage } from "@/lib/storage";
import { getMaxUsage, getUsageCounts, recordLaunch } from "@/lib/usage-tracker";
import type {
  ProviderDeps,
  SearchActionMatch,
  SearchFilter,
  SearchProvider,
  SearchResult,
  SearchResultType,
} from "@/types/search";

const NETWORK_STORAGE_KEY = "search-allow-network";

interface UseSearchResult {
  results: Map<SearchResultType, SearchResult[]>;
  actions: SearchActionMatch[];
  isSearching: boolean;
  activeFilters: Set<SearchFilter>;
  availableFilters: Set<SearchFilter>;
  handleToggleFilter: (filter: SearchFilter) => void;
  resetFilters: () => void;
  allowNetwork: boolean;
  handleToggleNetwork: () => void;
}

export const useSearch = (query: string): UseSearchResult => {
  const appList = use(AppListContext);
  const settingsCtx = use(SettingsContext);
  const settings = settingsCtx?.state;

  const [results, setResults] = useState<Map<SearchResultType, SearchResult[]>>(
    new Map()
  );
  const [activeFilters, setActiveFilters] = useState<Set<SearchFilter>>(
    new Set()
  );
  const [allowNetwork, setAllowNetwork] = useState(() => {
    const stored = storage.getString(NETWORK_STORAGE_KEY);
    return stored === "true";
  });

  const sessionRef = useRef<{ abort: () => void } | null>(null);

  // Build enabled providers list based on settings
  const enabledProviders = useMemo((): SearchProvider[] => {
    if (!settings) {
      return [];
    }
    const providers: SearchProvider[] = [];
    if (settings.search.searchAllApps) {
      providers.push(appProvider);
    }
    if (settings.search.calculator) {
      providers.push(calculatorProvider);
    }
    if (settings.search.unitConverter) {
      providers.push(unitConverterProvider);
    }
    if (settings.search.contactSearch) {
      providers.push(contactProvider);
    }
    if (settings.search.calendarSearch) {
      providers.push(calendarProvider);
    }
    if (settings.search.wikipediaSearch) {
      providers.push(wikipediaProvider);
    }
    if (settings.search.locationSearch) {
      providers.push(locationProvider);
    }
    return providers;
  }, [settings]);

  // Build provider deps
  const deps = useMemo((): ProviderDeps => {
    const usageCounts = getUsageCounts();
    return {
      apps: appList.apps,
      launchApp: (packageName: string) => {
        recordLaunch(`app-${packageName}`);
        // Launch via intent - handled by the app provider's onPress
      },
      maxUsage: getMaxUsage(usageCounts),
      settings: settings?.search ?? {
        calculator: true,
        calendarSearch: true,
        contactCallOnTap: false,
        contactSearch: true,
        fileSearch: false,
        filterBarEnabled: true,
        locationSearch: false,
        searchAllApps: true,
        shortcutSearch: true,
        unitConverter: true,
        websiteSearch: false,
        wikipediaSearch: false,
      },
      usageCounts,
    };
  }, [appList.apps, settings]);

  // Search actions (pattern matching)
  const actions = useMemo((): SearchActionMatch[] => {
    if (!query.trim()) {
      return [];
    }
    const engine = settings?.integrations?.searchEngine ?? "google";
    return getSearchActions(query, engine);
  }, [query, settings]);

  // Run search when query changes
  useEffect(() => {
    // Cancel previous session
    sessionRef.current?.abort();

    if (!query.trim()) {
      setResults(new Map());
      return;
    }

    const session = createSearchSession({
      activeFilters: activeFilters.size > 0 ? activeFilters : null,
      allowNetwork,
      deps,
      onResults: setResults,
      providers: enabledProviders,
      query: query.trim(),
    });

    sessionRef.current = session;

    return () => {
      session.abort();
    };
  }, [query, enabledProviders, deps, activeFilters, allowNetwork]);

  const availableFilters = useMemo(
    () => getAvailableFilters(results),
    [results]
  );

  const handleToggleFilter = useCallback((filter: SearchFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setActiveFilters(new Set());
  }, []);

  const handleToggleNetwork = useCallback(() => {
    setAllowNetwork((prev) => {
      const next = !prev;
      storage.set(NETWORK_STORAGE_KEY, next ? "true" : "false");
      return next;
    });
  }, []);

  return {
    actions,
    activeFilters,
    allowNetwork,
    availableFilters,
    handleToggleFilter,
    handleToggleNetwork,
    isSearching: query.trim().length > 0,
    resetFilters,
    results,
  };
};
