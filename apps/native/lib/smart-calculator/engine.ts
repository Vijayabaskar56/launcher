import { typescriptSmartCalculatorEngine } from "./engines/typescript-engine";
import type { SmartCalculatorEngine } from "./types";

const engine: SmartCalculatorEngine = typescriptSmartCalculatorEngine;

export const getSmartCalculatorEngine = (): SmartCalculatorEngine => engine;
