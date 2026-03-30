import { NitroModules } from "react-native-nitro-modules";

import type {
  NotificationBridge,
  MediaMetadata,
  PlaybackState,
} from "./specs/notification-bridge.nitro";

export const notificationBridge =
  NitroModules.createHybridObject<NotificationBridge>("NotificationBridge");

export type { NotificationBridge, MediaMetadata, PlaybackState };
