import { accessibilityActions } from "react-native-accessibility-actions";

import type { SwipeDirection } from "@/hooks/use-homescreen-gestures";
import type { GestureAction } from "@/types/settings";

export interface GestureActionContext {
  openDrawer: (direction?: SwipeDirection) => void;
  openWidgetPanel: (direction?: SwipeDirection) => void;
  openSearch: () => void;
  openNotifications: () => void;
  openQuickSettings: () => void;
  openRecents: () => void;
  openPowerMenu: () => void;
  lockScreen: () => void;
  launchApp: (packageName: string) => void;
}

export function executeGestureAction(
  action: GestureAction,
  ctx: GestureActionContext,
  launchAppPackage?: string,
  direction?: SwipeDirection
): void {
  if (action === "launch-app" && launchAppPackage) {
    ctx.launchApp(launchAppPackage);
    return;
  }
  if (action === "app-drawer") {
    ctx.openDrawer(direction);
    return;
  }
  if (action === "widgets") {
    ctx.openWidgetPanel(direction);
    return;
  }
  if (action === "none") {
    return;
  }
  if (action === "search") {
    ctx.openSearch();
    return;
  }
  if (action === "notifications") {
    ctx.openNotifications();
    return;
  }
  if (action === "quick-settings") {
    ctx.openQuickSettings();
    return;
  }
  if (action === "recents") {
    ctx.openRecents();
    return;
  }
  if (action === "power-menu") {
    ctx.openPowerMenu();
    return;
  }
  if (action === "lock-screen") {
    ctx.lockScreen();
    return;
  }
}

// --- Animation Style Mapping ---

export type GestureAnimationStyle = "rubberband" | "push" | "zoomIn" | "none";

const animationStyleMap: Record<GestureAction, GestureAnimationStyle> = {
  "app-drawer": "push",
  "launch-app": "zoomIn",
  "lock-screen": "zoomIn",
  none: "none",
  notifications: "rubberband",
  "power-menu": "zoomIn",
  "quick-settings": "rubberband",
  recents: "push",
  search: "push",
  widgets: "rubberband",
};

export function getAnimationStyle(
  action: GestureAction
): GestureAnimationStyle {
  return animationStyleMap[action];
}

// --- Permission Requirements ---

export interface ActionPermission {
  description: string;
  checkAvailable: () => boolean;
}

const isServiceEnabled = () => accessibilityActions.isAccessibilityEnabled;

const accessibilityPermission: ActionPermission = {
  checkAvailable: isServiceEnabled,
  description: "Requires Accessibility service",
};

const permissionMap: Partial<Record<GestureAction, ActionPermission>> = {
  "lock-screen": accessibilityPermission,
  notifications: accessibilityPermission,
  "power-menu": accessibilityPermission,
  "quick-settings": accessibilityPermission,
  recents: accessibilityPermission,
};

export function getActionPermission(
  action: GestureAction
): ActionPermission | null {
  return permissionMap[action] ?? null;
}

// --- Human-readable action labels ---

export const GESTURE_ACTION_LABELS: Record<GestureAction, string> = {
  "app-drawer": "App Drawer",
  "launch-app": "Launch App",
  "lock-screen": "Lock Screen",
  none: "Do nothing",
  notifications: "Notification Drawer",
  "power-menu": "Power Menu",
  "quick-settings": "Quick Settings",
  recents: "Recent Apps",
  search: "Open Search",
  widgets: "Widgets",
};
