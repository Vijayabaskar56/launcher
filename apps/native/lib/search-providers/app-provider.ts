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
      const nameScore = matchScore(query, app.appName);
      const pkgScore = matchScore(query, app.packageName);
      const textScore = Math.max(nameScore, pkgScore);

      if (textScore < 0.3) {
        continue;
      }

      const score = scoreResult(
        textScore,
        deps.usageCounts[app.packageName] ?? 0,
        deps.maxUsage
      );

      results.push({
        data: { packageName: app.packageName },
        icon: app.icon ?? undefined,
        iconType: app.icon ? "uri" : undefined,
        id: `app-${app.packageName}`,
        onPress: () => deps.launchApp(app.packageName),
        score,
        subtitle: app.packageName,
        title: app.appName,
        type: "app",
      });
    }

    return results;
  },
  tier: "instant",

  type: "app",
};
