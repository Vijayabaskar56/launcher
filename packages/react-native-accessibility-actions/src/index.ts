import { NitroModules } from "react-native-nitro-modules";

import type { AccessibilityActions } from "./specs/AccessibilityActions.nitro";

export const accessibilityActions =
  NitroModules.createHybridObject<AccessibilityActions>("AccessibilityActions");

export type { AccessibilityActions };
