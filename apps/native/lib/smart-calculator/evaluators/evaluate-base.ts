import {
  createSmartCalculatorResult,
  hasMeaningfulTransformation,
} from "../format-result";
import type { SmartCalculatorCandidate, SmartCalculatorResult } from "../types";

const HEX_PATTERN = /^0x[\da-f]+$/i;
const BIN_PATTERN = /^0b[01]+$/i;
const OCT_PATTERN = /^0o[0-7]+$/i;

export const evaluateBase = (
  candidate: SmartCalculatorCandidate
): SmartCalculatorResult | null => {
  const normalized = candidate.normalizedQuery;

  if (
    !HEX_PATTERN.test(normalized) &&
    !BIN_PATTERN.test(normalized) &&
    !OCT_PATTERN.test(normalized)
  ) {
    return null;
  }

  const numericValue = Number(normalized);
  if (!Number.isSafeInteger(numericValue)) {
    return null;
  }

  const decimalValue = String(numericValue);
  if (!hasMeaningfulTransformation(candidate.rawQuery, decimalValue)) {
    return null;
  }

  return createSmartCalculatorResult({
    copyValue: decimalValue,
    input: candidate.rawQuery,
    kind: "base",
    metadata: { numericValue },
    result: decimalValue,
    resultLabel: "Decimal",
    score: 0.99,
  });
};
