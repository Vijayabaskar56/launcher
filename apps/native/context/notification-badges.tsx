import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

interface NotificationBadgesContextValue {
  /** Map of packageName -> active notification count */
  badges: Record<string, number>;
  /** Get the badge count for a specific package */
  getBadgeCount: (packageName: string) => number;
  /** Whether notification listener permission is granted */
  hasPermission: boolean;
  /** Open system settings to grant notification listener permission */
  requestPermission: () => void;
}

export const NotificationBadgesContext =
  createContext<NotificationBadgesContextValue>({
    badges: {},
    getBadgeCount: () => 0,
    hasPermission: false,
    requestPermission: () => {
      // no-op default
    },
  });

interface NotificationEntry {
  key: string;
  packageName: string;
}

export const NotificationBadgesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [hasPermission, setHasPermission] = useState(false);
  const activeNotificationsRef = useRef<Map<string, NotificationEntry>>(
    new Map()
  );

  const recalculateBadges = useCallback(() => {
    const counts: Record<string, number> = {};
    for (const entry of activeNotificationsRef.current.values()) {
      counts[entry.packageName] = (counts[entry.packageName] ?? 0) + 1;
    }
    setBadges(counts);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let removedSubscription: { remove: () => void } | null = null;

    const setup = async () => {
      try {
        const module =
          await import("expo-android-notification-listener-service");
        const service = module.default;

        // Check initial permission state
        const granted = service.isNotificationPermissionGranted();
        setHasPermission(granted);

        if (!granted) {
          return;
        }

        // Listen for new notifications
        subscription = service.addListener(
          "onNotificationReceived",
          (event: { key: string; packageName: string }) => {
            activeNotificationsRef.current.set(event.key, {
              key: event.key,
              packageName: event.packageName,
            });
            recalculateBadges();
          }
        );

        // Listen for removed notifications
        removedSubscription = service.addListener(
          "onNotificationRemoved" as never,
          (event: { key: string }) => {
            activeNotificationsRef.current.delete(event.key);
            recalculateBadges();
          }
        );
      } catch {
        // Native module not available (e.g. in Expo Go or web)
      }
    };

    setup();

    return () => {
      subscription?.remove();
      removedSubscription?.remove();
    };
  }, [recalculateBadges]);

  // Re-check permission when app returns to foreground
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        try {
          const module =
            await import("expo-android-notification-listener-service");
          const granted = module.default.isNotificationPermissionGranted();
          setHasPermission(granted);
        } catch {
          // Native module not available
        }
      }
    });

    return () => sub.remove();
  }, []);

  const requestPermission = useCallback(async () => {
    if (Platform.OS !== "android") {
      return;
    }

    try {
      const module = await import("expo-android-notification-listener-service");
      module.default.openNotificationListenerSettings();
    } catch {
      // Native module not available
    }
  }, []);

  const getBadgeCount = useCallback(
    (packageName: string) => badges[packageName] ?? 0,
    [badges]
  );

  const value = useMemo(
    () => ({ badges, getBadgeCount, hasPermission, requestPermission }),
    [badges, getBadgeCount, hasPermission, requestPermission]
  );

  return (
    <NotificationBadgesContext value={value}>
      {children}
    </NotificationBadgesContext>
  );
};
