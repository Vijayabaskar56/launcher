import type { SmartCalculatorKind, SmartCalculatorResult } from "./types";

const RESULT_LABELS: Record<
  SmartCalculatorKind,
  { inputLabel: string; resultLabel: string }
> = {
  base: { inputLabel: "From", resultLabel: "To" },
  date: { inputLabel: "Query", resultLabel: "Resolved" },
  duration: { inputLabel: "Query", resultLabel: "Resolved" },
  math: { inputLabel: "Expression", resultLabel: "Result" },
  percentage: { inputLabel: "Expression", resultLabel: "Result" },
  time: { inputLabel: "Query", resultLabel: "Resolved" },
  unit: { inputLabel: "From", resultLabel: "To" },
};

const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;
const INTEGER_NUMBER_FORMATTER = new Intl.NumberFormat(undefined);
const DECIMAL_NUMBER_FORMATTER = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 12,
});

export const trimCalculatorText = (value: string): string =>
  value.replaceAll(/\s+/g, " ").trim();

export const formatNumericDisplay = (value: number): string => {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return Number.isInteger(value)
    ? INTEGER_NUMBER_FORMATTER.format(value)
    : DECIMAL_NUMBER_FORMATTER.format(value);
};

export const formatDisplayValue = (value: number | string): string => {
  if (typeof value === "number") {
    return formatNumericDisplay(value);
  }

  const trimmed = trimCalculatorText(value);
  if (NUMBER_PATTERN.test(trimmed)) {
    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) {
      return formatNumericDisplay(numericValue);
    }
  }

  return trimmed;
};

export const hasMeaningfulTransformation = (
  input: string,
  result: string
): boolean =>
  trimCalculatorText(input).toLowerCase() !==
  trimCalculatorText(result).toLowerCase();

interface CreateSmartCalculatorResultOptions {
  kind: SmartCalculatorKind;
  input: string;
  result: number | string;
  copyValue: string;
  score: number;
  inputLabel?: string;
  resultLabel?: string;
  metadata?: SmartCalculatorResult["metadata"];
}

export const createSmartCalculatorResult = ({
  kind,
  input,
  result,
  copyValue,
  score,
  inputLabel,
  resultLabel,
  metadata,
}: CreateSmartCalculatorResultOptions): SmartCalculatorResult => {
  const labels = RESULT_LABELS[kind];

  return {
    copyValue: trimCalculatorText(copyValue),
    input: trimCalculatorText(input),
    inputLabel: inputLabel ?? labels.inputLabel,
    kind,
    metadata,
    result: formatDisplayValue(result),
    resultLabel: resultLabel ?? labels.resultLabel,
    score,
  };
};
