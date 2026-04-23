import * as chrono from "chrono-node";
import { DateTime, Duration } from "luxon";

import { createSmartCalculatorResult } from "../format-result";
import type {
  SmartCalculatorCandidate,
  SmartCalculatorKind,
  SmartCalculatorResult,
} from "../types";

const DURATION_PART_PATTERN =
  /(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks)\b/gi;
const PURE_DURATION_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)\s*(?:ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks)(?:[\s,]+-?(?:\d+(?:\.\d+)?|\.\d+)\s*(?:ms|msec|msecs|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks))*$/i;
const DATE_RELATIVE_PATTERN =
  /\b(in|ago|after|before|from now|today|tomorrow|yesterday|next|last)\b/i;
const TIME_SIGNAL_PATTERN =
  /(?:\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:am|pm)\b|\b(?:am|pm|noon|midnight|now|utc|gmt|ist|est|edt|cst|cdt|mst|mdt|pst|pdt)\b)/i;

const DURATION_MULTIPLIERS: Record<string, number> = {
  d: 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  hr: 60 * 60 * 1000,
  hrs: 60 * 60 * 1000,
  m: 60 * 1000,
  millisecond: 1,
  milliseconds: 1,
  min: 60 * 1000,
  mins: 60 * 1000,
  minute: 60 * 1000,
  minutes: 60 * 1000,
  ms: 1,
  msec: 1,
  msecs: 1,
  s: 1000,
  sec: 1000,
  second: 1000,
  seconds: 1000,
  secs: 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
  wk: 7 * 24 * 60 * 60 * 1000,
  wks: 7 * 24 * 60 * 60 * 1000,
};

const getLocale = (): string =>
  Intl.DateTimeFormat().resolvedOptions().locale || "en-US";

const parseDurationMillis = (query: string): number | null => {
  const matches = [...query.matchAll(DURATION_PART_PATTERN)];
  if (matches.length === 0) {
    return null;
  }

  const remainingText = query.replaceAll(DURATION_PART_PATTERN, " ").trim();
  if (remainingText.length > 0) {
    return null;
  }

  let totalMs = 0;
  for (const [, rawValue, rawUnit] of matches) {
    const numericValue = Number(rawValue);
    const unit = rawUnit.toLowerCase();
    const multiplier = DURATION_MULTIPLIERS[unit];
    if (!Number.isFinite(numericValue) || multiplier === undefined) {
      return null;
    }
    totalMs += numericValue * multiplier;
  }

  return totalMs > 0 ? totalMs : null;
};

const formatDurationResult = (durationMs: number): string =>
  Duration.fromMillis(durationMs)
    .shiftTo("weeks", "days", "hours", "minutes", "seconds")
    .normalize()
    .toHuman({
      listStyle: "long",
      maximumFractionDigits: 2,
      unitDisplay: "short",
    });

const inferChronoKind = (query: string): SmartCalculatorKind => {
  if (TIME_SIGNAL_PATTERN.test(query)) {
    return "time";
  }

  return "date";
};

export const evaluateDateTime = (
  candidate: SmartCalculatorCandidate
): SmartCalculatorResult | null => {
  const trimmed = candidate.rawQuery.trim();
  const lowerQuery = trimmed.toLowerCase();

  if (
    PURE_DURATION_PATTERN.test(lowerQuery) &&
    !DATE_RELATIVE_PATTERN.test(lowerQuery)
  ) {
    const durationMs = parseDurationMillis(lowerQuery);
    if (!durationMs) {
      return null;
    }

    const displayValue = formatDurationResult(durationMs);
    return createSmartCalculatorResult({
      copyValue: displayValue,
      input: trimmed,
      kind: "duration",
      metadata: { resolvedDurationMs: durationMs },
      result: displayValue,
      score: 0.95,
    });
  }

  const [parsedResult] = chrono.parse(trimmed, new Date(), {
    forwardDate: true,
  });
  if (!parsedResult) {
    return null;
  }

  const locale = getLocale();
  const resolvedDate = DateTime.fromJSDate(parsedResult.start.date()).setLocale(
    locale
  );
  const kind = inferChronoKind(lowerQuery);
  const displayValue =
    kind === "time"
      ? resolvedDate.toLocaleString(DateTime.DATETIME_MED)
      : resolvedDate.toLocaleString(DateTime.DATE_FULL);

  return createSmartCalculatorResult({
    copyValue: displayValue,
    input: trimmed,
    kind,
    metadata: { resolvedDateIso: resolvedDate.toISO() ?? undefined },
    result: displayValue,
    score: 0.96,
  });
};
