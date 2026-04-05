import { CloseButton } from "heroui-native";
import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { Icon, ICON_MAP } from "../ui/icon";
import type { ToolbarAction } from "./types";

interface ActionToolbarProps {
  actions: ToolbarAction[];
  onRequestClose: () => void;
  onMorePress: () => void;
}

const PRIMARY_ACTION_COUNT = 3;

const ToolbarButton = ({
  icon,
  label,
  onPress,
}: {
  icon: ToolbarAction["icon"];
  label: string;
  onPress: () => void;
}) => (
  <CloseButton onPress={onPress} accessibilityLabel={label}>
    <Icon name={ICON_MAP[icon]} size={22} />
  </CloseButton>
);

export const ActionToolbar = ({
  actions,
  onRequestClose,
  onMorePress,
}: ActionToolbarProps) => {
  const primaryActions = useMemo(
    () => actions.slice(0, PRIMARY_ACTION_COUNT),
    [actions]
  );
  const overflowActions = useMemo(
    () => actions.slice(PRIMARY_ACTION_COUNT),
    [actions]
  );

  const handleClosePress = useCallback(() => {
    onRequestClose();
  }, [onRequestClose]);

  const primaryButtonActions = useMemo(
    () =>
      primaryActions.map((action) => ({
        ...action,
        handleToolbarPress: () => {
          if ("children" in action) {
            return;
          }
          action.onPress();
        },
      })),
    [primaryActions]
  );

  return (
    <View className="flex-row items-center px-1 py-1">
      <ToolbarButton
        icon="chevronLeft"
        label="Close"
        onPress={handleClosePress}
      />

      <View className="flex-1" />

      {primaryButtonActions.map((action) => (
        <ToolbarButton
          key={action.id}
          icon={action.icon}
          label={action.label}
          onPress={action.handleToolbarPress}
        />
      ))}

      {overflowActions.length > 0 ? (
        <ToolbarButton
          icon="moreHorizontal"
          label="More"
          onPress={onMorePress}
        />
      ) : null}
    </View>
  );
};
