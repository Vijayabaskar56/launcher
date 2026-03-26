import { openApplication } from "expo-intent-launcher";
import { memo, use, useCallback, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";

import { AppListContext } from "@/context/app-list";
import type { InstalledApp } from "@/context/app-list";
import {
  DrawerMetadataContext,
  getOrderedPinnedPackages,
} from "@/context/drawer-metadata";
import { LauncherConfigContext } from "@/context/launcher-config";
import { SettingsContext } from "@/context/settings";
import type { IconShape } from "@/types/settings";

import { AppIcon } from "./app-icon";

interface DockAppIconProps {
  app: InstalledApp;
  iconShape: IconShape;
  showLabel: boolean;
  size: number;
}

const DockAppIcon = memo(function DockAppIcon({
  app,
  iconShape,
  showLabel,
  size,
}: DockAppIconProps) {
  const handlePress = useCallback(() => {
    openApplication(app.packageName);
  }, [app.packageName]);

  return (
    <AppIcon
      packageName={app.packageName}
      label={app.appName}
      letter={app.letter}
      icon={app.icon}
      iconShape={iconShape}
      showLabel={showLabel}
      onPress={handlePress}
      size={size}
    />
  );
});

export const DockRow = () => {
  const appList = use(AppListContext);
  const drawerMeta = use(DrawerMetadataContext);
  const config = use(LauncherConfigContext);
  const settings = use(SettingsContext);
  const { width: screenWidth } = useWindowDimensions();

  const columns = config?.state.gridColumns ?? 5;
  const dockRowCount = settings?.state.homescreen.dockRowCount ?? 1;
  const iconShape = settings?.state.icons.iconShape ?? "circle";
  const showLabels = settings?.state.icons.showLabels ?? true;
  const maxDockApps = columns * dockRowCount;

  const dockApps = useMemo(() => {
    if (!drawerMeta) {
      return [];
    }
    const pinnedPackages = getOrderedPinnedPackages(drawerMeta.state);
    return pinnedPackages.slice(0, maxDockApps).flatMap((pkg) => {
      const app = appList.getApp(pkg);
      return app ? [app] : [];
    });
  }, [drawerMeta, appList, maxDockApps]);

  if (dockApps.length === 0) {
    return null;
  }

  // Calculate icon size based on available width and columns
  // px-4 on each side
  const horizontalPadding = 32;
  const cellWidth = Math.floor((screenWidth - horizontalPadding) / columns);
  const iconSize = Math.max(44, Math.min(56, cellWidth - 16));

  // Split into rows of `columns` items each
  // If fewer apps than columns, use app count as effective columns
  const rows: (typeof dockApps)[] = [];
  for (let i = 0; i < dockApps.length; i += columns) {
    rows.push(dockApps.slice(i, i + columns));
  }

  return (
    <View className="py-3 gap-2">
      {rows.map((row) => {
        // If this row has fewer items than columns, distribute evenly
        const effectiveColumns = row.length;
        const itemWidth = `${100 / effectiveColumns}%` as const;
        const rowKey = row.map((app) => app.packageName).join("-");

        return (
          <View key={rowKey} className="flex-row">
            {row.map((app) => (
              <View
                key={app.packageName}
                className="items-center"
                style={{ width: itemWidth }}
              >
                <DockAppIcon
                  app={app}
                  iconShape={iconShape}
                  showLabel={showLabels}
                  size={iconSize}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};
