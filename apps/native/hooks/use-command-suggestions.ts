import { useRouter } from "expo-router";
import { useMemo } from "react";

import type { CommandSuggestion } from "@/types/enriched-search";

export function useCommandSuggestions(query: string): CommandSuggestion[] {
  const router = useRouter();

  const commands: CommandSuggestion[] = useMemo(
    () => [
      {
        action: () => router.push("/settings"),
        command: "/settings",
        icon: "settings-outline",
        label: "Open settings",
      },
      {
        action: () => {
          /* clear handled by caller */
        },
        command: "/clear",
        icon: "close-circle-outline",
        label: "Clear search",
      },
      {
        action: () => router.push("/settings/search"),
        command: "/search",
        icon: "search-outline",
        label: "Search settings",
      },
      {
        action: () => router.push("/settings/appearance"),
        command: "/theme",
        icon: "color-palette-outline",
        label: "Change theme",
      },
      {
        action: () => router.push("/settings/integrations"),
        command: "/weather",
        icon: "cloud-outline",
        label: "Weather settings",
      },
    ],
    [router]
  );

  return useMemo(() => {
    if (!query) {
      return commands.slice(0, 5);
    }
    const q = query.toLowerCase();
    return commands.filter((c) => c.command.slice(1).startsWith(q)).slice(0, 5);
  }, [query, commands]);
}
