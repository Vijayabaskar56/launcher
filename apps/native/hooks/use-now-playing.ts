import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

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

const getBridge = () => {
  try {
    // eslint-disable-next-line unicorn/prefer-module, node/global-require -- conditional native module loading
    const { notificationBridge } = require("react-native-notification-bridge");
    return notificationBridge as {
      readonly isNotificationListenerEnabled: boolean;
      openNotificationListenerSettings: () => void;
      onMediaMetadataChanged: (
        cb: (metadata: MediaMetadata | undefined) => void
      ) => void;
      onPlaybackStateChanged: (cb: (state: PlaybackState) => void) => void;
      play: () => void;
      pause: () => void;
      skipToNext: () => void;
      skipToPrevious: () => void;
    };
  } catch {
    return null;
  }
};

interface UseNowPlayingResult {
  metadata: MediaMetadata | undefined;
  state: PlaybackState;
  hasPermission: boolean;
  requestPermission: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
}

export const useNowPlaying = (): UseNowPlayingResult => {
  const bridgeRef = useRef<ReturnType<typeof getBridge> | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | undefined>();
  const [state, setState] = useState<PlaybackState>("none");
  const [hasPermission, setHasPermission] = useState(false);

  const bridge = (() => {
    if (!bridgeRef.current) {
      bridgeRef.current = getBridge();
    }
    return bridgeRef.current;
  })();

  useEffect(() => {
    if (!bridge) {
      return;
    }

    setHasPermission(bridge.isNotificationListenerEnabled);

    bridge.onMediaMetadataChanged((next) => {
      setMetadata(next);
    });

    bridge.onPlaybackStateChanged((next) => {
      setState(next);
    });
  }, [bridge]);

  // Re-check permission on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && bridge) {
        setHasPermission(bridge.isNotificationListenerEnabled);
      }
    });
    return () => sub.remove();
  }, [bridge]);

  const requestPermission = useCallback(() => {
    bridge?.openNotificationListenerSettings();
  }, [bridge]);

  const play = useCallback(() => {
    bridge?.play();
  }, [bridge]);
  const pause = useCallback(() => {
    bridge?.pause();
  }, [bridge]);
  const next = useCallback(() => {
    bridge?.skipToNext();
  }, [bridge]);
  const previous = useCallback(() => {
    bridge?.skipToPrevious();
  }, [bridge]);
  const toggle = useCallback(() => {
    if (state === "playing") {
      bridge?.pause();
    } else {
      bridge?.play();
    }
  }, [state, bridge]);

  return {
    hasPermission,
    metadata,
    next,
    pause,
    play,
    previous,
    requestPermission,
    state,
    toggle,
  };
};
