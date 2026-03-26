// Comprehensive settings interfaces mirroring Kvaesitso's LauncherSettingsData

// --- Appearance ---

export type ColorScheme = "light" | "dark" | "system";
export type ThemePreset = "default" | "high-contrast" | "black-and-white";

export interface ThemeSettings {
  colorScheme: ColorScheme;
  themePreset: ThemePreset;
  accentColor: string;
  fontFamily: string;
  cornerRadius: number;
  transparency: number;
}

export type FontFamily =
  | "system"
  | "inter"
  | "space-grotesk"
  | "jetbrains-mono";

export const FONT_FAMILIES = [
  { id: "system" as FontFamily, label: "System Default" },
  { id: "inter" as FontFamily, label: "Inter" },
  { id: "space-grotesk" as FontFamily, label: "Space Grotesk" },
  { id: "jetbrains-mono" as FontFamily, label: "JetBrains Mono" },
] as const;

// --- Theme Constants ---

export const ACCENT_COLORS = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Lime", value: "#84CC16" },
  { name: "Green", value: "#22C55E" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
  { name: "Rose", value: "#F43F5E" },
] as const;

export const THEME_PRESETS = [
  {
    description: "Standard theme with balanced colors",
    id: "default" as ThemePreset,
    name: "Default",
    previewColors: ["#1a1a2e", "#6366F1", "#e0e0e0"],
  },
  {
    description: "Enhanced contrast for accessibility",
    id: "high-contrast" as ThemePreset,
    name: "High Contrast",
    previewColors: ["#0a0a0a", "#818CF8", "#f8f8f8"],
  },
  {
    description: "Pure monochrome, no color",
    id: "black-and-white" as ThemePreset,
    name: "Black & White",
    previewColors: ["#000000", "#ffffff", "#666666"],
  },
] as const;

// --- Homescreen ---

export type SearchBarStyle = "transparent" | "solid" | "hidden";
export type SearchBarPosition = "top" | "bottom";
export type SystemBarIconColor = "light" | "dark" | "auto";
export type ClockStyle = "digital" | "analog";
export type BatteryIndicatorMode = "hide" | "always" | "charging-or-low";

export interface HomescreenSettings {
  fixedRotation: boolean;
  clockStyle: ClockStyle;
  showSeconds: boolean;
  batteryIndicator: BatteryIndicatorMode;
  dockEnabled: boolean;
  dockRowCount: number;
  widgetsEnabled: boolean;
  searchBarStyle: SearchBarStyle;
  searchBarPosition: SearchBarPosition;
  fixedSearchBar: boolean;
  wallpaperDim: boolean;
  wallpaperBlur: boolean;
  wallpaperBlurRadius: number;
  statusBarIconColor: SystemBarIconColor;
  navigationBarIconColor: SystemBarIconColor;
  hideStatusBar: boolean;
  hideNavigationBar: boolean;
  chargingAnimation: boolean;
}

// --- Icons ---

export type IconShape =
  | "circle"
  | "square"
  | "rounded-square"
  | "squircle"
  | "teardrop"
  | "hexagon";

export interface IconSettings {
  iconShape: IconShape;
  showLabels: boolean;
  themedIcons: boolean;
  forceThemedIcons: boolean;
  adaptify: boolean;
  iconPack: string;
}

// --- Search ---

export interface SearchSettings {
  searchAllApps: boolean;
  contactSearch: boolean;
  contactCallOnTap: boolean;
  calendarSearch: boolean;
  fileSearch: boolean;
  shortcutSearch: boolean;
  calculator: boolean;
  unitConverter: boolean;
  wikipediaSearch: boolean;
  websiteSearch: boolean;
  locationSearch: boolean;
  filterBarEnabled: boolean;
}

// --- Gestures ---

export type GestureAction =
  | "none"
  | "search"
  | "notifications"
  | "quick-settings"
  | "app-drawer"
  | "recents"
  | "power-menu"
  | "lock-screen";

export interface GestureSettings {
  swipeDown: GestureAction;
  swipeUp: GestureAction;
  swipeLeft: GestureAction;
  swipeRight: GestureAction;
  doubleTap: GestureAction;
  longPress: GestureAction;
}

// --- Integrations ---

export type WeatherProvider = "openweathermap" | "met-no" | "none";
export type SearchEngine = "google" | "duckduckgo" | "bing";

export interface IntegrationSettings {
  weatherProvider: WeatherProvider;
  autoLocation: boolean;
  manualLocation: string;
  calendarEnabled: boolean;
  mediaEnabled: boolean;
  fileSearchEnabled: boolean;
  contactSearchEnabled: boolean;
  nextcloudEnabled: boolean;
  nextcloudUrl: string;
  searchEngine: SearchEngine;
}

// --- Locale ---

export type TimeFormat = "12h" | "24h" | "system";
export type MeasurementSystem = "metric" | "uk" | "us" | "system";
export type CalendarType =
  | "gregorian"
  | "persian"
  | "hijri"
  | "none"
  | "system";

export interface LocaleSettings {
  timeFormat: TimeFormat;
  measurementSystem: MeasurementSystem;
  primaryCalendar: CalendarType;
  secondaryCalendar: CalendarType;
  transliterator: string;
}

// --- Debug ---

export type LogLevel = "verbose" | "debug" | "info" | "warn" | "error";

export interface DebugSettings {
  logLevel: LogLevel;
}

// --- Combined Settings ---

export interface LauncherSettingsData {
  appearance: ThemeSettings;
  homescreen: HomescreenSettings;
  icons: IconSettings;
  search: SearchSettings;
  gestures: GestureSettings;
  integrations: IntegrationSettings;
  locale: LocaleSettings;
  debug: DebugSettings;
}

// --- Defaults ---

export const DEFAULT_SETTINGS: LauncherSettingsData = {
  appearance: {
    accentColor: "#6366f1",
    colorScheme: "system",
    cornerRadius: 12,
    fontFamily: "system",
    themePreset: "default",
    transparency: 0.8,
  },
  debug: {
    logLevel: "info",
  },
  gestures: {
    doubleTap: "lock-screen",
    longPress: "none",
    swipeDown: "notifications",
    swipeLeft: "none",
    swipeRight: "none",
    swipeUp: "app-drawer",
  },
  homescreen: {
    batteryIndicator: "charging-or-low",
    chargingAnimation: true,
    clockStyle: "digital",
    dockEnabled: true,
    dockRowCount: 1,
    fixedRotation: false,
    fixedSearchBar: false,
    hideNavigationBar: false,
    hideStatusBar: false,
    navigationBarIconColor: "auto",
    searchBarPosition: "bottom",
    searchBarStyle: "transparent",
    showSeconds: false,
    statusBarIconColor: "auto",
    wallpaperBlur: false,
    wallpaperBlurRadius: 20,
    wallpaperDim: false,
    widgetsEnabled: true,
  },
  icons: {
    adaptify: true,
    forceThemedIcons: false,
    iconPack: "default",
    iconShape: "circle",
    showLabels: true,
    themedIcons: false,
  },
  integrations: {
    autoLocation: true,
    calendarEnabled: true,
    contactSearchEnabled: true,
    fileSearchEnabled: false,
    manualLocation: "",
    mediaEnabled: true,
    nextcloudEnabled: false,
    nextcloudUrl: "",
    searchEngine: "google",
    weatherProvider: "openweathermap",
  },
  locale: {
    measurementSystem: "system",
    primaryCalendar: "system",
    secondaryCalendar: "none",
    timeFormat: "system",
    transliterator: "",
  },
  search: {
    calculator: true,
    calendarSearch: true,
    contactCallOnTap: false,
    contactSearch: true,
    fileSearch: false,
    filterBarEnabled: true,
    locationSearch: false,
    searchAllApps: true,
    shortcutSearch: true,
    unitConverter: true,
    websiteSearch: false,
    wikipediaSearch: false,
  },
};
