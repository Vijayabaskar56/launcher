import { useMemo } from "react";

import type { FilterSuggestion } from "@/types/enriched-search";

const FILTERS: FilterSuggestion[] = [
  { filterKey: "apps", icon: "grid-outline", id: "apps", label: "Apps" },
  {
    filterKey: "contacts",
    icon: "person-outline",
    id: "contacts",
    label: "Contacts",
  },
  {
    filterKey: "events",
    icon: "calendar-outline",
    id: "calendar",
    label: "Calendar",
  },
  {
    filterKey: "tools",
    icon: "calculator-outline",
    id: "tools",
    label: "Tools",
  },
  { filterKey: "web", icon: "globe-outline", id: "web", label: "Web" },
];

const MAX_RESULTS = 5;

export function useFilterSuggestions(query: string): FilterSuggestion[] {
  return useMemo(() => {
    if (!query) {
      return FILTERS;
    }
    const q = query.toLowerCase();
    return FILTERS.filter((f) => f.label.toLowerCase().startsWith(q)).slice(
      0,
      MAX_RESULTS
    );
  }, [query]);
}
