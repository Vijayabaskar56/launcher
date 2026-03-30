import { use } from "react";

import { NotificationBadgesContext } from "@/context/notification-badges";

/**
 * Returns the active notification count for a given package.
 * Returns 0 if no notifications are active or the listener is unavailable.
 */
export const useNotificationBadge = (packageName: string): number => {
  const { getBadgeCount } = use(NotificationBadgesContext);
  return getBadgeCount(packageName);
};
