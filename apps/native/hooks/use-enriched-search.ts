import { useCallback, useMemo, useState } from "react";

import type {
  CommandSuggestion,
  EmojiSuggestion,
  FilterSuggestion,
  PersonSuggestion,
  Suggestion,
  TriggerIndicator,
} from "@/types/enriched-search";
import type { SearchFilter } from "@/types/search";

import { useCommandSuggestions } from "./use-command-suggestions";
import { useEmojiSuggestions } from "./use-emoji-suggestions";
import { useFilterSuggestions } from "./use-filter-suggestions";
import { usePeopleSuggestions } from "./use-people-suggestions";

interface UseEnrichedSearchResult {
  activeTrigger: TriggerIndicator | null;
  triggerQuery: string;
  suggestions: Suggestion[];

  onStartMention: (indicator: string) => void;
  onChangeMention: (event: { indicator: string; text: string }) => void;
  onEndMention: (indicator: string) => void;

  onSelectSuggestion: (
    suggestion: Suggestion,
    callbacks: SelectionCallbacks
  ) => void;
}

export interface SelectionCallbacks {
  setMention: (
    indicator: string,
    displayText: string,
    attributes: Record<string, string>
  ) => void;
  setValue: (text: string) => void;
  toggleFilter: (filter: SearchFilter) => void;
  insertText: (text: string) => void;
}

export function useEnrichedSearch(): UseEnrichedSearchResult {
  const [activeTrigger, setActiveTrigger] = useState<TriggerIndicator | null>(
    null
  );
  const [triggerQuery, setTriggerQuery] = useState("");

  const peopleSuggestions = usePeopleSuggestions(
    activeTrigger === "@" ? triggerQuery : ""
  );
  const filterSuggestions = useFilterSuggestions(
    activeTrigger === "#" ? triggerQuery : ""
  );
  const emojiSuggestions = useEmojiSuggestions(
    activeTrigger === ":" ? triggerQuery : ""
  );
  const commandSuggestions = useCommandSuggestions(
    activeTrigger === "/" ? triggerQuery : ""
  );

  const suggestions: Suggestion[] = useMemo(() => {
    if (!activeTrigger) {
      return [];
    }
    switch (activeTrigger) {
      case "@": {
        return peopleSuggestions.map(
          (data): Suggestion => ({ data, type: "person" })
        );
      }
      case "#": {
        return filterSuggestions.map(
          (data): Suggestion => ({ data, type: "filter" })
        );
      }
      case ":": {
        return emojiSuggestions.map(
          (data): Suggestion => ({ data, type: "emoji" })
        );
      }
      case "/": {
        return commandSuggestions.map(
          (data): Suggestion => ({ data, type: "command" })
        );
      }
      default: {
        return [];
      }
    }
  }, [
    activeTrigger,
    peopleSuggestions,
    filterSuggestions,
    emojiSuggestions,
    commandSuggestions,
  ]);

  const onStartMention = useCallback((indicator: string) => {
    setActiveTrigger(indicator as TriggerIndicator);
    setTriggerQuery("");
  }, []);

  const onChangeMention = useCallback(
    (event: { indicator: string; text: string }) => {
      setTriggerQuery(event.text);
    },
    []
  );

  const onEndMention = useCallback((_indicator: string) => {
    setActiveTrigger(null);
    setTriggerQuery("");
  }, []);

  const onSelectSuggestion = useCallback(
    (suggestion: Suggestion, callbacks: SelectionCallbacks) => {
      switch (suggestion.type) {
        case "person": {
          const person = suggestion.data as PersonSuggestion;
          callbacks.setMention("@", `@${person.name}`, {
            id: person.id,
            type: "person",
          });
          callbacks.toggleFilter("contacts");
          break;
        }
        case "filter": {
          const filter = suggestion.data as FilterSuggestion;
          callbacks.setMention("#", `#${filter.label}`, {
            filterKey: filter.filterKey,
          });
          callbacks.toggleFilter(filter.filterKey);
          break;
        }
        case "emoji": {
          const emoji = suggestion.data as EmojiSuggestion;
          // Replace :shortcode with emoji character as plain text
          callbacks.insertText(emoji.emoji);
          break;
        }
        case "command": {
          const command = suggestion.data as CommandSuggestion;
          command.action();
          // Clear entire input after command execution
          callbacks.setValue("");
          break;
        }
      }

      setActiveTrigger(null);
      setTriggerQuery("");
    },
    []
  );

  return {
    activeTrigger,
    onChangeMention,
    onEndMention,
    onSelectSuggestion,
    onStartMention,
    suggestions,
    triggerQuery,
  };
}
