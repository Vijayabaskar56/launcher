import { Clipboard } from "react-native";

import type {
  ProviderDeps,
  SearchProvider,
  SearchResult,
} from "@/types/search";

// biome-ignore lint: lazy require to avoid upfront bundle cost
let mathInstance: { evaluate: (expr: string) => unknown } | null = null;

const getMath = (): { evaluate: (expr: string) => unknown } => {
  if (!mathInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require, unicorn/prefer-module
    mathInstance = require("mathjs") as { evaluate: (expr: string) => unknown };
  }
  return mathInstance;
};

// Matches patterns like "5 inches to cm", "10 kg >> lb", "100 fahrenheit to celsius"
const CONVERSION_PATTERN = /^([\d.]+)\s*(\S+)\s+(?:to|>>|in)\s+(\S+)$/i;

// Matches standalone unit expressions like "5 inches", "3.5 kg"
const UNIT_PATTERN = /^([\d.]+)\s+([a-z]+)$/i;

export const unitConverterProvider: SearchProvider = {
  minQueryLength: 3,
  requiresNetwork: false,
  // eslint-disable-next-line require-await
  async search(query: string, _deps: ProviderDeps): Promise<SearchResult[]> {
    try {
      const math = getMath();
      const trimmed = query.trim();

      const conversionMatch = CONVERSION_PATTERN.exec(trimmed);
      if (conversionMatch) {
        const [, value, fromUnit, toUnit] = conversionMatch;
        const expression = `${value} ${fromUnit} to ${toUnit}`;
        const result = math.evaluate(expression);

        if (result === undefined || result === null) {
          return [];
        }

        const resultStr = String(result);

        return [
          {
            data: { expression: trimmed, result: resultStr },
            icon: "swap-horizontal-outline",
            iconType: "ionicon",
            id: `unit-${trimmed}`,
            onPress: () => Clipboard.setString(resultStr),
            score: 0.95,
            subtitle: `= ${resultStr}`,
            title: trimmed,
            type: "unit-converter",
          },
        ];
      }

      // Try standalone unit expression via mathjs evaluate
      const unitMatch = UNIT_PATTERN.exec(trimmed);
      if (unitMatch) {
        const result = math.evaluate(trimmed);

        if (result === undefined || result === null) {
          return [];
        }

        const resultStr = String(result);

        // Only show if mathjs recognized it as a unit (result differs from plain number)
        if (resultStr === unitMatch[1]) {
          return [];
        }

        return [
          {
            data: { expression: trimmed, result: resultStr },
            icon: "swap-horizontal-outline",
            iconType: "ionicon",
            id: `unit-${trimmed}`,
            onPress: () => Clipboard.setString(resultStr),
            score: 0.95,
            subtitle: `= ${resultStr}`,
            title: trimmed,
            type: "unit-converter",
          },
        ];
      }

      return [];
    } catch {
      return [];
    }
  },
  tier: "instant",

  type: "unit-converter",
};
