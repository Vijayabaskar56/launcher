import type { HybridObject } from "react-native-nitro-modules";

export interface AppInfo {
  packageName: string;
  appName: string;
  activityName: string;
}

export interface IconPackInfo {
  packageName: string;
  label: string;
}

export interface AppShortcut {
  id: string;
  packageName: string;
  shortLabel: string;
  longLabel: string | undefined;
  iconPath: string | undefined;
}

export interface LauncherService extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  // App list
  getInstalledApps(): AppInfo[];

  // Icons
  getAppIcon(
    packageName: string,
    size: number,
    themed: boolean
  ): string | undefined;
  clearIconCache(): void;

  // Icon packs
  getInstalledIconPacks(): IconPackInfo[];
  setActiveIconPack(packageName: string | undefined): void;

  // Shortcuts
  getShortcuts(packageName: string): AppShortcut[];
  searchShortcuts(query: string): AppShortcut[];
  launchShortcut(packageName: string, shortcutId: string): void;
  readonly hasShortcutHostPermission: boolean;

  // Wallpaper (Kvaesitso approach — transparent window, OS composites wallpaper)
  setWallpaperBlurRadius(radius: number): void;
  readonly isWallpaperBlurSupported: boolean;
}
