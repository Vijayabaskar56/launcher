import type {
  HybridObject,
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from "react-native-nitro-modules";

// --- Data types ---

export interface WidgetProviderInfo {
  provider: string;
  packageName: string;
  label: string;
  minWidth: number;
  minHeight: number;
}

// --- HybridObject: Widget host lifecycle service ---

export interface WidgetHostService extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  getInstalledWidgetProviders(): WidgetProviderInfo[];
  allocateAndBindWidget(provider: string): Promise<number>;
  deleteWidget(widgetId: number): void;
}

// --- HybridView: Native widget renderer ---

export interface AppWidgetViewProps extends HybridViewProps {
  appWidgetId: number;
  widgetWidth: number;
  widgetHeight: number;
}

export interface AppWidgetViewMethods extends HybridViewMethods {
  onStatusChange(callback: (status: string) => void): void;
}

export type AppWidgetView = HybridView<
  AppWidgetViewProps,
  AppWidgetViewMethods,
  { ios: "swift"; android: "kotlin" }
>;
