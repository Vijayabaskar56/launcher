# Smart Calculator Implementation Plan

> **For Codex/Claude:** Implement this plan task-by-task. Use the named skills exactly where called out per each task. **Do NOT reload a skill if it is already loaded in the current conversation context.**
>
> - `react-native-best-practices` for New Architecture boundaries, native module decisions, and performance guardrails
> - `vercel-react-best-practices` for hook design, debouncing, stale request handling, and derived state
> - `vercel-composition-patterns` for the engine adapter boundary and UI/domain separation
> - `building-components` for the calculator card and search result composition
> - `ultracite` for TypeScript and markdown hygiene

**Goal:** Replace the current basic search calculator with a Raycast-style smart calculator experience: natural-feeling query heuristics, richer result kinds, a dedicated top calculator card, and a clean engine boundary that can support a future Nitro-native evaluator without forcing the UI/search flow to depend on native code on day one.

**Reference:** [SuperCmd smart-calculator.ts](file:///Users/vijayabaskar/work/references/SuperCmd/src/renderer/src/smart-calculator.ts) — heuristic gate + structured result mapping
**Reference:** [SuperCmd soulver-calculator.ts](file:///Users/vijayabaskar/work/references/SuperCmd/src/main/soulver-calculator.ts) — long-lived engine bridge architecture
**Reference:** [SuperCmd App.tsx calculator card integration](file:///Users/vijayabaskar/work/references/SuperCmd/src/renderer/src/App.tsx) — dedicated top card, debounced async evaluation
**Reference:** [Current calculator-provider.ts](file:///Users/vijayabaskar/work/launcher/apps/native/lib/search-providers/calculator-provider.ts) — current mathjs-only implementation
**Reference:** [Current unit-converter-provider.ts](file:///Users/vijayabaskar/work/launcher/apps/native/lib/search-providers/unit-converter-provider.ts) — current regex + mathjs converter
**Reference:** [Current use-search.ts](file:///Users/vijayabaskar/work/launcher/apps/native/hooks/use-search.ts) — search orchestration
**Reference:** [Current search-results-list.tsx](file:///Users/vijayabaskar/work/launcher/apps/native/components/search/search-results-list.tsx) — current sectioned result UI

---

### Product Decisions Locked

- **Calculator surface:** Dedicated top card above normal search sections. It is not rendered as a normal `"calculator"` row inside the `SectionList`.
- **Heuristics location:** Query heuristics stay in JS/TS, not in Nitro. They are product behavior and will change frequently.
- **Engine boundary:** All evaluation goes through a `SmartCalculatorEngine` interface. The UI and search layer must not care whether the implementation is TypeScript or Nitro-native.
- **Phase 1 engine:** TypeScript implementation first. This gets us fast iteration, easy testing, and no native rebuild loop while behavior is still moving.
- **Nitro status:** Planned as Phase 2, behind the same engine interface. Build it only after the TypeScript behavior is validated and the remaining limitations are clear.
- **v1 result kinds:** `math`, `unit`, `percentage`, `base`, `date`, `time`, `duration`.
- **Currency:** Keep the existing `currencyProvider` as its own network-backed provider in v1. Do not fold currency into the smart calculator until we decide on a rate source and caching policy.
- **Current providers:** `calculatorProvider` and `unitConverterProvider` are replaced by the smart calculator flow in v1. They should not continue rendering duplicate results.
- **Activation rules:** Suppress calculation for plain integers/decimals, obvious app-search text, and most single alphabetic words unless they match explicit calculator keywords.
- **Execution timing:** Heuristic classification is synchronous and cheap. Evaluation is debounced and stale-safe.
- **Debounce target:** 120-200ms for asynchronous calculation requests while typing.
- **Copy behavior:** Tapping the calculator card copies the final result. Long press can be reserved for future actions.
- **Presentation:** The card shows a kind chip, input label, result label, and a strong visual distinction between expression and output.
- **Offline-first:** v1 must work fully offline for math, units, base conversion, percentages, and date/time resolution.
- **Performance bar:** No constant polling, no expensive parser work on every render, and no native bridge chatter on every keystroke beyond the debounced request.
- **No direct `useEffect` in components:** Any async calculator orchestration belongs in a custom hook or search service helper, consistent with repo rules.

---

### Architecture Summary

The smart calculator should sit beside the provider-based search system, not inside it.

Existing search providers remain section-oriented and return normal `SearchResult[]`. The smart calculator instead returns a single structured `SmartCalculatorResult | null`, which the search UI renders as a dedicated card above the section list. This mirrors the SuperCmd/Raycast interaction model and avoids overfitting a top-card experience into the generic provider list.

The implementation should be split into three layers:

1. **Heuristic layer**
   - Decides whether the current query is calculator-eligible.
   - Produces a `SmartCalculatorCandidate` with kind hints and normalized input.
   - Lives entirely in TypeScript.

2. **Engine layer**
   - Accepts a normalized candidate and evaluates it.
   - Returns structured results with labels and metadata.
   - Starts as TypeScript, later optional Nitro adapter.

3. **Presentation layer**
   - Debounces evaluation.
   - Ignores stale responses.
   - Renders the dedicated calculator card.
   - Keeps normal search providers untouched except for removing legacy calculator providers.

This gives us the important property we want: **the UI contract stays stable even if the underlying engine changes**.

---

### TypeScript API

```ts
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
```

Notes:

- `copyValue` exists so the card can copy a machine-friendly value even if `result` is formatted for display.
- `score` allows future ranking decisions if we later blend the calculator into other AI/command surfaces.
- `metadata` is optional but gives us forward compatibility for later actions such as “open calendar on resolved date” or “reuse last result”.

---

### Recommended Directory Layout

```text
apps/native/
  components/search/
    calculator-card.tsx
  hooks/
    use-smart-calculator.ts
  lib/smart-calculator/
    engine.ts
    types.ts
    query-heuristics.ts
    format-result.ts
    engines/
      typescript-engine.ts
      nitro-engine.ts
    evaluators/
      evaluate-math.ts
      evaluate-units.ts
      evaluate-base.ts
      evaluate-date-time.ts
```

Optional later package:

```text
packages/react-native-smart-calculator/
```

---

### Packages to Install

```bash
bun add --cwd apps/native chrono-node luxon
```

Keep using existing `mathjs` for arithmetic and units in v1.

Why these packages:

- `mathjs` is already present and is still good for arithmetic, percentages, and unit math.
- `chrono-node` is the missing piece for natural language date/time parsing.
- `luxon` gives timezone-safe formatting and duration math without inventing our own date handling layer.

---

### Scope Boundaries

### In v1

- Arithmetic expressions
- Percentages
- Unit conversions
- Base conversions
- Date/time phrases like `today`, `tomorrow`, `next friday`, `2 weeks from now`
- Duration math like `90 minutes`, `2h 30m`, `3 days after tomorrow`
- Dedicated calculator card
- Stale-safe debounced async evaluation
- Replacement of the old calculator and unit-converter rows

### Not in v1

- Live currency inside calculator
- Variables and history
- Multi-line worksheet mode
- Symbolic algebra
- Voice input
- Graphing
- Per-user custom functions
- Full Nitro-native engine implementation

---

### Task 1: Define Smart Calculator Domain Types

**Required skills:** `vercel-composition-patterns`

**Files:**

- Create: `apps/native/lib/smart-calculator/types.ts`
- Create: `apps/native/lib/smart-calculator/engine.ts`

**Step 1: Add the domain types**

Define:

- `SmartCalculatorKind`
- `SmartCalculatorCandidate`
- `SmartCalculatorResult`
- `SmartCalculatorEngine`

Keep these types independent from `SearchResult`. This layer is domain-focused, not UI-focused.

**Step 2: Export a stable engine contract**

`engine.ts` should expose:

- `getSmartCalculatorEngine(): SmartCalculatorEngine`
- a default TypeScript-backed engine binding for v1

Do not reference Nitro here yet. Keep the selector simple and swappable.

**Step 3: Commit**

```text
feat: add smart calculator domain types and engine interface
```

---

### Task 2: Build Query Heuristics

**Required skills:** `vercel-react-best-practices`

**Files:**

- Create: `apps/native/lib/smart-calculator/query-heuristics.ts`

**Step 1: Add a classifier**

Create:

```ts
export function classifyCalculatorQuery(
  query: string
): SmartCalculatorCandidate | null;
```

The classifier should:

- trim whitespace
- reject empty input
- reject plain integers and plain decimals such as `4` and `12.5`
- reject most single words such as `spotify`, `maps`, `music`
- allow calculator keywords such as `pi`, `e`, `tau`, `today`, `tomorrow`, `yesterday`, `now`
- detect unit syntax like `5kg to lb`, `10 inches in cm`
- detect obvious operators like `+`, `-`, `*`, `/`, `%`, `^`, parentheses
- detect base literals like `0xFF`, `0b1010`, `0o17`
- detect natural date/time language like `next monday`, `2 weeks from now`, `3pm ist`

**Step 2: Add kind hints**

The classifier should set `kindHint` to one of:

- `"math"`
- `"unit"`
- `"date-time"`
- `"base"`
- `"unknown"`

This is a hint to short-circuit evaluation order, not a hard guarantee.

**Step 3: Guard against false positives**

Explicitly test and suppress common launcher-search queries:

- app names
- plain package-ish words
- person names
- single tokens with no operators or known calculator meaning

**Step 4: Commit**

```text
feat: add smart calculator query heuristics
```

---

### Task 3: Implement the TypeScript Engine Shell

**Required skills:** `react-native-best-practices`

**Files:**

- Create: `apps/native/lib/smart-calculator/engines/typescript-engine.ts`
- Create: `apps/native/lib/smart-calculator/format-result.ts`

**Step 1: Create a single engine entrypoint**

Expose:

```ts
export const typescriptSmartCalculatorEngine: SmartCalculatorEngine;
```

The engine should:

- accept a `SmartCalculatorCandidate`
- choose the best evaluator based on `kindHint`
- fall back across evaluators when the hinted path fails
- return `null` when no calculator result is confidently available

**Step 2: Centralize formatting**

Create `format-result.ts` to standardize:

- labels such as `Expression`, `Result`, `From`, `To`, `Query`, `Resolved`
- result string trimming
- thousands separators where appropriate
- display-safe output for date/time and duration

Formatting should not be repeated inside each evaluator.

**Step 3: Commit**

```text
feat: add typescript smart calculator engine shell
```

---

### Task 4: Implement Arithmetic, Percentage, and Base Evaluation

**Required skills:** `react-native-best-practices`

**Files:**

- Create: `apps/native/lib/smart-calculator/evaluators/evaluate-math.ts`
- Create: `apps/native/lib/smart-calculator/evaluators/evaluate-base.ts`

**Step 1: Math evaluator**

Use `mathjs` for:

- arithmetic expressions
- parentheses
- exponents
- percentages where `mathjs` already handles them correctly
- constants such as `pi`, `e`

Return kind `"math"` or `"percentage"` depending on the detected expression.

**Step 2: Base evaluator**

Support:

- `0x`, `0b`, `0o` inputs
- decimal integer output
- subtitle-style conversions replaced by structured result formatting

A base result should render as one primary result with compact display output, for example:

- input: `0xFF`
- result: `255`
- metadata and copy value may still include alternate forms

**Step 3: Explicitly reject identity noise**

If the final display result equals the raw input and there is no richer transformation, return `null`.

**Step 4: Commit**

```text
feat: add math and base evaluators for smart calculator
```

---

### Task 5: Implement Unit Conversion

**Required skills:** `react-native-best-practices`

**Files:**

- Create: `apps/native/lib/smart-calculator/evaluators/evaluate-units.ts`

**Step 1: Migrate current unit logic**

Reuse the good parts of the existing provider:

- `value + unit + to/in/>> + target unit`
- standalone unit expression handling when meaningful

But convert it to structured results instead of `SearchResult`.

**Step 2: Normalize common user syntax**

Handle friendly variants such as:

- `5kg to lb`
- `32 f to c`
- `10km in miles`
- `6'2 in cm` only if parsing is reliable; otherwise defer

Prefer correctness over cleverness. Do not add ambiguous syntax unless it is tested.

**Step 3: Return kind `"unit"`**

Example:

- inputLabel: `From`
- resultLabel: `To`

**Step 4: Commit**

```text
feat: add unit evaluator for smart calculator
```

---

### Task 6: Implement Date, Time, and Duration Evaluation

**Required skills:** `react-native-best-practices`

**Files:**

- Create: `apps/native/lib/smart-calculator/evaluators/evaluate-date-time.ts`

**Step 1: Use `chrono-node` for parsing**

Parse natural language such as:

- `today`
- `tomorrow`
- `next friday`
- `2 weeks from now`
- `3 days after may 1`
- `in 90 minutes`

**Step 2: Use `luxon` for output formatting**

Use `luxon` to:

- format absolute dates and times in local timezone
- calculate durations
- normalize display strings

**Step 3: Distinguish kinds**

Return:

- `"date"` for resolved calendar dates
- `"time"` for time-of-day resolutions
- `"duration"` for duration expressions and arithmetic

**Step 4: Keep locale behavior explicit**

Use the device locale for formatting, but keep parsing deterministic where possible.

**Step 5: Commit**

```text
feat: add date and duration evaluator for smart calculator
```

---

### Task 7: Add the `useSmartCalculator()` Hook

**Required skills:** `vercel-react-best-practices`

**Files:**

- Create: `apps/native/hooks/use-smart-calculator.ts`

**Step 1: Expose a stable hook**

```ts
function useSmartCalculator(query: string): {
  result: SmartCalculatorResult | null;
  isLoading: boolean;
};
```

The hook should:

- run `classifyCalculatorQuery(query)` synchronously
- return `null` immediately when the query is not calculator-eligible
- debounce evaluation
- ignore stale async responses
- avoid work when the trimmed query has not materially changed

**Step 2: Keep orchestration inside the hook**

Do not put async calculator evaluation logic directly in `app-drawer.tsx` or other components.

This hook is the right place for:

- timer cleanup
- request sequencing
- stale request protection
- loading state

**Step 3: Commit**

```text
feat: add useSmartCalculator hook with debounced evaluation
```

---

### Task 8: Build the Calculator Card UI

**Required skills:** `building-components`

**Files:**

- Create: `apps/native/components/search/calculator-card.tsx`

**Step 1: Build a dedicated top card**

The card should render:

- kind chip
- small meta line such as `Tap to copy`
- input label + input value
- result label + result value

Do not make this look like a normal search result row. It needs stronger hierarchy.

**Step 2: Interaction**

- Tap: copy `copyValue`
- Long press: reserved for future actions, no requirement in v1
- No hidden fake controls

**Step 3: Theming**

Use existing theme tokens and follow the current search surface design. Do not introduce a new isolated visual system.

**Step 4: Commit**

```text
feat: add smart calculator card component
```

---

### Task 9: Integrate the Calculator Card Into Search

**Required skills:** `vercel-composition-patterns`, `building-components`

**Files:**

- Modify: `apps/native/hooks/use-search.ts`
- Modify: `apps/native/components/search/search-results-list.tsx`
- Modify: `apps/native/components/app-drawer.tsx`

**Step 1: Extend `useSearch()`**

Add a new field:

```ts
calculatorResult: SmartCalculatorResult | null;
```

`useSearch()` should:

- keep normal provider orchestration for standard result sections
- call `useSmartCalculator(query)` in parallel
- expose the calculator result separately from the `results` map

Do not push the calculator card back into `SearchResult[]`.

**Step 2: Render the card above the section list**

`SearchResultsList` should accept an optional `calculatorResult` prop and render the card before the section list content.

If there are no normal results but a calculator result exists, the screen should still feel complete and intentional.

**Step 3: Maintain current action rows and filters**

The calculator card is additive. It must not break:

- quick actions
- filter bar
- section ordering for normal providers

**Step 4: Commit**

```text
feat: integrate smart calculator card into search flow
```

---

### Task 10: Retire Legacy Calculator Providers

**Required skills:** `vercel-composition-patterns`

**Files:**

- Modify: `apps/native/hooks/use-search.ts`
- Delete or deprecate: `apps/native/lib/search-providers/calculator-provider.ts`
- Delete or deprecate: `apps/native/lib/search-providers/unit-converter-provider.ts`
- Modify: `apps/native/types/search.ts`

**Step 1: Remove duplicate provider registration**

Stop registering `calculatorProvider` and `unitConverterProvider` from `use-search.ts`.

**Step 2: Clean up obsolete type surface**

If no longer used, remove:

- `"calculator"`
- `"unit-converter"`

from `SearchResultType`, `SECTION_ORDER`, and `SECTION_LABELS`.

If a temporary compatibility period is needed, mark them as deprecated and remove in a follow-up commit.

**Step 3: Commit**

```text
refactor: replace legacy search calculator providers with smart calculator flow
```

---

### Task 11: Add Tests for Heuristics and Evaluators

**Required skills:** `ultracite`

**Files:**

- Create tests alongside the new smart calculator files, following the repo's existing test conventions

**Step 1: Heuristic tests**

Cover:

- plain numbers rejected
- single plain words rejected
- explicit calculator keywords accepted
- operator expressions accepted
- unit expressions accepted
- date phrases accepted

**Step 2: Evaluator tests**

Cover:

- arithmetic
- percentage
- base conversion
- unit conversion
- date resolution
- duration resolution
- identity/noise rejection

**Step 3: UI contract tests if practical**

If the repo already supports React component tests for search UI, add a thin test for:

- calculator card rendering
- copy action invocation

If not, keep the tests at the domain and hook layer.

**Step 4: Commit**

```text
test: add smart calculator heuristic and evaluator coverage
```

---

### Task 12: Optional Phase 2 Nitro Module

**Required skills:** `react-native-best-practices`

**Goal:** Introduce a Nitro-native evaluator only if Phase 1 exposes clear limitations in correctness or performance.

**Files:**

- Create: `packages/react-native-smart-calculator/` (optional future package)
- Modify: `apps/native/lib/smart-calculator/engines/nitro-engine.ts`
- Modify: `apps/native/lib/smart-calculator/engine.ts`

**Step 1: Preserve the existing engine contract**

The Nitro module must conform to the same `SmartCalculatorEngine` interface shape from Task 1.

**Step 2: Native module API**

The native module should expose one high-level method:

```ts
evaluate(query: string): Promise<SmartCalculatorResult | null>;
```

Do not move the JS heuristics into native. JS should decide whether the engine is called at all.

**Step 3: Platform expectations**

- Android: real implementation
- iOS: stub unless the feature is explicitly needed there

**Step 4: Migration strategy**

`engine.ts` becomes the selector:

- TypeScript engine in dev and fallback mode
- Nitro engine behind a feature flag or build-time toggle

**Step 5: Commit**

```text
feat: add optional nitro-backed smart calculator engine
```

---

### Verification Checklist

- Typing `2+2` shows a calculator card, not a generic row
- Typing `spotify` does not trigger the calculator
- Typing `5kg to lb` shows a unit result
- Typing `next friday` shows a date result
- Typing `0xFF` shows a base conversion result
- Tapping the card copies the result
- Normal search providers still behave the same
- No duplicate calculator/unit sections remain
- Search remains responsive while typing quickly

---

### Recommended Implementation Order

1. Domain types and engine contract
2. Heuristics
3. TypeScript engine shell
4. Math/base evaluators
5. Unit evaluator
6. Date/time evaluator
7. `useSmartCalculator()`
8. Calculator card
9. Search integration
10. Legacy provider removal
11. Tests
12. Optional Nitro phase

---

### Why This Plan Uses a JS-First Engine

This is a product-iteration problem before it is a native-module problem.

The highest-risk part is not the bridge. It is:

- the heuristics that decide when calculator should appear
- the result formatting that makes it feel polished
- the UI contract that makes it feel distinct from ordinary search

Those are fastest to tune in TypeScript. Once the behavior is good, a Nitro engine becomes a contained optimization or capability upgrade instead of a moving target.
