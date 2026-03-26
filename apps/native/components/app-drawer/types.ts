import type { InstalledApp } from "@/context/app-list";

import type { IconName } from "../ui/icon";

export interface DrawerApp extends InstalledApp {
  // alias for packageName — required by SortableGrid
  id: string;
  alias?: string;
  displayLabel: string;
  isPinned: boolean;
  pinnedOrder?: number;
  tagIds: string[];
}

export interface DrawerActionMenuState {
  packageName: string;
  triggerBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DrawerEditorDraft {
  alias: string;
  isPinned: boolean;
  tagIds: string[];
}

export type DrawerEditorFocusMode = "rename" | "tags";

export interface ActionMenuItem {
  id: string;
  icon: IconName;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

export interface SubmenuActionMenuItem {
  id: string;
  icon: IconName;
  label: string;
  onPress?: () => void;
  children: ActionMenuItem[];
}

export type ToolbarAction = ActionMenuItem | SubmenuActionMenuItem;
