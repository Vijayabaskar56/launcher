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

const CONVERSION_PATTERN =
  /^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*([^\s]+)\s+(?:to|in|>>)\s+([^\s]+)$/i;
const STANDALONE_UNIT_PATTERN =
  /^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*([a-zA-Z°µμ]+)$/;

const UNIT_ALIASES: Record<string, string> = {
  c: "degC",
  celsius: "degC",
  centimeter: "cm",
  centimeters: "cm",
  centimetre: "cm",
  centimetres: "cm",
  f: "degF",
  fahrenheit: "degF",
  feet: "ft",
  foot: "ft",
  grams: "g",
  hour: "hour",
  hours: "hour",
  inch: "inch",
  inches: "inch",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  km: "km",
  kph: "km / hour",
  lb: "lb",
  lbs: "lb",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  m: "m",
  meter: "m",
  meters: "m",
  metre: "m",
  metres: "m",
  mile: "mi",
  miles: "mi",
  min: "minute",
  mins: "minute",
  minute: "minute",
  minutes: "minute",
  mph: "mi / hour",
  ounce: "oz",
  ounces: "oz",
  pound: "lb",
  pounds: "lb",
  sec: "second",
  second: "second",
  seconds: "second",
};

const getMath = (): MathModule => {
  if (!mathInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require, unicorn/prefer-module
    mathInstance = require("mathjs") as MathModule;
  }

  return mathInstance;
};

const normalizeUnit = (unit: string): string => {
  const normalized = unit.trim().toLowerCase().replaceAll(/\.$/g, "");
  return UNIT_ALIASES[normalized] ?? unit.trim();
};

const formatMathValue = (value: unknown, math: MathModule): string => {
  if (typeof value === "string") {
    return value;
  }

  if (math.format) {
    return math.format(value, {
      lowerExp: -12,
      precision: 12,
      upperExp: 21,
    });
  }

  return String(value);
};

export const evaluateUnits = (
  candidate: SmartCalculatorCandidate
): Promise<SmartCalculatorResult | null> => {
  const math = getMath();
  const trimmed = candidate.rawQuery.trim();
  const conversionMatch = CONVERSION_PATTERN.exec(trimmed);

  try {
    if (conversionMatch) {
      const [, value, rawFromUnit, rawToUnit] = conversionMatch;
      const unitFrom = normalizeUnit(rawFromUnit);
      const unitTo = normalizeUnit(rawToUnit);
      const result = math.evaluate(`${value} ${unitFrom} to ${unitTo}`);

      if (result === null || result === undefined) {
        return null;
      }

      const rawResult = formatMathValue(result, math);
      if (!hasMeaningfulTransformation(trimmed, rawResult)) {
        return null;
      }

      return createSmartCalculatorResult({
        copyValue: rawResult,
        input: `${value} ${unitFrom}`,
        inputLabel: "From",
        kind: "unit",
        metadata: { unitFrom, unitTo },
        result: rawResult,
        resultLabel: "To",
        score: 0.97,
      });
    }

    const standaloneMatch = STANDALONE_UNIT_PATTERN.exec(trimmed);
    if (!standaloneMatch) {
      return null;
    }

    const [, value, rawUnit] = standaloneMatch;
    const unit = normalizeUnit(rawUnit);
    const result = math.evaluate(`${value} ${unit}`);

    if (result === null || result === undefined) {
      return null;
    }

    const rawResult = formatMathValue(result, math);
    if (!hasMeaningfulTransformation(trimmed, rawResult)) {
      return null;
    }

    return createSmartCalculatorResult({
      copyValue: rawResult,
      input: trimmed,
      kind: "unit",
      metadata: { unitFrom: unit },
      result: rawResult,
      score: 0.92,
    });
  } catch {
    return null;
  }
};
