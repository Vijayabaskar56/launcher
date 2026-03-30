import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Appearance } from "react-native";
import { Uniwind } from "uniwind";

import { getSettings, setSettings } from "@/lib/storage";
import { DEFAULT_SETTINGS } from "@/types/settings";
import type {
  ColorScheme,
  ThemePreset,
  DebugSettings,
  GestureSettings,
  HomescreenSettings,
  IconSettings,
  IntegrationSettings,
  LauncherSettingsData,
  LocaleSettings,
  SearchSettings,
  ThemeSettings,
} from "@/types/settings";

interface SettingsActions {
  updateAppearance: (updates: Partial<ThemeSettings>) => void;
  updateHomescreen: (updates: Partial<HomescreenSettings>) => void;
  updateIcons: (updates: Partial<IconSettings>) => void;
  updateSearch: (updates: Partial<SearchSettings>) => void;
  updateGestures: (updates: Partial<GestureSettings>) => void;
  updateIntegrations: (updates: Partial<IntegrationSettings>) => void;
  updateLocale: (updates: Partial<LocaleSettings>) => void;
  updateDebug: (updates: Partial<DebugSettings>) => void;
  resetAll: () => void;
  replaceAll: (settings: LauncherSettingsData) => void;
}

interface SettingsContextValue {
  state: LauncherSettingsData;
  actions: SettingsActions;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, setState] = useState<LauncherSettingsData>(() => getSettings());

  const persist = useCallback(
    (updater: (current: LauncherSettingsData) => LauncherSettingsData) => {
      setState((current) => {
        const next = updater(current);
        setSettings(next);
        return next;
      });
    },
    []
  );

  const updateAppearance = useCallback(
    (updates: Partial<ThemeSettings>) => {
      persist((current) => ({
        ...current,
        appearance: { ...current.appearance, ...updates },
      }));
    },
    [persist]
  );

  const updateHomescreen = useCallback(
    (updates: Partial<HomescreenSettings>) => {
      persist((current) => ({
        ...current,
        homescreen: { ...current.homescreen, ...updates },
      }));
    },
    [persist]
  );

  const updateIcons = useCallback(
    (updates: Partial<IconSettings>) => {
      persist((current) => ({
        ...current,
        icons: { ...current.icons, ...updates },
      }));
    },
    [persist]
  );

  const updateSearch = useCallback(
    (updates: Partial<SearchSettings>) => {
      persist((current) => ({
        ...current,
        search: { ...current.search, ...updates },
      }));
    },
    [persist]
  );

  const updateGestures = useCallback(
    (updates: Partial<GestureSettings>) => {
      persist((current) => ({
        ...current,
        gestures: { ...current.gestures, ...updates },
      }));
    },
    [persist]
  );

  const updateIntegrations = useCallback(
    (updates: Partial<IntegrationSettings>) => {
      persist((current) => ({
        ...current,
        integrations: { ...current.integrations, ...updates },
      }));
    },
    [persist]
  );

  const updateLocale = useCallback(
    (updates: Partial<LocaleSettings>) => {
      persist((current) => ({
        ...current,
        locale: { ...current.locale, ...updates },
      }));
    },
    [persist]
  );

  const updateDebug = useCallback(
    (updates: Partial<DebugSettings>) => {
      persist((current) => ({
        ...current,
        debug: { ...current.debug, ...updates },
      }));
    },
    [persist]
  );

  const resetAll = useCallback(() => {
    persist(() => DEFAULT_SETTINGS);
  }, [persist]);

  const replaceAll = useCallback(
    (settings: LauncherSettingsData) => {
      persist(() => settings);
    },
    [persist]
  );

  // Apply Uniwind theme whenever preset or color scheme changes
  // Guard: track last applied theme to prevent re-set loops
  // (Uniwind.setTheme can trigger Appearance change events on some devices)
  const lastAppliedThemeRef = useRef("");

  useEffect(() => {
    const resolveMode = (scheme: ColorScheme): "light" | "dark" => {
      if (scheme === "system") {
        return Appearance.getColorScheme() === "light" ? "light" : "dark";
      }
      return scheme;
    };

    const resolveThemeName = (
      preset: ThemePreset,
      mode: "light" | "dark"
    ): string => {
      if (preset === "default") {
        return mode;
      }
      if (preset === "high-contrast") {
        return `high-contrast-${mode}`;
      }
      if (preset === "black-and-white") {
        return `bw-${mode}`;
      }
      return mode;
    };

    const applyTheme = (themeName: string) => {
      if (lastAppliedThemeRef.current === themeName) {
        return;
      }
      lastAppliedThemeRef.current = themeName;
      Uniwind.setTheme(themeName as Parameters<typeof Uniwind.setTheme>[0]);
    };

    const mode = resolveMode(state.appearance.colorScheme);
    const themeName = resolveThemeName(state.appearance.themePreset, mode);
    applyTheme(themeName);

    // Listen for system appearance changes when scheme is "system"
    if (state.appearance.colorScheme === "system") {
      const listener = Appearance.addChangeListener(({ colorScheme }) => {
        const newMode = colorScheme === "light" ? "light" : "dark";
        const newTheme = resolveThemeName(
          state.appearance.themePreset,
          newMode
        );
        applyTheme(newTheme);
      });
      return () => listener.remove();
    }
  }, [state.appearance.themePreset, state.appearance.colorScheme]);

  const value = useMemo(
    () => ({
      actions: {
        replaceAll,
        resetAll,
        updateAppearance,
        updateDebug,
        updateGestures,
        updateHomescreen,
        updateIcons,
        updateIntegrations,
        updateLocale,
        updateSearch,
      },
      state,
    }),
    [
      state,
      updateAppearance,
      updateHomescreen,
      updateIcons,
      updateSearch,
      updateGestures,
      updateIntegrations,
      updateLocale,
      updateDebug,
      resetAll,
      replaceAll,
    ]
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
};
