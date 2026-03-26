import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

import { syncIconCache, getIconCache } from "@/lib/icon-cache";

const sortByName = <T extends { appName: string }>(items: T[]): T[] => {
  const copy = [...items];
  copy.sort((a, b) => a.appName.localeCompare(b.appName));
  return copy;
};

export interface InstalledApp {
  packageName: string;
  appName: string;
  icon: string | null;
  letter: string;
}

interface AppListContextValue {
  apps: InstalledApp[];
  getApp: (packageName: string) => InstalledApp | undefined;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

export const AppListContext = createContext<AppListContextValue>({
  apps: [],
  getApp: (): InstalledApp | undefined => undefined,
  isLoading: true,
  refresh: async () => {
    // no-op default
  },
});

export const AppListProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const appMapRef = useRef<Map<string, InstalledApp>>(new Map());

  const refresh = useCallback(async () => {
    if (Platform.OS !== "android") {
      setApps([]);
      setIsLoading(false);
      return;
    }

    try {
      // Dynamic import — only available on Android with native module
      const { getInstalledApps } = await import("react-native-get-app-list");
      const result = await getInstalledApps();

      // Transform raw results
      const rawApps = result.map(
        (app: { packageName: string; appName: string; icon?: string }) => ({
          appName: app.appName,
          icon: app.icon ? `data:image/png;base64,${app.icon}` : null,
          letter: app.appName.charAt(0).toUpperCase(),
          packageName: app.packageName,
        })
      );

      // Sync icon cache — adds new, removes uninstalled
      const cache = syncIconCache(rawApps);

      // Build final app list with cached icons
      const installedApps: InstalledApp[] = sortByName(
        rawApps.map((app: InstalledApp) => ({
          ...app,
          icon: app.icon ?? cache[app.packageName] ?? null,
        }))
      );

      // Build lookup map
      const map = new Map<string, InstalledApp>();
      for (const app of installedApps) {
        map.set(app.packageName, app);
      }
      appMapRef.current = map;

      setApps(installedApps);
    } catch {
      // If the native module isn't available, try loading from cache
      const cache = getIconCache();
      const cachedApps: InstalledApp[] = sortByName(
        Object.entries(cache).map(([packageName, icon]) => ({
          appName: packageName.split(".").pop() ?? packageName,
          icon,
          letter: (packageName.split(".").pop() ?? "?").charAt(0).toUpperCase(),
          packageName,
        }))
      );

      setApps(cachedApps);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const getApp = useCallback(
    (packageName: string) => appMapRef.current.get(packageName),
    []
  );

  const value = useMemo(
    () => ({ apps, getApp, isLoading, refresh }),
    [apps, getApp, isLoading, refresh]
  );

  return <AppListContext value={value}>{children}</AppListContext>;
};
