# Launcher UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Android launcher UI with a floating search bar, gesture-driven app drawer, dock, clock, settings persistence, and configurable layout.

**Architecture:** Single full-screen route with Reanimated-driven pan gesture to animate an app drawer in/out. Search bar compound component (composition pattern) with context-based state. Config persisted via expo-secure-store, provided via React Context.

**Tech Stack:** Expo Router (Stack), react-native-reanimated, react-native-gesture-handler, react-native-unistyles v3, expo-secure-store

---

### Task 1: Clean Up Old Routes & Create New Structure

**Files:**

- Delete: `app/(drawer)/` (entire directory)
- Delete: `app/modal.tsx`
- Delete: `components/header-button.tsx`
- Delete: `components/tabbar-icon.tsx`
- Modify: `app/_layout.tsx`
- Create: `app/index.tsx` (launcher home)
- Create: `app/settings.tsx` (settings screen)

**Step 1: Delete old files**

Remove `app/(drawer)/`, `app/modal.tsx`, `components/header-button.tsx`, `components/tabbar-icon.tsx`.

**Step 2: Rewrite `app/_layout.tsx`**

```tsx
import "../unistyles";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LauncherConfigProvider } from "@/context/launcher-config";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LauncherConfigProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: true,
              title: "Settings",
              presentation: "card",
            }}
          />
        </Stack>
      </LauncherConfigProvider>
    </GestureHandlerRootView>
  );
}
```

**Step 3: Create placeholder `app/index.tsx`**

```tsx
import { View, Text } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Launcher Home</Text>
    </View>
  );
}
```

**Step 4: Create placeholder `app/settings.tsx`**

```tsx
import { View, Text } from "react-native";

export default function Settings() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Settings</Text>
    </View>
  );
}
```

**Step 5: Verify app builds and runs**

Run: `npx expo start --clear`

**Step 6: Commit**

```
feat: replace drawer/tabs with single launcher route structure
```

---

### Task 2: Launcher Config Context + Persistence

**Files:**

- Create: `context/launcher-config.tsx`

**Step 1: Create the config context with expo-secure-store persistence**

```tsx
import { createContext, useCallback, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

type SearchBarPosition = "top" | "bottom";

type LauncherConfig = {
  searchBarPosition: SearchBarPosition;
  gridColumns: number;
};

type LauncherConfigContextValue = {
  state: LauncherConfig;
  actions: {
    setSearchBarPosition: (position: SearchBarPosition) => void;
    setGridColumns: (columns: number) => void;
  };
};

const STORAGE_KEY = "launcher-config";

const defaultConfig: LauncherConfig = {
  searchBarPosition: "bottom",
  gridColumns: 6,
};

export const LauncherConfigContext =
  createContext<LauncherConfigContextValue | null>(null);

export function LauncherConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<LauncherConfig>(defaultConfig);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) {
        setConfig({ ...defaultConfig, ...JSON.parse(stored) });
      }
      setLoaded(true);
    };
    load();
  }, []);

  const persist = useCallback((next: LauncherConfig) => {
    setConfig(next);
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setSearchBarPosition = useCallback(
    (position: SearchBarPosition) => {
      persist({ ...config, searchBarPosition: position });
    },
    [config, persist]
  );

  const setGridColumns = useCallback(
    (columns: number) => {
      persist({ ...config, gridColumns: columns });
    },
    [config, persist]
  );

  if (!loaded) return null;

  return (
    <LauncherConfigContext
      value={{
        state: config,
        actions: { setSearchBarPosition, setGridColumns },
      }}
    >
      {children}
    </LauncherConfigContext>
  );
}
```

**Step 2: Commit**

```
feat: add launcher config context with secure store persistence
```

---

### Task 3: App Icon Component

**Files:**

- Create: `components/app-icon.tsx`

**Step 1: Build the placeholder icon component**

```tsx
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type AppIconProps = {
  letter: string;
  label: string;
  size?: number;
};

export function AppIcon({ letter, label, size = 56 }: AppIconProps) {
  return (
    <View style={styles.container}>
      <View style={styles.circle(size)}>
        <Text style={styles.letter(size)}>{letter}</Text>
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    gap: 4,
  },
  circle: (size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous" as const,
  }),
  letter: (size: number) => ({
    fontSize: size * 0.4,
    fontWeight: "600",
    color: theme.colors.secondaryForeground,
  }),
  label: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foreground,
    width: 64,
    textAlign: "center",
  },
}));
```

**Step 2: Commit**

```
feat: add app icon placeholder component
```

---

### Task 4: Clock Display Component

**Files:**

- Create: `components/clock-display.tsx`

**Step 1: Build the clock component**

```tsx
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export function ClockDisplay() {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <Text style={styles.time}>10:06</Text>
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitle}>In 6 hours</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    gap: 8,
  },
  time: {
    fontSize: 72,
    fontWeight: "200",
    color: theme.colors.foreground,
    fontVariant: ["tabular-nums"],
    letterSpacing: -2,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
}));
```

**Step 2: Commit**

```
feat: add clock display component
```

---

### Task 5: Dock Row Component

**Files:**

- Create: `components/dock-row.tsx`

**Step 1: Build the dock**

```tsx
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { AppIcon } from "./app-icon";

const DOCK_ITEMS = [
  { letter: "P", label: "Phone" },
  { letter: "T", label: "Tasks" },
  { letter: "C", label: "Camera" },
  { letter: "B", label: "Browser" },
  { letter: "M", label: "Messages" },
];

export function DockRow() {
  return (
    <View style={styles.dock}>
      {DOCK_ITEMS.map((item) => (
        <AppIcon
          key={item.letter}
          letter={item.letter}
          label={item.label}
          size={52}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  dock: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
}));
```

**Step 2: Commit**

```
feat: add dock row component
```

---

### Task 6: Popup Menu Component

**Files:**

- Create: `components/popup-menu.tsx`

**Step 1: Build the three-dot dropdown**

```tsx
import { use, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type MenuItem = {
  icon: string;
  label: string;
  onPress: () => void;
};

export function PopupMenu() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const items: MenuItem[] = [
    { icon: "🖼", label: "Wallpaper", onPress: () => setVisible(false) },
    {
      icon: "⚙",
      label: "Settings",
      onPress: () => {
        setVisible(false);
        router.push("/settings");
      },
    },
    { icon: "❓", label: "Help", onPress: () => setVisible(false) },
  ];

  return (
    <View>
      <Pressable
        onPress={() => setVisible(!visible)}
        style={styles.trigger}
        hitSlop={8}
      >
        <Text style={styles.triggerText}>⋮</Text>
      </Pressable>

      {visible && (
        <>
          <Pressable style={styles.overlay} onPress={() => setVisible(false)} />
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={styles.menu}
          >
            {items.map((item) => (
              <Pressable
                key={item.label}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  trigger: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerText: {
    fontSize: 20,
    color: theme.colors.foreground,
    fontWeight: "bold",
  },
  overlay: {
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 998,
  },
  menu: {
    position: "absolute",
    top: 44,
    right: 0,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 4,
    minWidth: 180,
    zIndex: 999,
    borderCurve: "continuous" as const,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabel: {
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
}));
```

**Step 2: Commit**

```
feat: add popup menu component
```

---

### Task 7: Search Bar Compound Component

**Files:**

- Create: `components/search-bar.tsx`

Uses composition pattern: SearchBar is a compound component with context for active/inactive state.

**Step 1: Build the search bar**

```tsx
import { createContext, use, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LauncherConfigContext } from "@/context/launcher-config";
import { PopupMenu } from "./popup-menu";

type SearchBarContextValue = {
  state: { isActive: boolean; query: string };
  actions: {
    activate: () => void;
    deactivate: () => void;
    setQuery: (q: string) => void;
  };
  meta: { inputRef: React.RefObject<TextInput | null> };
};

const SearchBarContext = createContext<SearchBarContextValue | null>(null);

function SearchBarProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  const activate = () => {
    setIsActive(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const deactivate = () => {
    setIsActive(false);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <SearchBarContext
      value={{
        state: { isActive, query },
        actions: { activate, deactivate, setQuery },
        meta: { inputRef },
      }}
    >
      {children}
    </SearchBarContext>
  );
}

function SearchBarFrame({ children }: { children: React.ReactNode }) {
  const config = use(LauncherConfigContext);
  if (!config) return null;

  const isTop = config.state.searchBarPosition === "top";

  return (
    <View style={[styles.frame, isTop ? styles.frameTop : styles.frameBottom]}>
      <View style={styles.bar}>{children}</View>
    </View>
  );
}

function SearchBarInput() {
  const ctx = use(SearchBarContext);
  if (!ctx) return null;

  const { state, actions, meta } = ctx;

  if (state.isActive) {
    return (
      <TextInput
        ref={meta.inputRef}
        style={styles.input}
        value={state.query}
        onChangeText={actions.setQuery}
        placeholder="Search"
        placeholderTextColor={styles.placeholderColor}
        onBlur={actions.deactivate}
        autoCorrect={false}
      />
    );
  }

  return (
    <Pressable onPress={actions.activate} style={styles.inputPlaceholder}>
      <Text style={styles.placeholderText}>Search</Text>
    </Pressable>
  );
}

function SearchBarIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.searchIcon}>🔍</Text>
    </View>
  );
}

function SearchBarActions() {
  const ctx = use(SearchBarContext);
  if (!ctx) return null;

  return (
    <View style={styles.actionsRow}>
      {ctx.state.isActive && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={styles.activeIcons}
        >
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionIcon}>👁</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionIcon}>⏏</Text>
          </Pressable>
        </Animated.View>
      )}
      <PopupMenu />
    </View>
  );
}

export const SearchBar = {
  Provider: SearchBarProvider,
  Frame: SearchBarFrame,
  Icon: SearchBarIcon,
  Input: SearchBarInput,
  Actions: SearchBarActions,
};

const styles = StyleSheet.create((theme, rt) => ({
  frame: {
    position: "absolute",
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 999,
  },
  frameTop: {
    top: rt.insets.top + 8,
  },
  frameBottom: {
    bottom: rt.insets.bottom + 8,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 52,
    gap: 8,
    borderCurve: "continuous" as const,
  },
  iconContainer: {
    width: 28,
    alignItems: "center",
  },
  searchIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    height: 48,
    padding: 0,
  },
  inputPlaceholder: {
    flex: 1,
    justifyContent: "center",
    height: 48,
  },
  placeholderText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.mutedForeground,
    fontWeight: "500",
  },
  placeholderColor: theme.colors.mutedForeground,
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activeIcons: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIcon: {
    fontSize: 16,
  },
}));
```

**Step 2: Commit**

```
feat: add search bar compound component with composition pattern
```

---

### Task 8: App Drawer Component with Gesture

**Files:**

- Create: `components/app-drawer.tsx`

**Step 1: Build the animated drawer with pan gesture and FlatList**

```tsx
import { use, useCallback } from "react";
import { FlatList, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";
import { LauncherConfigContext } from "@/context/launcher-config";
import { AppIcon } from "./app-icon";

const SPRING_CONFIG = { damping: 20, stiffness: 200 };

const MOCK_APPS = Array.from({ length: 60 }, (_, i) => {
  const letter = String.fromCharCode(65 + (i % 26));
  const suffix = i >= 26 ? `${Math.floor(i / 26) + 1}` : "";
  return { id: `app-${i}`, letter, label: `App ${letter}${suffix}` };
});

type AppDrawerProps = {
  translateY: Animated.SharedValue<number>;
};

export function AppDrawer({ translateY }: AppDrawerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const config = use(LauncherConfigContext);
  const columns = config?.state.gridColumns ?? 6;
  const scrollOffset = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(translateY.value, [screenHeight, 0], [0, 1]),
  }));

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scrollOffset.value <= 0 && e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > screenHeight * 0.25 || e.velocityY > 500) {
        translateY.value = withSpring(screenHeight, SPRING_CONFIG);
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    })
    .activeOffsetY(10);

  const renderItem = useCallback(
    ({ item }: { item: (typeof MOCK_APPS)[0] }) => (
      <View style={styles.gridItem(columns)}>
        <AppIcon letter={item.letter} label={item.label} />
      </View>
    ),
    [columns]
  );

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.drawer, animatedStyle]}>
        <FlatList
          data={MOCK_APPS}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          key={`grid-${columns}`}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            scrollOffset.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    paddingTop: rt.insets.top + 68,
    paddingBottom: rt.insets.bottom + 68,
  },
  grid: {
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  gridItem: (columns: number) => ({
    flex: 1 / columns,
    alignItems: "center" as const,
    paddingVertical: theme.spacing.sm,
  }),
}));
```

**Step 2: Commit**

```
feat: add app drawer with pan gesture and animated transitions
```

---

### Task 9: Launcher Home Screen (Wire Everything Together)

**Files:**

- Modify: `app/index.tsx`

**Step 1: Build the full home screen**

```tsx
import { use } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";
import { LauncherConfigContext } from "@/context/launcher-config";
import { SearchBar } from "@/components/search-bar";
import { ClockDisplay } from "@/components/clock-display";
import { DockRow } from "@/components/dock-row";
import { AppDrawer } from "@/components/app-drawer";

const SPRING_CONFIG = { damping: 20, stiffness: 200 };

export default function Home() {
  const { height: screenHeight } = useWindowDimensions();
  const drawerTranslateY = useSharedValue(screenHeight);
  const config = use(LauncherConfigContext);
  const isTop = config?.state.searchBarPosition === "top";

  const openDrawer = () => {
    drawerTranslateY.value = withSpring(0, SPRING_CONFIG);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        drawerTranslateY.value = screenHeight + e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -screenHeight * 0.2 || e.velocityY < -500) {
        drawerTranslateY.value = withSpring(0, SPRING_CONFIG);
      } else {
        drawerTranslateY.value = withSpring(screenHeight, SPRING_CONFIG);
      }
    })
    .activeOffsetY(-10);

  const homeContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drawerTranslateY.value, [screenHeight, 0], [1, 0]),
  }));

  return (
    <View style={styles.screen}>
      <SearchBar.Provider>
        <SearchBar.Frame>
          <SearchBar.Icon />
          <SearchBar.Input />
          <SearchBar.Actions />
        </SearchBar.Frame>
      </SearchBar.Provider>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.homeContent, homeContentStyle]}>
          <View
            style={[
              styles.clockArea,
              isTop ? styles.clockAreaTop : styles.clockAreaBottom,
            ]}
          >
            <ClockDisplay />
          </View>
          <View
            style={[
              styles.dockArea,
              isTop ? styles.dockAreaTop : styles.dockAreaBottom,
            ]}
          >
            <DockRow />
          </View>
        </Animated.View>
      </GestureDetector>

      <AppDrawer translateY={drawerTranslateY} />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  homeContent: {
    flex: 1,
  },
  clockArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  clockAreaTop: {
    paddingTop: rt.insets.top + 80,
  },
  clockAreaBottom: {
    paddingTop: rt.insets.top + 20,
  },
  dockArea: {
    paddingHorizontal: theme.spacing.md,
  },
  dockAreaTop: {
    paddingBottom: rt.insets.bottom + 16,
  },
  dockAreaBottom: {
    paddingBottom: rt.insets.bottom + 72,
  },
}));
```

**Step 2: Commit**

```
feat: wire up launcher home screen with gesture-driven drawer
```

---

### Task 10: Settings Screen

**Files:**

- Modify: `app/settings.tsx`

**Step 1: Build settings with search bar position toggle and grid columns**

```tsx
import { use } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StyleSheet } from "react-native-unistyles";
import { LauncherConfigContext } from "@/context/launcher-config";

export default function Settings() {
  const config = use(LauncherConfigContext);
  if (!config) return null;

  const { state, actions } = config;

  return (
    <>
      <Stack.Screen options={{ title: "Settings", headerShown: true }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>Search Bar</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Position</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[
                styles.segment,
                state.searchBarPosition === "top" && styles.segmentActive,
              ]}
              onPress={() => actions.setSearchBarPosition("top")}
            >
              <Text
                style={[
                  styles.segmentText,
                  state.searchBarPosition === "top" && styles.segmentTextActive,
                ]}
              >
                Top
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segment,
                state.searchBarPosition === "bottom" && styles.segmentActive,
              ]}
              onPress={() => actions.setSearchBarPosition("bottom")}
            >
              <Text
                style={[
                  styles.segmentText,
                  state.searchBarPosition === "bottom" &&
                    styles.segmentTextActive,
                ]}
              >
                Bottom
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Grid</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Columns</Text>
          <View style={styles.segmentedControl}>
            {[4, 5, 6].map((col) => (
              <Pressable
                key={col}
                style={[
                  styles.segment,
                  state.gridColumns === col && styles.segmentActive,
                ]}
                onPress={() => actions.setGridColumns(col)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    state.gridColumns === col && styles.segmentTextActive,
                  ]}
                >
                  {col}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderCurve: "continuous" as const,
  },
  label: {
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    fontWeight: "500",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    fontWeight: "500",
  },
  segmentTextActive: {
    color: theme.colors.primaryForeground,
    fontWeight: "600",
  },
}));
```

**Step 2: Commit**

```
feat: add settings screen with search bar position and grid columns
```

---

### Task 11: Clean Up Unused Components & Final Polish

**Files:**

- Delete: `components/container.tsx` (no longer used)
- Verify: all imports resolve, no dead code

**Step 1: Remove unused container component**

**Step 2: Run `bun x ultracite fix` to format everything**

**Step 3: Final commit**

```
chore: remove unused components and format code
```
