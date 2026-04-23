import type { SearchFilter } from "@/types/search";

export type TriggerIndicator = "@" | "#" | ":" | "/";

export interface PersonSuggestion {
  id: string;
  name: string;
  icon?: string;
}

export interface FilterSuggestion {
  id: string;
  label: string;
  icon: string;
  filterKey: SearchFilter;
}

export interface EmojiSuggestion {
  shortcode: string;
  emoji: string;
}

export interface CommandSuggestion {
  action?: () => Promise<void> | void;
  aliases?: string[];
  command: string;
  label: string;
  icon: string;
  insertText?: string;
}

export type Suggestion =
  | { type: "person"; data: PersonSuggestion }
  | { type: "filter"; data: FilterSuggestion }
  | { type: "emoji"; data: EmojiSuggestion }
  | { type: "command"; data: CommandSuggestion };
