import type { InstalledApp } from "@/context/app-list";
import type { AppVisibility } from "@/context/drawer-metadata";
import type { SearchSettings } from "@/types/settings";

// --- Result Types ---

export type SearchResultType =
  | "app"
  | "contact"
  | "calendar"
  | "calculator"
  | "unit-converter"
  | "currency"
  | "wikipedia"
  | "website"
  | "location"
  | "action";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  icon?: string;
  iconType?: "uri" | "ionicon" | "material";
  score: number;
  data: unknown;
  onPress: () => void;
  onLongPress?: () => void;
}

// Contact-specific result data for expandable inline actions
export interface ContactResultData {
  contactId: string;
  phoneNumbers: { label: string; number: string }[];
  emails: { label: string; email: string }[];
  imageUri?: string;
}

// --- Provider Interface ---

export interface ProviderDeps {
  apps: InstalledApp[];
  appAliases: Record<string, string>;
  appVisibility: Record<string, AppVisibility>;
  launchApp: (packageName: string) => void;
  settings: SearchSettings;
  usageCounts: Record<string, number>;
  maxUsage: number;
  locationCoords?: { lat: number; lon: number };
}

export interface SearchProvider {
  type: SearchResultType;
  minQueryLength: number;
  tier: "instant" | "network";
  requiresNetwork: boolean;
  search: (query: string, deps: ProviderDeps) => Promise<SearchResult[]>;
}

// --- Filters ---

export type SearchFilter = "apps" | "contacts" | "events" | "tools" | "web";

export const RESULT_TYPE_TO_FILTER: Record<SearchResultType, SearchFilter> = {
  action: "apps",
  app: "apps",
  calculator: "tools",
  calendar: "events",
  contact: "contacts",
  currency: "tools",
  location: "web",
  "unit-converter": "tools",
  website: "web",
  wikipedia: "web",
};

// Display order matching Kvaesitso
export const SECTION_ORDER: SearchResultType[] = [
  "action",
  "app",
  "calculator",
  "unit-converter",
  "currency",
  "contact",
  "calendar",
  "wikipedia",
  "website",
  "location",
];

export const SECTION_LABELS: Record<SearchResultType, string> = {
  action: "Quick Actions",
  app: "Apps",
  calculator: "Calculator",
  calendar: "Calendar",
  contact: "Contacts",
  currency: "Currency",
  location: "Places",
  "unit-converter": "Unit Converter",
  website: "Website",
  wikipedia: "Wikipedia",
};

// --- Quick Actions ---

export interface SearchActionMatch {
  type:
    | "call"
    | "sms"
    | "email"
    | "url"
    | "web-search"
    | "create-contact"
    | "set-alarm"
    | "start-timer"
    | "create-event";
  label: string;
  icon: string;
  onPress: () => void;
}

// --- Permission State ---

export type PermissionState = "unknown" | "granted" | "denied" | "prompt";
