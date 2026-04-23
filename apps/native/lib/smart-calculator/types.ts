export type SmartCalculatorKind =
  | "math"
  | "unit"
  | "percentage"
  | "base"
  | "date"
  | "time"
  | "duration";

export interface SmartCalculatorCandidate {
  rawQuery: string;
  normalizedQuery: string;
  kindHint: "math" | "unit" | "date-time" | "base" | "unknown";
}

export interface SmartCalculatorResult {
  kind: SmartCalculatorKind;
  input: string;
  inputLabel: string;
  result: string;
  resultLabel: string;
  copyValue: string;
  score: number;
  metadata?: {
    numericValue?: number;
    unitFrom?: string;
    unitTo?: string;
    resolvedDateIso?: string;
    resolvedDurationMs?: number;
  };
}

export interface SmartCalculatorEngine {
  evaluate(
    candidate: SmartCalculatorCandidate
  ): Promise<SmartCalculatorResult | null>;
}
