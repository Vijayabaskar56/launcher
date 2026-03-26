import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LauncherConfigContext } from "@/context/launcher-config";

import { PopupMenu } from "./popup-menu";
import { Icon, ICON_MAP } from "./ui/icon";

interface SearchBarContextValue {
  state: { isActive: boolean; query: string };
  actions: {
    activate: () => void;
    deactivate: () => void;
    setQuery: (query: string) => void;
  };
  meta: { inputRef: React.RefObject<TextInput | null> };
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
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  const activate = useCallback(() => {
    setIsActive(true);
    onActivate?.();
  }, [onActivate]);

  const deactivate = useCallback(() => {
    setIsActive(false);
    setQuery("");
    inputRef.current?.blur();
  }, []);

  const value = useMemo(
    () => ({
      actions: { activate, deactivate, setQuery },
      meta: { inputRef },
      state: { isActive, query },
    }),
    [activate, deactivate, isActive, query]
  );

  return <SearchBarContext value={value}>{children}</SearchBarContext>;
};

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

  // When keyboard is open and search bar is at bottom, move above keyboard + filter bar (48px)
  const FILTER_BAR_HEIGHT = 48;
  const bottomOffset =
    isActive && keyboardHeight > 0
      ? keyboardHeight + FILTER_BAR_HEIGHT + 4
      : insets.bottom + 8;

  const framePosition = isTop
    ? { top: insets.top + 8 }
    : { bottom: bottomOffset };

  return (
    <View className="absolute left-4 right-4 z-50" style={framePosition}>
      <View className="flex-row items-center bg-card border border-border rounded-full h-[52px] px-3 gap-2">
        {children}
      </View>
    </View>
  );
};

const SearchBarIcon = () => (
  <View className="items-center w-7">
    <Icon name={ICON_MAP.search} size={20} />
  </View>
);

const SearchBarInput = () => {
  const ctx = use(SearchBarContext);

  if (!ctx) {
    return null;
  }

  const { actions, meta, state } = ctx;
  const handleChangeText = actions.setQuery;
  const handleFocus = actions.activate;

  return (
    <View className="flex-1 justify-center">
      <TextInput
        ref={meta.inputRef}
        autoCorrect={false}
        className="flex-1 text-base text-foreground h-12"
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        placeholder="Search"
        placeholderTextColor="#9ca3af"
        value={state.query}
      />
    </View>
  );
};

const SearchBarActions = () => {
  const ctx = use(SearchBarContext);

  const handleClear = useCallback(() => {
    ctx?.actions.setQuery("");
    ctx?.meta.inputRef.current?.focus();
  }, [ctx]);

  if (!ctx) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-1">
      {ctx.state.isActive && ctx.state.query.length > 0 ? (
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

export const SearchBar = {
  Actions: SearchBarActions,
  Frame: SearchBarFrame,
  Icon: SearchBarIcon,
  Input: SearchBarInput,
  Provider: SearchBarProvider,
};
