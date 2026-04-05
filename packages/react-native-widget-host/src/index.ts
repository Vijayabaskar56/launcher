import { NitroModules, getHostComponent } from "react-native-nitro-modules";

import type {
  WidgetHostService,
  WidgetProviderInfo,
  AppWidgetViewProps,
  AppWidgetViewMethods,
} from "./specs/widget-host.nitro";

// eslint-disable-next-line node/global-require, unicorn/prefer-module
const AppWidgetViewConfig = require("../nitrogen/generated/shared/json/AppWidgetViewConfig.json");

export const widgetHostService =
  NitroModules.createHybridObject<WidgetHostService>("WidgetHostService");

export const NativeAppWidgetView = getHostComponent<
  AppWidgetViewProps,
  AppWidgetViewMethods
>("AppWidgetView", () => AppWidgetViewConfig);

export type {
  WidgetHostService,
  WidgetProviderInfo,
  AppWidgetViewProps,
  AppWidgetViewMethods,
};
