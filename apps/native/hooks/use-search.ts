import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppListContext } from "@/context/app-list";
import { DrawerMetadataContext } from "@/context/drawer-metadata";
import type { AppVisibility } from "@/context/drawer-metadata";
import { SettingsContext } from "@/context/settings";
import { useSmartCalculator } from "@/hooks/use-smart-calculator";
import { getSearchActions } from "@/lib/search-actions";
import { appProvider } from "@/lib/search-providers/app-provider";
import { calendarProvider } from "@/lib/search-providers/calendar-provider";
import { contactProvider } from "@/lib/search-providers/contact-provider";
import { currencyProvider } from "@/lib/search-providers/currency-provider";
import { locationProvider } from "@/lib/search-providers/location-provider";
import { websiteProvider } from "@/lib/search-providers/website-provider";
import { wikipediaProvider } from "@/lib/search-providers/wikipedia-provider";
import { createSearchSession, getAvailableFilters } from "@/lib/search-service";
import type { SmartCalculatorResult } from "@/lib/smart-calculator/types";
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
  calculatorResult: SmartCalculatorResult | null;
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
  const drawerMetadata = use(DrawerMetadataContext);
  const settingsCtx = use(SettingsContext);
  const settings = settingsCtx?.state;
  const smartCalculatorQuery =
    settings?.search.calculator || settings?.search.unitConverter ? query : "";
  const { result: calculatorResult } = useSmartCalculator(smartCalculatorQuery);

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
    if (settings.search.currencyConverter) {
      providers.push(currencyProvider);
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
    if (settings.search.websiteSearch) {
      providers.push(websiteProvider);
    }
    if (settings.search.locationSearch) {
      providers.push(locationProvider);
    }
    return providers;
  }, [settings]);

  // Build alias lookup from drawer metadata
  const appAliases = useMemo((): Record<string, string> => {
    const aliases: Record<string, string> = {};
    const metadataApps = drawerMetadata?.state.apps;
    if (metadataApps) {
      for (const [pkg, metadata] of Object.entries(metadataApps)) {
        if (metadata.alias) {
          aliases[pkg] = metadata.alias;
        }
      }
    }
    return aliases;
  }, [drawerMetadata?.state.apps]);

  // Build visibility lookup from drawer metadata
  const appVisibility = useMemo((): Record<string, AppVisibility> => {
    const visibility: Record<string, AppVisibility> = {};
    const metadataApps = drawerMetadata?.state.apps;
    if (metadataApps) {
      for (const [pkg, metadata] of Object.entries(metadataApps)) {
        if (metadata.visibility && metadata.visibility !== "default") {
          visibility[pkg] = metadata.visibility;
        }
      }
    }
    return visibility;
  }, [drawerMetadata?.state.apps]);

  // Build provider deps
  const deps = useMemo((): ProviderDeps => {
    const usageCounts = getUsageCounts();
    return {
      appAliases,
      appVisibility,
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
        currencyConverter: true,
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
  }, [appAliases, appVisibility, appList.apps, settings]);

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
    calculatorResult,
    handleToggleFilter,
    handleToggleNetwork,
    isSearching: query.trim().length > 0,
    resetFilters,
    results,
  };
};
