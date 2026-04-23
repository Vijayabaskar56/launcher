import { describe, expect, it } from "bun:test";

import { classifyCalculatorQuery } from "./query-heuristics";

describe("classifyCalculatorQuery", () => {
  it("rejects plain numbers", () => {
    expect(classifyCalculatorQuery("4")).toBeNull();
    expect(classifyCalculatorQuery("12.5")).toBeNull();
  });

  it("rejects plain search words", () => {
    expect(classifyCalculatorQuery("spotify")).toBeNull();
    expect(classifyCalculatorQuery("john smith")).toBeNull();
  });

  it("accepts calculator keywords", () => {
    expect(classifyCalculatorQuery("pi")?.kindHint).toBe("math");
    expect(classifyCalculatorQuery("today")?.kindHint).toBe("date-time");
  });

  it("accepts operator expressions", () => {
    expect(classifyCalculatorQuery("2 + 2")?.kindHint).toBe("math");
    expect(classifyCalculatorQuery("(5 * 4) - 1")?.kindHint).toBe("math");
  });

  it("accepts unit expressions", () => {
    expect(classifyCalculatorQuery("5kg to lb")?.kindHint).toBe("unit");
    expect(classifyCalculatorQuery("10 inches in cm")?.kindHint).toBe("unit");
  });

  it("accepts date phrases", () => {
    expect(classifyCalculatorQuery("next friday")?.kindHint).toBe("date-time");
    expect(classifyCalculatorQuery("2 weeks from now")?.kindHint).toBe(
      "date-time"
    );
  });

  it("accepts base literals", () => {
    expect(classifyCalculatorQuery("0xFF")?.kindHint).toBe("base");
    expect(classifyCalculatorQuery("0b1010")?.kindHint).toBe("base");
  });
});
