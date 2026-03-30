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
  badges: Record<string, number>;
  getBadgeCount: (packageName: string) => number;
  hasPermission: boolean;
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

const getBridge = () => {
  try {
    // eslint-disable-next-line unicorn/prefer-module, node/global-require -- conditional native module loading
    const { notificationBridge } = require("react-native-notification-bridge");
    return notificationBridge;
  } catch {
    return null;
  }
};

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

  const registerCallbacks = useCallback(
    (bridge: ReturnType<typeof getBridge>) => {
      if (!bridge) {
        return;
      }

      bridge.onNotificationPosted((packageName: string, key: string) => {
        activeNotificationsRef.current.set(key, { key, packageName });
        recalculateBadges();
      });

      bridge.onNotificationRemoved((key: string) => {
        activeNotificationsRef.current.delete(key);
        recalculateBadges();
      });
    },
    [recalculateBadges]
  );

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const bridge = getBridge();
    if (!bridge) {
      return;
    }

    const granted = bridge.isNotificationListenerEnabled;
    setHasPermission(granted);

    if (granted) {
      registerCallbacks(bridge);
    }
  }, [registerCallbacks]);

  // Re-check permission on foreground — re-register callbacks if newly granted
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        return;
      }

      const bridge = getBridge();
      if (!bridge) {
        return;
      }

      const granted = bridge.isNotificationListenerEnabled;
      setHasPermission((prev) => {
        if (!prev && granted) {
          registerCallbacks(bridge);
        }
        return granted;
      });
    });

    return () => sub.remove();
  }, [registerCallbacks]);

  const requestPermission = useCallback(() => {
    if (Platform.OS !== "android") {
      return;
    }
    getBridge()?.openNotificationListenerSettings();
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
