import { NitroModules } from "react-native-nitro-modules";

import type {
  LauncherService,
  AppInfo,
  IconPackInfo,
  AppShortcut,
} from "./specs/launcher-service.nitro";

export const launcherService =
  NitroModules.createHybridObject<LauncherService>("LauncherService");

export type { LauncherService, AppInfo, IconPackInfo, AppShortcut };
