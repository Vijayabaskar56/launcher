import { matchScore, scoreResult } from "@/lib/search-service";
import type {
  ProviderDeps,
  SearchProvider,
  SearchResult,
} from "@/types/search";

export const appProvider: SearchProvider = {
  minQueryLength: 1,
  requiresNetwork: false,
  // eslint-disable-next-line require-await
  async search(query: string, deps: ProviderDeps): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const app of deps.apps) {
      // Skip apps that are hidden from search
      const visibility = deps.appVisibility[app.packageName] ?? "default";
      if (visibility === "hidden") {
        continue;
      }

      const alias = deps.appAliases[app.packageName];
      const nameScore = matchScore(query, app.appName);
      const pkgScore = matchScore(query, app.packageName);
      const aliasScore = alias ? matchScore(query, alias) : 0;
      const textScore = Math.max(nameScore, pkgScore, aliasScore);

      if (textScore < 0.3) {
        continue;
      }

      const score = scoreResult(
        textScore,
        deps.usageCounts[app.packageName] ?? 0,
        deps.maxUsage
      );

      const displayTitle = alias ?? app.appName;

      results.push({
        data: { packageName: app.packageName },
        icon: app.icon ?? undefined,
        iconType: app.icon ? "uri" : undefined,
        id: `app-${app.packageName}`,
        onPress: () => deps.launchApp(app.packageName),
        score,
        subtitle: alias ? app.appName : app.packageName,
        title: displayTitle,
        type: "app",
      });
    }

    return results;
  },
  tier: "instant",

  type: "app",
};
