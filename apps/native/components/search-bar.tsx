import { useThemeColor } from "heroui-native";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Pressable, View } from "react-native";
import type { NativeSyntheticEvent } from "react-native";
import { EnrichedTextInput } from "react-native-enriched";
import type {
  EnrichedTextInputInstance,
  OnChangeMentionEvent,
} from "react-native-enriched";
import type { OnChangeTextEvent } from "react-native-enriched";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LauncherConfigContext } from "@/context/launcher-config";
import { useEnrichedSearch } from "@/hooks/use-enriched-search";
import type { SelectionCallbacks } from "@/hooks/use-enriched-search";
import type { Suggestion } from "@/types/enriched-search";
import type { SearchFilter } from "@/types/search";

import { PopupMenu } from "./popup-menu";
import { SuggestionPopup } from "./search/suggestion-popup";
import { Icon, ICON_MAP } from "./ui/icon";

// --- Context ---

interface SearchBarContextValue {
  state: { isActive: boolean; searchText: string };
  actions: {
    activate: () => void;
    deactivate: () => void;
    setSearchText: (text: string) => void;
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
    ) => void;
  };
}

interface SearchBarProviderProps {
  children: React.ReactNode;
  onActivate?: () => void;
  onToggleFilter?: (filter: SearchFilter) => void;
}

const SearchBarContext = createContext<SearchBarContextValue | null>(null);

export const useSearchBar = () => use(SearchBarContext);

const SearchBarProvider = ({
  children,
  onActivate,
  onToggleFilter,
}: SearchBarProviderProps) => {
  const [isActive, setIsActive] = useState(false);
  const [searchText, setSearchText] = useState("");
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
      actions: { activate, deactivate, setSearchText },
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
      state: { isActive, searchText },
      submitRef,
    }),
    [activate, deactivate, isActive, searchText, enrichedSearch]
  );

  return <SearchBarContext value={value}>{children}</SearchBarContext>;
};

// --- Frame ---

const SearchBarFrame = ({ children }: { children: React.ReactNode }) => {
  const config = use(LauncherConfigContext);
  const ctx = use(SearchBarContext);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  return (
    <View className="absolute left-4 right-4 z-50" style={framePosition}>
      {children}
    </View>
  );
};

// --- Icon ---

const SearchBarIcon = () => (
  <View className="items-center w-7">
    <Icon name={ICON_MAP.search} size={20} />
  </View>
);

// --- Input (EnrichedTextInput) ---

const SearchBarInput = () => {
  const ctx = use(SearchBarContext);
  const foreground = useThemeColor("foreground");
  const accent = useThemeColor("accent");

  if (!ctx) {
    return null;
  }

  const { actions, meta, enriched, submitRef } = ctx;

  const handleFocus = () => actions.activate();

  const handleChangeText = (e: NativeSyntheticEvent<OnChangeTextEvent>) => {
    actions.setSearchText(e.nativeEvent.value);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<{ key: string }>) => {
    if (e.nativeEvent.key === "Enter") {
      submitRef.current?.();
    }
  };

  return (
    <View className="flex-1 justify-center" style={{ minHeight: 44 }}>
      <EnrichedTextInput
        ref={meta.enrichedRef}
        autoCapitalize="none"
        mentionIndicators={["@", "#", ":", "/"]}
        placeholder="Search"
        placeholderTextColor="#9ca3af"
        onFocus={handleFocus}
        onChangeText={handleChangeText}
        onKeyPress={handleKeyPress}
        onStartMention={enriched.onStartMention}
        onChangeMention={enriched.onChangeMention}
        onEndMention={enriched.onEndMention}
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
          color: foreground as string,
          flex: 1,
          fontSize: 16,
          minHeight: 44,
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
            className="h-9 w-9 items-center justify-center"
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

  if (!ctx || !ctx.enriched.activeTrigger) {
    return null;
  }

  const handleSelect = (suggestion: Suggestion) => {
    const ref = ctx.meta.enrichedRef.current;
    if (!ref) {
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
        ctx.actions.setSearchText("");
      },
      toggleFilter: (filter: SearchFilter) => {
        ctx.filterToggleRef.current?.(filter);
      },
    };

    ctx.enriched.onSelectSuggestion(suggestion, callbacks);
  };

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
