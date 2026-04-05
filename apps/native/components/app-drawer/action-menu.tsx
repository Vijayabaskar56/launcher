import { BlurView } from "expo-blur";
import { Separator } from "heroui-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, ICON_MAP } from "../ui/icon";
import { ActionToolbar } from "./action-toolbar";
import type { DrawerActionMenuState, DrawerApp, ToolbarAction } from "./types";

const OverflowActionRow = ({
  action,
  onClose,
}: {
  action: ToolbarAction;
  onClose: () => void;
}) => {
  const hasChildren = "children" in action;
  const isDestructive = "destructive" in action && action.destructive;

  const handlePress = useCallback(() => {
    onClose();
    if (!hasChildren) {
      action.onPress();
    }
  }, [action, hasChildren, onClose]);

  return (
    <Pressable
      accessibilityLabel={action.label}
      className="flex-row items-center gap-3 px-4 py-3"
      onPress={handlePress}
    >
      <Icon name={ICON_MAP[action.icon]} size={20} />
      <Text
        className={`flex-1 text-[15px] font-medium ${
          isDestructive ? "text-danger" : "text-foreground"
        }`}
      >
        {action.label}
      </Text>
      {hasChildren ? <Icon name={ICON_MAP.chevronRight} size={16} /> : null}
    </Pressable>
  );
};

interface AppDrawerActionMenuProps {
  app: DrawerApp | null;
  menuState: DrawerActionMenuState | null;
  onClose: () => void;
  onOpenRename: () => void;
  onOpenTags: () => void;
  onTogglePinned: () => void;
}

interface CardPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

const ANIMATION_DURATION = 240;
const CARD_HORIZONTAL_MARGIN = 12;
const CARD_ESTIMATED_HEIGHT = 240;
const SCREEN_MARGIN = 8;
const SCRIM_OPACITY = 0.38;
const CARD_EASING = Easing.out(Easing.cubic);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const AppDrawerActionMenu = ({
  app,
  menuState,
  onClose,
  onOpenRename,
  onOpenTags,
  onTogglePinned,
}: AppDrawerActionMenuProps) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [activeSnapshot, setActiveSnapshot] = useState<{
    app: DrawerApp;
    menuState: DrawerActionMenuState;
  } | null>(null);
  const [cardHeight, setCardHeight] = useState(CARD_ESTIMATED_HEIGHT);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const closeReasonRef = useRef<"internal" | "external">("external");
  const pendingActionRef = useRef<(() => void) | null>(null);
  const menuKey =
    app && menuState
      ? `${app.packageName}:${menuState.triggerBounds.x}:${menuState.triggerBounds.y}:${menuState.triggerBounds.width}:${menuState.triggerBounds.height}`
      : null;

  const finalizeClose = useCallback(() => {
    setActiveSnapshot(null);
    setCardHeight(CARD_ESTIMATED_HEIGHT);
    setIsOverflowOpen(false);
    if (closeReasonRef.current === "internal") {
      const pendingAction = pendingActionRef.current;
      pendingActionRef.current = null;
      pendingAction?.();
      onClose();
      return;
    }

    pendingActionRef.current = null;
  }, [onClose]);

  const animateClosed = useCallback(
    (reason: "internal" | "external") => {
      closeReasonRef.current = reason;
      progress.value = withTiming(
        0,
        { duration: ANIMATION_DURATION - 40, easing: CARD_EASING },
        (finished) => {
          if (finished) {
            runOnJS(finalizeClose)();
          }
        }
      );
    },
    [finalizeClose, progress]
  );

  useEffect(() => {
    if (!app || !menuState || !menuKey) {
      return;
    }

    closeReasonRef.current = "external";
    pendingActionRef.current = null;
    setActiveSnapshot((current) => {
      if (
        current?.app.packageName === app.packageName &&
        current.menuState.triggerBounds.x === menuState.triggerBounds.x &&
        current.menuState.triggerBounds.y === menuState.triggerBounds.y &&
        current.menuState.triggerBounds.width ===
          menuState.triggerBounds.width &&
        current.menuState.triggerBounds.height ===
          menuState.triggerBounds.height
      ) {
        return current;
      }

      return { app, menuState };
    });
    setCardHeight(CARD_ESTIMATED_HEIGHT);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: CARD_EASING,
    });
  }, [app, menuKey, menuState, progress]);

  useEffect(() => {
    if (menuKey || !activeSnapshot) {
      return;
    }

    animateClosed("external");
  }, [activeSnapshot, animateClosed, menuKey]);

  const handleRequestClose = useCallback(
    (onAfterClose?: () => void) => {
      if (!activeSnapshot) {
        return;
      }

      pendingActionRef.current = onAfterClose ?? null;
      animateClosed("internal");
    },
    [activeSnapshot, animateClosed]
  );

  const handleBackdropPress = useCallback(() => {
    setIsOverflowOpen(false);
    handleRequestClose();
  }, [handleRequestClose]);

  const handleLaunch = useCallback(() => {
    handleRequestClose();
  }, [handleRequestClose]);

  const handleAppInfo = useCallback(() => {
    handleRequestClose();
  }, [handleRequestClose]);

  const handleShareStore = useCallback(() => {
    handleRequestClose();
  }, [handleRequestClose]);

  const handleShareApk = useCallback(() => {
    handleRequestClose();
  }, [handleRequestClose]);

  const handleUninstall = useCallback(() => {
    handleRequestClose();
  }, [handleRequestClose]);

  const handleTogglePinned = useCallback(() => {
    handleRequestClose(onTogglePinned);
  }, [handleRequestClose, onTogglePinned]);

  const handleOpenRename = useCallback(() => {
    handleRequestClose(onOpenRename);
  }, [handleRequestClose, onOpenRename]);

  const handleOpenTags = useCallback(() => {
    handleRequestClose(onOpenTags);
  }, [handleRequestClose, onOpenTags]);

  const actions = useMemo<ToolbarAction[]>(() => {
    if (!activeSnapshot) {
      return [];
    }

    return [
      {
        icon: activeSnapshot.app.isPinned ? "star" : "starOutline",
        id: "pin",
        label: activeSnapshot.app.isPinned
          ? "Remove from favorites"
          : "Add to favorites",
        onPress: handleTogglePinned,
      },
      {
        icon: "informationCircle",
        id: "info",
        label: "App info",
        onPress: handleAppInfo,
      },
      {
        icon: "open",
        id: "launch",
        label: "Launch",
        onPress: handleLaunch,
      },
      {
        icon: "pencil",
        id: "customize",
        label: "Rename",
        onPress: handleOpenRename,
      },
      {
        icon: "tag",
        id: "tags",
        label: "Tags",
        onPress: handleOpenTags,
      },
      {
        children: [
          {
            icon: "link",
            id: "share-store",
            label: "Store link",
            onPress: handleShareStore,
          },
          {
            icon: "download",
            id: "share-apk",
            label: "APK",
            onPress: handleShareApk,
          },
        ],
        icon: "share",
        id: "share",
        label: "Share",
      },
      {
        destructive: true,
        icon: "trash",
        id: "uninstall",
        label: "Uninstall",
        onPress: handleUninstall,
      },
    ];
  }, [
    activeSnapshot,
    handleAppInfo,
    handleLaunch,
    handleOpenRename,
    handleOpenTags,
    handleShareApk,
    handleShareStore,
    handleTogglePinned,
    handleUninstall,
  ]);

  const overflowActions = useMemo(() => actions.slice(3), [actions]);

  const handleMorePress = useCallback(() => {
    setIsOverflowOpen((prev) => !prev);
  }, []);

  const handleCloseOverflow = useCallback(() => {
    setIsOverflowOpen(false);
  }, []);

  const packageName = useMemo(() => {
    if (!activeSnapshot) {
      return "";
    }

    return activeSnapshot.app.packageName;
  }, [activeSnapshot]);

  const placement = useMemo<CardPlacement | null>(() => {
    if (!activeSnapshot) {
      return null;
    }

    const width = screenWidth - CARD_HORIZONTAL_MARGIN * 2;
    const minTop = insets.top + SCREEN_MARGIN;
    const maxTop = screenHeight - insets.bottom - cardHeight - SCREEN_MARGIN;
    const left = clamp(
      activeSnapshot.menuState.triggerBounds.x - CARD_HORIZONTAL_MARGIN,
      CARD_HORIZONTAL_MARGIN,
      screenWidth - width - CARD_HORIZONTAL_MARGIN
    );
    const top = clamp(
      activeSnapshot.menuState.triggerBounds.y +
        activeSnapshot.menuState.triggerBounds.height / 2 -
        cardHeight / 2,
      minTop,
      Math.max(minTop, maxTop)
    );

    return {
      height: cardHeight,
      left,
      top,
      width,
    };
  }, [
    activeSnapshot,
    cardHeight,
    insets.bottom,
    insets.top,
    screenHeight,
    screenWidth,
  ]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value * SCRIM_OPACITY,
  }));

  const cardStyle = useAnimatedStyle(() => {
    if (!activeSnapshot || !placement) {
      return { opacity: 0 };
    }

    const originCenterX =
      activeSnapshot.menuState.triggerBounds.x +
      activeSnapshot.menuState.triggerBounds.width / 2;
    const originCenterY =
      activeSnapshot.menuState.triggerBounds.y +
      activeSnapshot.menuState.triggerBounds.height / 2;
    const cardCenterX = placement.left + placement.width / 2;
    const cardCenterY = placement.top + cardHeight / 2;
    const collapsedScale = Math.max(
      0.82,
      Math.min(
        0.94,
        activeSnapshot.menuState.triggerBounds.width / placement.width
      )
    );
    const verticalProgress = progress.value * progress.value;

    return {
      opacity: progress.value,
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [originCenterX - cardCenterX, 0]
          ),
        },
        {
          translateY: interpolate(
            verticalProgress,
            [0, 1],
            [originCenterY - cardCenterY, 0]
          ),
        },
        {
          scale: interpolate(progress.value, [0, 1], [collapsedScale, 1]),
        },
      ],
    };
  }, [activeSnapshot, cardHeight, placement, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [0.5, 0.8, 1]),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.9, 1]),
      },
    ],
  }));

  const cardHeightRef = useRef(CARD_ESTIMATED_HEIGHT);
  const handleCardLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const nextHeight = event.nativeEvent.layout.height;
      if (Math.abs(nextHeight - cardHeightRef.current) > 1) {
        cardHeightRef.current = nextHeight;
        setCardHeight(nextHeight);
      }
    },
    []
  );

  if (!activeSnapshot || !placement) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={handleBackdropPress}
      presentationStyle="overFullScreen"
      statusBarTranslucent={Platform.OS === "android"}
      transparent
      visible
    >
      <View className="flex-1">
        <Animated.View
          className="absolute inset-0 bg-black"
          pointerEvents="none"
          style={scrimStyle}
        />

        <Pressable className="absolute inset-0" onPress={handleBackdropPress} />

        <Animated.View
          className="absolute overflow-hidden rounded-[30px] border border-white/15 bg-transparent"
          style={[
            {
              left: placement.left,
              shadowColor: "#000",
              shadowOffset: { height: 20, width: 0 },
              shadowOpacity: 0.42,
              shadowRadius: 42,
              top: placement.top,
              width: placement.width,
            },
            cardStyle,
          ]}
        >
          <BlurView
            intensity={36}
            style={{
              bottom: 0,
              left: 0,
              position: "absolute",
              right: 0,
              top: 0,
            }}
            tint="dark"
          />
          <View
            className="absolute inset-0"
            pointerEvents="none"
            style={{ backgroundColor: "rgba(30, 30, 30, 0.96)" }}
          />
          <View onLayout={handleCardLayout}>
            <View className="flex-row items-center gap-4 px-5 pb-4 pt-4">
              <View className="flex-1 gap-1">
                <Text
                  className="text-xl font-bold text-foreground"
                  numberOfLines={1}
                >
                  {activeSnapshot.app.displayLabel}
                </Text>
                <Text
                  className="text-[13px] leading-[18px] text-white/50"
                  numberOfLines={1}
                >
                  {packageName}
                </Text>
              </View>

              <Animated.View
                className="h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5"
                style={[{ overflow: "hidden" }, iconStyle]}
              >
                {activeSnapshot.app.icon ? (
                  <Image
                    source={{ uri: activeSnapshot.app.icon }}
                    style={{
                      borderRadius: 32,
                      height: 64,
                      width: 64,
                    }}
                  />
                ) : (
                  <Text className="text-2xl font-bold text-foreground">
                    {activeSnapshot.app.letter}
                  </Text>
                )}
                {activeSnapshot.app.isPinned ? (
                  <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Icon name={ICON_MAP.star} size={12} />
                  </View>
                ) : null}
              </Animated.View>
            </View>

            <Separator className="mx-4 bg-white/10" />

            <View className="px-3 pb-2 pt-1">
              <ActionToolbar
                actions={actions}
                onMorePress={handleMorePress}
                onRequestClose={handleBackdropPress}
              />
            </View>
          </View>
        </Animated.View>

        {isOverflowOpen ? (
          <>
            <Pressable
              className="absolute inset-0"
              onPress={handleCloseOverflow}
            />
            <Animated.View
              entering={FadeIn.duration(120)}
              exiting={FadeOut.duration(80)}
              className="absolute rounded-2xl border border-white/15 py-1"
              style={{
                backgroundColor: "rgba(30, 30, 30, 0.96)",
                boxShadow: "0px 12px 32px rgba(0, 0, 0, 0.5)",
                right: CARD_HORIZONTAL_MARGIN + 8,
                top: placement.top + cardHeight + 8,
                width: 200,
              }}
            >
              {overflowActions.map((action) => (
                <OverflowActionRow
                  key={action.id}
                  action={action}
                  onClose={handleCloseOverflow}
                />
              ))}
            </Animated.View>
          </>
        ) : null}
      </View>
    </Modal>
  );
};
