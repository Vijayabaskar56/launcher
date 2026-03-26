import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Uniwind, useUniwind } from "uniwind";

type SearchBarPosition = "top" | "bottom";
type ThemeMode = "light" | "dark" | "system";

interface LauncherConfig {
  searchBarPosition: SearchBarPosition;
  gridColumns: number;
  themeMode: ThemeMode;
}

interface LauncherConfigContextValue {
  state: LauncherConfig;
  actions: {
    setSearchBarPosition: (position: SearchBarPosition) => void;
    setGridColumns: (columns: number) => void;
    setThemeMode: (mode: ThemeMode) => void;
  };
  resolvedTheme: "light" | "dark";
}

const STORAGE_KEY = "launcher-config";

const defaultConfig: LauncherConfig = {
  gridColumns: 6,
  searchBarPosition: "bottom",
  themeMode: "system",
};

export const LauncherConfigContext =
  createContext<LauncherConfigContextValue | null>(null);

export const LauncherConfigProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useState<LauncherConfig>(defaultConfig);
  const [loaded, setLoaded] = useState(false);

  const { theme: resolvedTheme } = useUniwind();

  useEffect(() => {
    Uniwind.setTheme(config.themeMode);
  }, [config.themeMode]);

  useEffect(() => {
    const load = async () => {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) {
        setConfig({ ...defaultConfig, ...JSON.parse(stored) });
      }
      setLoaded(true);
    };
    load();
  }, []);

  const persist = useCallback((next: LauncherConfig) => {
    setConfig(next);
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setSearchBarPosition = useCallback(
    (position: SearchBarPosition) => {
      persist({ ...config, searchBarPosition: position });
    },
    [config, persist]
  );

  const setGridColumns = useCallback(
    (columns: number) => {
      persist({ ...config, gridColumns: columns });
    },
    [config, persist]
  );

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      persist({ ...config, themeMode: mode });
    },
    [config, persist]
  );

  const contextValue = useMemo(
    () => ({
      actions: { setGridColumns, setSearchBarPosition, setThemeMode },
      resolvedTheme: resolvedTheme as "light" | "dark",
      state: config,
    }),
    [setGridColumns, setSearchBarPosition, setThemeMode, resolvedTheme, config]
  );

  if (!loaded) {
    return null;
  }

  return (
    <LauncherConfigContext value={contextValue}>
      {children}
    </LauncherConfigContext>
  );
};
