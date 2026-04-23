import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SearchBarPosition = "top" | "bottom";

interface LauncherConfig {
  searchBarPosition: SearchBarPosition;
  gridColumns: number;
}

interface LauncherConfigContextValue {
  state: LauncherConfig;
  actions: {
    setSearchBarPosition: (position: SearchBarPosition) => void;
    setGridColumns: (columns: number) => void;
  };
}

const STORAGE_KEY = "launcher-config";

const defaultConfig: LauncherConfig = {
  gridColumns: 6,
  searchBarPosition: "bottom",
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

  const contextValue = useMemo(
    () => ({
      actions: { setGridColumns, setSearchBarPosition },
      state: config,
    }),
    [setGridColumns, setSearchBarPosition, config]
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
