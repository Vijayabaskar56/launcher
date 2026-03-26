import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon, ICON_MAP } from "../ui/icon";
import type { ToolbarAction } from "./types";

interface ActionToolbarProps {
  actions: ToolbarAction[];
  onRequestClose: () => void;
}

const PRIMARY_ACTION_COUNT = 3;

const ToolbarButton = ({
  destructive = false,
  icon,
  label,
  onPress,
}: {
  destructive?: boolean;
  icon: ToolbarAction["icon"];
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={label}
    className="items-center gap-1.5"
    onPress={onPress}
  >
    <View
      className={`h-12 w-12 items-center justify-center rounded-full border ${
        destructive
          ? "border-danger/25 bg-danger/10"
          : "border-white/10 bg-white/6"
      }`}
    >
      <Icon name={ICON_MAP[icon]} size={20} />
    </View>
    <Text
      className={`text-[11px] font-medium ${
        destructive ? "text-danger" : "text-white/75"
      }`}
      numberOfLines={1}
    >
      {label}
    </Text>
  </Pressable>
);

export const ActionToolbar = ({
  actions,
  onRequestClose,
}: ActionToolbarProps) => {
  const [submenuStack, setSubmenuStack] = useState<ToolbarAction[][]>([]);

  const primaryActions = useMemo(
    () => actions.slice(0, PRIMARY_ACTION_COUNT),
    [actions]
  );
  const overflowActions = useMemo(
    () => actions.slice(PRIMARY_ACTION_COUNT),
    [actions]
  );
  const activeMenu = submenuStack.at(-1) ?? null;

  const openSubmenu = useCallback((nextActions: ToolbarAction[]) => {
    setSubmenuStack((current) => [...current, nextActions]);
  }, []);

  const handleMenuActionPress = useCallback(
    (action: ToolbarAction) => {
      if ("children" in action) {
        openSubmenu(action.children);
        return;
      }

      action.onPress();
      setSubmenuStack([]);
    },
    [openSubmenu]
  );

  const handleSubmenuBack = useCallback(() => {
    setSubmenuStack((current) => current.slice(0, -1));
  }, []);

  const handleClosePress = useCallback(() => {
    setSubmenuStack([]);
    onRequestClose();
  }, [onRequestClose]);

  const handleMorePress = useCallback(() => {
    if (overflowActions.length === 0) {
      return;
    }

    if (activeMenu) {
      setSubmenuStack([]);
      return;
    }

    openSubmenu(overflowActions);
  }, [activeMenu, openSubmenu, overflowActions]);

  const primaryButtonActions = useMemo(
    () =>
      primaryActions.map((action) => ({
        ...action,
        destructive: "destructive" in action && action.destructive,
        handleToolbarPress: () => {
          setSubmenuStack([]);
          handleMenuActionPress(action);
        },
      })),
    [handleMenuActionPress, primaryActions]
  );

  const submenuEntries = useMemo(
    () =>
      activeMenu?.map((action) => ({
        action,
        hasChildren: "children" in action,
        isDestructive: "destructive" in action && action.destructive,
        onPress: () => {
          handleMenuActionPress(action);
        },
      })) ?? [],
    [activeMenu, handleMenuActionPress]
  );

  return (
    <View className="gap-3">
      {activeMenu ? (
        <View className="rounded-3xl border border-white/10 bg-black/25 px-2 py-2">
          <View className="mb-1 flex-row items-center justify-between px-3 pb-1 pt-1">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-white/55">
              More actions
            </Text>
            <Pressable
              accessibilityLabel="Back to main actions"
              className="h-8 w-8 items-center justify-center rounded-full bg-white/8"
              onPress={handleSubmenuBack}
            >
              <Icon name={ICON_MAP.chevronLeft} size={18} />
            </Pressable>
          </View>

          {submenuEntries.map(
            ({ action, hasChildren, isDestructive, onPress }) => (
              <Pressable
                key={action.id}
                accessibilityLabel={action.label}
                className="flex-row items-center gap-3 rounded-2xl px-3 py-3"
                onPress={onPress}
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    isDestructive ? "bg-danger/15" : "bg-white/8"
                  }`}
                >
                  <Icon name={ICON_MAP[action.icon]} size={18} />
                </View>

                <Text
                  className={`flex-1 text-sm font-medium ${
                    isDestructive ? "text-danger" : "text-foreground"
                  }`}
                >
                  {action.label}
                </Text>

                {hasChildren ? (
                  <Icon name={ICON_MAP.chevronRight} size={18} />
                ) : null}
              </Pressable>
            )
          )}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between gap-2 rounded-[28px] border border-white/10 bg-black/20 px-3 py-2">
        <ToolbarButton
          icon="chevronLeft"
          label="Close"
          onPress={handleClosePress}
        />

        {primaryButtonActions.map((action) => (
          <ToolbarButton
            key={action.id}
            destructive={action.destructive}
            icon={action.icon}
            label={action.label}
            onPress={action.handleToolbarPress}
          />
        ))}

        <ToolbarButton
          icon="moreHorizontal"
          label="More"
          onPress={handleMorePress}
        />
      </View>
    </View>
  );
};
