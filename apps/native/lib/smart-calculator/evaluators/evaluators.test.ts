import { describe, expect, it } from "bun:test";

import type { SmartCalculatorCandidate } from "../types";
import { evaluateBase } from "./evaluate-base";
import { evaluateDateTime } from "./evaluate-date-time";
import { evaluateMath } from "./evaluate-math";
import { evaluateUnits } from "./evaluate-units";

const createCandidate = (
  rawQuery: string,
  kindHint: SmartCalculatorCandidate["kindHint"]
): SmartCalculatorCandidate => ({
  kindHint,
  normalizedQuery: rawQuery.toLowerCase(),
  rawQuery,
});

describe("smart calculator evaluators", () => {
  it("evaluates arithmetic", async () => {
    const result = await evaluateMath(createCandidate("2 + 2", "math"));

    expect(result?.kind).toBe("math");
    expect(result?.result).toBe("4");
    expect(result?.copyValue).toBe("4");
  });

  it("evaluates percentage expressions", async () => {
    const result = await evaluateMath(createCandidate("20% of 50", "math"));

    expect(result?.kind).toBe("percentage");
    expect(result?.result).toBe("10");
  });

  it("rejects identity math noise", async () => {
    const result = await evaluateMath(createCandidate("2", "math"));

    expect(result).toBeNull();
  });

  it("evaluates base conversions", async () => {
    const result = await evaluateBase(createCandidate("0xFF", "base"));

    expect(result?.kind).toBe("base");
    expect(result?.result).toBe("255");
    expect(result?.copyValue).toBe("255");
  });

  it("evaluates unit conversions", async () => {
    const result = await evaluateUnits(createCandidate("5kg to lb", "unit"));

    expect(result?.kind).toBe("unit");
    expect(result?.metadata?.unitFrom).toBe("kg");
    expect(result?.metadata?.unitTo).toBe("lb");
    expect(result?.result.toLowerCase()).toContain("lb");
  });

  it("evaluates date phrases", async () => {
    const result = await evaluateDateTime(
      createCandidate("next friday", "date-time")
    );

    expect(result?.kind).toBe("date");
    expect(result?.metadata?.resolvedDateIso).toBeString();
  });

  it("evaluates duration phrases", async () => {
    const result = await evaluateDateTime(
      createCandidate("2h 30m", "date-time")
    );

    expect(result?.kind).toBe("duration");
    expect(result?.metadata?.resolvedDurationMs).toBe(9_000_000);
  });
});
