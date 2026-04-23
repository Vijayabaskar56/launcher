import { evaluateBase } from "../evaluators/evaluate-base";
import { evaluateDateTime } from "../evaluators/evaluate-date-time";
import { evaluateMath } from "../evaluators/evaluate-math";
import { evaluateUnits } from "../evaluators/evaluate-units";
import type {
  SmartCalculatorCandidate,
  SmartCalculatorEngine,
  SmartCalculatorResult,
} from "../types";

type Evaluator = (
  candidate: SmartCalculatorCandidate
) => SmartCalculatorResult | Promise<SmartCalculatorResult | null> | null;

const EVALUATORS_BY_HINT: Record<
  SmartCalculatorCandidate["kindHint"],
  Evaluator[]
> = {
  base: [evaluateBase, evaluateMath],
  "date-time": [evaluateDateTime, evaluateMath],
  math: [evaluateMath, evaluateBase],
  unit: [evaluateUnits, evaluateMath],
  unknown: [evaluateDateTime, evaluateUnits, evaluateBase, evaluateMath],
};

export const typescriptSmartCalculatorEngine: SmartCalculatorEngine = {
  async evaluate(candidate) {
    const evaluators = EVALUATORS_BY_HINT[candidate.kindHint];

    for (const evaluator of evaluators) {
      const result = await evaluator(candidate);
      if (result) {
        return result;
      }
    }

    return null;
  },
};
