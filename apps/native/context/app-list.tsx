import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

export interface InstalledApp {
  packageName: string;
  appName: string;
  icon: string | null;
  letter: string;
}

interface AppListContextValue {
  apps: InstalledApp[];
  getApp: (packageName: string) => InstalledApp | undefined;
  refresh: () => void;
  isLoading: boolean;
}

export const AppListContext = createContext<AppListContextValue>({
  apps: [],
  getApp: (): InstalledApp | undefined => undefined,
  isLoading: true,
  refresh: () => {
    /* no-op until apps load */
  },
});

const DEFAULT_ICON_SIZE = 192;

function useAppList(): AppListContextValue {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (Platform.OS !== "android") {
      setApps([]);
      setIsLoading(false);
      return;
    }

    try {
      // eslint-disable-next-line unicorn/prefer-module, node/global-require -- conditional native module loading
      const { launcherService } = require("react-native-launcher-service");

      const appInfos = launcherService.getInstalledApps();

      const installedApps: InstalledApp[] = appInfos.map(
        (app: { packageName: string; appName: string }) => {
          const iconPath = launcherService.getAppIcon(
            app.packageName,
            DEFAULT_ICON_SIZE,
            false
          );

          return {
            appName: app.appName,
            icon: iconPath ? `file://${iconPath}` : null,
            letter: app.appName.charAt(0).toUpperCase(),
            packageName: app.packageName,
          };
        }
      );

      setApps(installedApps);
    } catch {
      setApps([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const appMap = useMemo(
    () => new Map(apps.map((a) => [a.packageName, a])),
    [apps]
  );

  const getApp = useCallback(
    (packageName: string) => appMap.get(packageName),
    [appMap]
  );

  return useMemo(
    () => ({ apps, getApp, isLoading, refresh }),
    [apps, getApp, isLoading, refresh]
  );
}

export const AppListProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const value = useAppList();

  return <AppListContext value={value}>{children}</AppListContext>;
};
