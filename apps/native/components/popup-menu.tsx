import { useRouter } from "expo-router";
import { Menu } from "heroui-native";
import { useCallback } from "react";
import { Pressable } from "react-native";

import { Icon, ICON_MAP } from "./ui/icon";

export const PopupMenu = () => {
  const router = useRouter();

  const handleWallpaperPress = useCallback(() => {
    // noop placeholder
  }, []);

  const handleSettingsPress = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const handleHelpPress = useCallback(() => {
    // noop placeholder
  }, []);

  return (
    <Menu>
      <Menu.Trigger asChild>
        <Pressable className="h-6 w-6 items-center justify-center" hitSlop={12}>
          <Icon name="ellipsis-vertical" size={18} />
        </Pressable>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content
          presentation="popover"
          placement="top"
          align="end"
          width={200}
          className="bg-background/80 border border-border/40"
          style={{
            borderCurve: "continuous",
            borderRadius: 20,
            paddingHorizontal: 4,
            paddingVertical: 6,
          }}
        >
          <Menu.Item
            onPress={handleWallpaperPress}
            style={{ gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}
          >
            <Icon name={ICON_MAP.wallpaper} size={22} />
            <Menu.ItemTitle
              className="text-foreground"
              style={{ fontSize: 16 }}
            >
              Wallpaper
            </Menu.ItemTitle>
          </Menu.Item>
          <Menu.Item
            onPress={handleSettingsPress}
            style={{ gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}
          >
            <Icon name={ICON_MAP.settings} size={22} />
            <Menu.ItemTitle
              className="text-foreground"
              style={{ fontSize: 16 }}
            >
              Settings
            </Menu.ItemTitle>
          </Menu.Item>
          <Menu.Item
            onPress={handleHelpPress}
            style={{ gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}
          >
            <Icon name={ICON_MAP.help} size={22} />
            <Menu.ItemTitle
              className="text-foreground"
              style={{ fontSize: 16 }}
            >
              Help
            </Menu.ItemTitle>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
};
