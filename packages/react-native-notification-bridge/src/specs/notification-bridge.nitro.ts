import type { HybridObject } from "react-native-nitro-modules";

export interface MediaMetadata {
  title: string | undefined;
  artist: string | undefined;
  album: string | undefined;
  albumArtPath: string | undefined;
  /** Duration in ms, -1 if unknown */
  duration: number;
  packageName: string;
}

export type PlaybackState = "playing" | "paused" | "stopped" | "none";

export interface NotificationBridge extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  // Permission
  readonly isNotificationListenerEnabled: boolean;
  openNotificationListenerSettings(): void;

  // Badge counts (raw events — JS aggregates)
  onNotificationPosted(
    callback: (packageName: string, key: string) => void
  ): void;
  onNotificationRemoved(callback: (key: string) => void): void;

  // Media session (push model — native drives updates)
  onMediaMetadataChanged(
    callback: (metadata: MediaMetadata | undefined) => void
  ): void;
  onPlaybackStateChanged(callback: (state: PlaybackState) => void): void;
  readonly canSeek: boolean;
  getPlaybackPosition(): number;

  // Transport controls
  play(): void;
  pause(): void;
  seekTo(positionMs: number): void;
  skipToNext(): void;
  skipToPrevious(): void;
}
