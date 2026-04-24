import { useThemeColor } from "heroui-native";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, View } from "react-native";
import type { NativeSyntheticEvent } from "react-native";
import { EnrichedTextInput } from "react-native-enriched";
import type {
  EnrichedTextInputInstance,
  OnChangeMentionEvent,
  OnChangeTextEvent,
} from "react-native-enriched";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LauncherConfigContext } from "@/context/launcher-config";
import { useEnrichedSearch } from "@/hooks/use-enriched-search";
import type { SelectionCallbacks } from "@/hooks/use-enriched-search";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import type { Suggestion } from "@/types/enriched-search";
import type { SearchFilter } from "@/types/search";

import { PopupMenu } from "./popup-menu";
import { SuggestionPopup } from "./search/suggestion-popup";
import { Icon, ICON_MAP } from "./ui/icon";

// --- Context ---

interface SearchBarContextValue {
  state: {
    isActive: boolean;
    searchText: string;
    inputHeight: number;
    hidden: boolean;
    placeholder: string;
  };
  actions: {
    activate: () => void;
    deactivate: () => void;
    setSearchText: (text: string) => void;
    setInputHeight: (height: number) => void;
    setHidden: (hidden: boolean) => void;
    setPlaceholder: (placeholder: string | null) => void;
  };
  filterToggleRef: React.MutableRefObject<
    ((filter: SearchFilter) => void) | null
  >;
  submitRef: React.MutableRefObject<(() => void) | null>;
  meta: {
    enrichedRef: React.RefObject<EnrichedTextInputInstance | null>;
  };
  enriched: {
    activeTrigger: string | null;
    suggestions: Suggestion[];
    onStartMention: (indicator: string) => void;
    onChangeMention: (event: OnChangeMentionEvent) => void;
    onEndMention: (indicator: string) => void;
    onSelectSuggestion: (
      suggestion: Suggestion,
      callbacks: SelectionCallbacks
    ) => Promise<void>;
  };
}

interface SearchBarProviderProps {
  children: React.ReactNode;
  onActivate?: () => void;
}

const SearchBarContext = createContext<SearchBarContextValue | null>(null);

export const useSearchBar = () => use(SearchBarContext);

const SearchBarProvider = ({
  children,
  onActivate,
}: SearchBarProviderProps) => {
  const [isActive, setIsActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inputHeight, setInputHeight] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [placeholder, setPlaceholderState] = useState("Search");

  const setPlaceholder = useCallback((next: string | null) => {
    setPlaceholderState(next ?? "Search");
  }, []);
  const enrichedRef = useRef<EnrichedTextInputInstance>(null);
  const filterToggleRef = useRef<((filter: SearchFilter) => void) | null>(null);
  const submitRef = useRef<(() => void) | null>(null);

  const enrichedSearch = useEnrichedSearch();

  const activate = useCallback(() => {
    setIsActive(true);
    onActivate?.();
  }, [onActivate]);

  const deactivate = useCallback(() => {
    setIsActive(false);
    setSearchText("");
    enrichedRef.current?.setValue("");
    enrichedRef.current?.blur();
  }, []);

  const value = useMemo(
    () => ({
      actions: {
        activate,
        deactivate,
        setHidden,
        setInputHeight,
        setPlaceholder,
        setSearchText,
      },
      enriched: {
        activeTrigger: enrichedSearch.activeTrigger,
        onChangeMention: enrichedSearch.onChangeMention,
        onEndMention: enrichedSearch.onEndMention,
        onSelectSuggestion: enrichedSearch.onSelectSuggestion,
        onStartMention: enrichedSearch.onStartMention,
        suggestions: enrichedSearch.suggestions,
      },
      filterToggleRef,
      meta: { enrichedRef },
      state: { hidden, inputHeight, isActive, placeholder, searchText },
      submitRef,
    }),
    [
      activate,
      deactivate,
      hidden,
      inputHeight,
      isActive,
      placeholder,
      searchText,
      setPlaceholder,
      enrichedSearch,
    ]
  );

  return <SearchBarContext value={value}>{children}</SearchBarContext>;
};

// --- Frame ---

const SearchBarFrame = ({ children }: { children: React.ReactNode }) => {
  const config = use(LauncherConfigContext);
  const ctx = use(SearchBarContext);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  if (!config) {
    return null;
  }

  const isTop = config.state.searchBarPosition === "top";
  const isActive = ctx?.state.isActive ?? false;
  const hasSuggestions =
    (ctx?.enriched.suggestions.length ?? 0) > 0 && isActive;

  const FILTER_BAR_HEIGHT = 48;
  const SUGGESTION_HEIGHT = hasSuggestions ? 224 : 0;
  const bottomOffset =
    isActive && keyboardHeight > 0
      ? keyboardHeight + FILTER_BAR_HEIGHT + SUGGESTION_HEIGHT + 4
      : insets.bottom + 8;

  const framePosition = isTop
    ? { top: insets.top + 8 }
    : { bottom: bottomOffset };

  const isHidden = ctx?.state.hidden ?? false;

  if (isHidden) {
    return null;
  }

  return (
    <View
      className="absolute left-4 right-4 z-50"
      style={[framePosition, !isTop && { flexDirection: "column-reverse" }]}
    >
      {children}
    </View>
  );
};

// --- Icon ---

const SearchBarIcon = () => (
  <View className="items-center justify-center w-6 h-6">
    <Icon name={ICON_MAP.search} size={18} />
  </View>
);

// --- Input (EnrichedTextInput) ---

// Roughly six visible lines.
const MAX_INPUT_HEIGHT = 22 * 6;

const SearchBarInput = () => {
  const ctx = use(SearchBarContext);
  const foreground = useThemeColor("foreground");
  const accent = useThemeColor("accent");
  const muted = useThemeColor("muted");
  const lastNaturalHeight = useRef(0);
  const actions = ctx?.actions;
  const enriched = ctx?.enriched;
  const inputHeight = ctx?.state.inputHeight ?? 0;
  const isAtMax = inputHeight >= MAX_INPUT_HEIGHT;

  const handleFocus = useCallback(() => {
    actions?.activate();
  }, [actions]);

  const handleChangeText = useCallback(
    (e: NativeSyntheticEvent<OnChangeTextEvent>) => {
      const text = e.nativeEvent.value;
      actions?.setSearchText(text);
      if (text.length === 0) {
        actions?.setInputHeight(0);
        lastNaturalHeight.current = 0;
      }
    },
    [actions]
  );

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<{ key: string }>) => {
      if (e.nativeEvent.key === "Enter") {
        ctx?.submitRef.current?.();
      }
    },
    [ctx]
  );

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const { height } = e.nativeEvent.layout;
      // Avoid layout feedback loops from tiny native measurement shifts.
      if (Math.abs(height - lastNaturalHeight.current) > 2) {
        lastNaturalHeight.current = height;
        actions?.setInputHeight(Math.min(height, MAX_INPUT_HEIGHT));
      }
    },
    [actions]
  );

  const handleStartMention = useCallback(
    (indicator: string) => {
      enriched?.onStartMention(indicator);
    },
    [enriched]
  );

  const handleChangeMention = useCallback(
    (event: OnChangeMentionEvent) => {
      enriched?.onChangeMention(event);
    },
    [enriched]
  );

  const handleEndMention = useCallback(
    (indicator: string) => {
      enriched?.onEndMention(indicator);
    },
    [enriched]
  );

  if (!ctx) {
    return null;
  }

  return (
    <View
      className="flex-1"
      style={
        isAtMax ? { height: MAX_INPUT_HEIGHT, overflow: "hidden" } : undefined
      }
    >
      <EnrichedTextInput
        ref={ctx.meta.enrichedRef}
        autoCapitalize="none"
        scrollEnabled={isAtMax}
        mentionIndicators={["@", "#", ":", "/"]}
        placeholder={ctx.state.placeholder}
        placeholderTextColor={muted as string}
        cursorColor={accent as string}
        selectionColor={accent as string}
        onFocus={handleFocus}
        onChangeText={handleChangeText}
        onKeyPress={handleKeyPress}
        onLayout={handleLayout}
        onStartMention={handleStartMention}
        onChangeMention={handleChangeMention}
        onEndMention={handleEndMention}
        htmlStyle={{
          mention: {
            "#": {
              backgroundColor: "rgba(34,197,94,0.15)",
              color: "#22C55E",
              textDecorationLine: "none",
            },
            "/": {
              backgroundColor: "rgba(59,130,246,0.15)",
              color: "#3B82F6",
              textDecorationLine: "none",
            },
            ":": {
              color: foreground as string,
              textDecorationLine: "none",
            },
            "@": {
              backgroundColor: "rgba(99,102,241,0.15)",
              color: accent as string,
              textDecorationLine: "none",
            },
          },
        }}
        style={{
          backgroundColor: "transparent",
          color: foreground as string,
          fontSize: 16,
        }}
      />
    </View>
  );
};

// --- Actions (Clear + Menu) ---

const SearchBarActions = () => {
  const ctx = use(SearchBarContext);

  const handleClear = useCallback(() => {
    ctx?.actions.setSearchText("");
    ctx?.meta.enrichedRef.current?.setValue("");
    ctx?.meta.enrichedRef.current?.focus();
  }, [ctx]);

  if (!ctx) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-1">
      {ctx.state.isActive && ctx.state.searchText.length > 0 ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
        >
          <Pressable
            className="size-4 items-center justify-center"
            onPress={handleClear}
          >
            <Icon name={ICON_MAP.close} size={18} />
          </Pressable>
        </Animated.View>
      ) : null}
      <PopupMenu />
    </View>
  );
};

// --- Suggestion Overlay ---

const SearchBarSuggestions = () => {
  const ctx = use(SearchBarContext);
  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      const ref = ctx?.meta.enrichedRef.current;
      if (!ref || !ctx) {
        return;
      }

      const callbacks: SelectionCallbacks = {
        insertText: (_text: string) => {
          // For emoji, use setMention with : indicator
          // The emoji character will display as the mention text
        },
        setMention: (
          indicator: string,
          displayText: string,
          attributes: Record<string, string>
        ) => {
          ref.setMention(indicator, displayText, attributes);
        },
        setValue: (text: string) => {
          ref.setValue(text);
          ctx.actions.setSearchText(text);
        },
        toggleFilter: (filter: SearchFilter) => {
          ctx.filterToggleRef.current?.(filter);
        },
      };

      await ctx.enriched.onSelectSuggestion(suggestion, callbacks);
    },
    [ctx]
  );

  if (!ctx || !ctx.enriched.activeTrigger) {
    return null;
  }

  return (
    <SuggestionPopup
      suggestions={ctx.enriched.suggestions}
      onSelect={handleSelect}
    />
  );
};

export const SearchBar = {
  Actions: SearchBarActions,
  Frame: SearchBarFrame,
  Icon: SearchBarIcon,
  Input: SearchBarInput,
  Provider: SearchBarProvider,
  Suggestions: SearchBarSuggestions,
};
