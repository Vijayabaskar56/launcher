import { useEffect, useMemo, useRef, useState } from "react";

import { getSmartCalculatorEngine } from "@/lib/smart-calculator/engine";
import { classifyCalculatorQuery } from "@/lib/smart-calculator/query-heuristics";
import type { SmartCalculatorResult } from "@/lib/smart-calculator/types";

const CALCULATOR_DEBOUNCE_MS = 160;

interface UseSmartCalculatorResult {
  result: SmartCalculatorResult | null;
  isLoading: boolean;
}

export const useSmartCalculator = (query: string): UseSmartCalculatorResult => {
  const candidate = useMemo(() => classifyCalculatorQuery(query), [query]);
  const [result, setResult] = useState<SmartCalculatorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (!candidate) {
      setResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const nextResult = await getSmartCalculatorEngine().evaluate(candidate);
        if (requestId === requestIdRef.current) {
          setResult(nextResult);
          setIsLoading(false);
        }
      } catch {
        if (requestId === requestIdRef.current) {
          setResult(null);
          setIsLoading(false);
        }
      }
    }, CALCULATOR_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [candidate]);

  return { isLoading, result };
};
