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

const HEX_PATTERN = /^0x[\da-f]+$/i;
const BIN_PATTERN = /^0b[01]+$/i;
const OCT_PATTERN = /^0o[0-7]+$/i;

const buildBaseConversions = (value: number): string => {
  const parts = [
    `Dec: ${value}`,
    `Hex: 0x${value.toString(16).toUpperCase()}`,
    `Bin: 0b${value.toString(2)}`,
    `Oct: 0o${value.toString(8)}`,
  ];
  return parts.join("  |  ");
};

export const calculatorProvider: SearchProvider = {
  minQueryLength: 1,
  requiresNetwork: false,
  // eslint-disable-next-line require-await
  async search(query: string, _deps: ProviderDeps): Promise<SearchResult[]> {
    try {
      const math = getMath();
      const trimmed = query.trim();

      // Check for base-prefix literals (hex, binary, octal)
      if (
        HEX_PATTERN.test(trimmed) ||
        BIN_PATTERN.test(trimmed) ||
        OCT_PATTERN.test(trimmed)
      ) {
        const parsed = Number(trimmed);
        if (Number.isNaN(parsed)) {
          return [];
        }

        const subtitle = buildBaseConversions(parsed);
        return [
          {
            data: { expression: trimmed, result: String(parsed) },
            icon: "calculator-outline",
            iconType: "ionicon",
            id: `calc-${trimmed}`,
            onPress: () => Clipboard.setString(String(parsed)),
            score: 1,
            subtitle,
            title: trimmed,
            type: "calculator",
          },
        ];
      }

      const result = math.evaluate(trimmed);

      if (result === undefined || result === null) {
        return [];
      }

      // mathjs can return various types; coerce to a displayable string
      const resultStr = String(result);

      // Skip results that are identical to the input (e.g. single numbers)
      if (resultStr === trimmed) {
        return [];
      }

      const results: SearchResult[] = [
        {
          data: { expression: trimmed, result: resultStr },
          icon: "calculator-outline",
          iconType: "ionicon",
          id: `calc-${trimmed}`,
          onPress: () => Clipboard.setString(resultStr),
          score: 1,
          subtitle: `= ${resultStr}`,
          title: trimmed,
          type: "calculator",
        },
      ];

      // If the result is an integer, also show base conversions
      const numericResult = Number(result);
      if (
        Number.isInteger(numericResult) &&
        numericResult >= 0 &&
        // eslint-disable-next-line unicorn/number-literal-case
        numericResult <= 4_294_967_295
      ) {
        results[0].subtitle = `= ${resultStr}  (${buildBaseConversions(numericResult)})`;
      }

      return results;
    } catch {
      return [];
    }
  },
  tier: "instant",

  type: "calculator",
};
