import type { SmartCalculatorCandidate } from "./types";

const PLAIN_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;
const SINGLE_WORD_PATTERN = /^[a-z]+$/i;
const WORDS_ONLY_PATTERN = /^[a-z]+(?:\s+[a-z]+)*$/i;
const BASE_LITERAL_PATTERN = /^0(?:x[\da-f]+|b[01]+|o[0-7]+)$/i;
const UNIT_CONVERSION_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)\s*[^\s]+\s+(?:to|in|>>)\s+[^\s]+$/i;
const UNIT_VALUE_PATTERN = /^-?(?:\d+(?:\.\d+)?|\.\d+)\s*[a-zA-Z%°µμ]+$/;
const OPERATOR_PATTERN = /(?:\d\s*[+\-*/^%()]|\)\s*[+\-*/^%]|\bmod\b|[=])/i;
const DATE_TIME_PATTERN =
  /\b(today|tomorrow|yesterday|now|next|last|ago|from now|after|before|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december|week|weeks|month|months|year|years|day|days|hour|hours|hr|hrs|minute|minutes|min|mins|second|seconds|sec|secs|am|pm|noon|midnight|utc|gmt|ist|est|edt|cst|cdt|mst|mdt|pst|pdt)\b/i;
const TIME_TOKEN_PATTERN =
  /(?:\b\d{1,2}:\d{2}\b|\b\d{1,2}(?:am|pm)\b|\b\d{1,2}\s*(?:am|pm)\b)/i;
const DURATION_ONLY_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)\s*(?:ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks)(?:[\s,]+-?(?:\d+(?:\.\d+)?|\.\d+)\s*(?:ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks))*$/i;

const CALCULATOR_KEYWORDS = new Set([
  "e",
  "midnight",
  "noon",
  "now",
  "phi",
  "pi",
  "today",
  "tomorrow",
  "yesterday",
  "tau",
]);

const DATE_TIME_KEYWORDS = new Set([
  "midnight",
  "noon",
  "now",
  "today",
  "tomorrow",
  "yesterday",
]);

const normalizeQuery = (query: string): string =>
  query
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll(/\s+/g, " ")
    .trim();

export const classifyCalculatorQuery = (
  query: string
): SmartCalculatorCandidate | null => {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const normalizedQuery = normalizeQuery(trimmed);
  const lowerQuery = normalizedQuery.toLowerCase();

  if (PLAIN_NUMBER_PATTERN.test(normalizedQuery)) {
    return null;
  }

  if (BASE_LITERAL_PATTERN.test(lowerQuery)) {
    return {
      kindHint: "base",
      normalizedQuery: lowerQuery,
      rawQuery: trimmed,
    };
  }

  if (UNIT_CONVERSION_PATTERN.test(normalizedQuery)) {
    return {
      kindHint: "unit",
      normalizedQuery: lowerQuery,
      rawQuery: trimmed,
    };
  }

  if (
    DURATION_ONLY_PATTERN.test(lowerQuery) ||
    DATE_TIME_PATTERN.test(lowerQuery) ||
    TIME_TOKEN_PATTERN.test(lowerQuery)
  ) {
    return {
      kindHint: "date-time",
      normalizedQuery: lowerQuery,
      rawQuery: trimmed,
    };
  }

  if (OPERATOR_PATTERN.test(normalizedQuery)) {
    return {
      kindHint: "math",
      normalizedQuery: lowerQuery,
      rawQuery: trimmed,
    };
  }

  if (UNIT_VALUE_PATTERN.test(normalizedQuery)) {
    return {
      kindHint: "unit",
      normalizedQuery: lowerQuery,
      rawQuery: trimmed,
    };
  }

  if (SINGLE_WORD_PATTERN.test(lowerQuery)) {
    if (!CALCULATOR_KEYWORDS.has(lowerQuery)) {
      return null;
    }
    return {
      kindHint: DATE_TIME_KEYWORDS.has(lowerQuery) ? "date-time" : "math",
      normalizedQuery: lowerQuery,
      rawQuery: trimmed,
    };
  }

  if (WORDS_ONLY_PATTERN.test(lowerQuery)) {
    return null;
  }

  if (CALCULATOR_KEYWORDS.has(lowerQuery)) {
    return {
      kindHint: DATE_TIME_KEYWORDS.has(lowerQuery) ? "date-time" : "math",
      normalizedQuery: lowerQuery,
      rawQuery: trimmed,
    };
  }

  return {
    kindHint: "unknown",
    normalizedQuery: lowerQuery,
    rawQuery: trimmed,
  };
};
