import { useRouter } from "expo-router";
import { use, useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LauncherConfigContext } from "@/context/launcher-config";

import { Icon, ICON_MAP } from "./ui/icon";

interface MenuItem {
  handlePress: () => void;
  iconName: keyof typeof ICON_MAP;
  label: string;
}

interface TriggerBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

const MENU_WIDTH = 200;
const MENU_OFFSET = 8;
const SCREEN_MARGIN = 16;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const PopupMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerBounds, setTriggerBounds] = useState<TriggerBounds | null>(
    null
  );
  const router = useRouter();
  const config = use(LauncherConfigContext);
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const triggerRef = useRef<View | null>(null);

  const isSearchBarTop = config?.state.searchBarPosition === "top";

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOpen = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerBounds({ height, width, x, y });
      setIsOpen(true);
    });
  }, []);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
      return;
    }

    handleOpen();
  }, [handleClose, handleOpen, isOpen]);

  const handleWallpaperPress = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleSettingsPress = useCallback(() => {
    handleClose();
    requestAnimationFrame(() => {
      router.push("/settings");
    });
  }, [handleClose, router]);

  const handleHelpPress = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const items = useMemo<MenuItem[]>(
    () => [
      {
        handlePress: handleWallpaperPress,
        iconName: "wallpaper",
        label: "Wallpaper",
      },
      {
        handlePress: handleSettingsPress,
        iconName: "settings",
        label: "Settings",
      },
      {
        handlePress: handleHelpPress,
        iconName: "help",
        label: "Help",
      },
    ],
    [handleHelpPress, handleSettingsPress, handleWallpaperPress]
  );

  const menuPosition = useMemo(() => {
    if (!triggerBounds) {
      return null;
    }

    const left = clamp(
      triggerBounds.x + triggerBounds.width - MENU_WIDTH,
      SCREEN_MARGIN,
      screenWidth - MENU_WIDTH - SCREEN_MARGIN
    );

    if (isSearchBarTop) {
      return {
        left,
        top: clamp(
          triggerBounds.y + triggerBounds.height + MENU_OFFSET,
          insets.top + SCREEN_MARGIN,
          screenHeight - insets.bottom - 220
        ),
      };
    }

    return {
      bottom: clamp(
        screenHeight - triggerBounds.y + MENU_OFFSET,
        insets.bottom + SCREEN_MARGIN,
        screenHeight - insets.top - 220
      ),
      left,
    };
  }, [
    insets.bottom,
    insets.top,
    isSearchBarTop,
    screenHeight,
    screenWidth,
    triggerBounds,
  ]);

  return (
    <>
      <Pressable
        ref={triggerRef}
        className="h-10 w-10 items-center justify-center"
        hitSlop={8}
        onPress={handleToggle}
      >
        <Icon name="ellipsis-vertical" size={20} />
      </Pressable>

      <Modal
        animationType="none"
        onRequestClose={handleClose}
        presentationStyle="overFullScreen"
        statusBarTranslucent={Platform.OS === "android"}
        transparent
        visible={isOpen}
      >
        <View className="flex-1">
          <Pressable className="absolute inset-0" onPress={handleClose} />

          {menuPosition ? (
            <Animated.View
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(100)}
              className="absolute z-50 min-w-[180px] rounded-xl border border-border bg-card py-1"
              style={[
                menuPosition,
                {
                  shadowColor: "#000",
                  shadowOffset: { height: 10, width: 0 },
                  shadowOpacity: 0.16,
                  shadowRadius: 20,
                  width: MENU_WIDTH,
                },
              ]}
            >
              {items.map((item) => (
                <Pressable
                  key={item.label}
                  className="flex-row items-center gap-3 px-4 py-3"
                  onPress={item.handlePress}
                >
                  <Icon name={ICON_MAP[item.iconName]} size={20} />
                  <Text className="flex-1 text-base text-foreground">
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </>
  );
};
