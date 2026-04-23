import {
  createSmartCalculatorResult,
  hasMeaningfulTransformation,
} from "../format-result";
import type { SmartCalculatorCandidate, SmartCalculatorResult } from "../types";

interface MathModule {
  evaluate: (expression: string) => unknown;
  format?: (
    value: unknown,
    options?: { lowerExp?: number; precision?: number; upperExp?: number }
  ) => string;
}

let mathInstance: MathModule | null = null;

const PERCENTAGE_PATTERN = /%|\bpercent\b/i;

const getMath = (): MathModule => {
  if (!mathInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require, unicorn/prefer-module
    mathInstance = require("mathjs") as MathModule;
  }

  return mathInstance;
};

const normalizeMathExpression = (query: string): string =>
  query
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll(/(\d+(?:\.\d+)?)\s*%\s+of\s+/gi, "($1 / 100) * ")
    .trim();

const getFormattedMathValue = (value: unknown, math: MathModule): string => {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (math.format) {
    return math.format(value, {
      lowerExp: -12,
      precision: 14,
      upperExp: 21,
    });
  }

  return String(value);
};

export const evaluateMath = (
  candidate: SmartCalculatorCandidate
): SmartCalculatorResult | null => {
  const math = getMath();
  const expression = normalizeMathExpression(candidate.rawQuery);

  try {
    const result = math.evaluate(expression);

    if (result === null || result === undefined) {
      return null;
    }

    const rawResult = getFormattedMathValue(result, math);
    if (!hasMeaningfulTransformation(candidate.rawQuery, rawResult)) {
      return null;
    }

    const numericValue = Number(rawResult);

    return createSmartCalculatorResult({
      copyValue: rawResult,
      input: candidate.rawQuery,
      kind: PERCENTAGE_PATTERN.test(candidate.rawQuery) ? "percentage" : "math",
      metadata: Number.isFinite(numericValue) ? { numericValue } : undefined,
      result: rawResult,
      score: 0.98,
    });
  } catch {
    return null;
  }
};
