import { MaterialIcons } from "@expo/vector-icons";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useThemeColor } from "heroui-native";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";
import {
  GESTURE_ACTION_LABELS,
  getActionPermission,
} from "@/lib/gesture-actions";
import type { GestureAction } from "@/types/settings";

const ACTION_ICONS: Record<GestureAction, keyof typeof MaterialIcons.glyphMap> =
  {
    "app-drawer": "apps",
    "launch-app": "launch",
    "lock-screen": "lock",
    none: "block",
    notifications: "notifications",
    "power-menu": "power-settings-new",
    "quick-settings": "settings-suggest",
    recents: "history",
    search: "search",
    widgets: "widgets",
  };

interface ActionGroup {
  label: string;
  actions: GestureAction[];
}

const ACTION_GROUPS: ActionGroup[] = [
  {
    actions: ["search", "app-drawer", "widgets"],
    label: "Launcher pages",
  },
  {
    actions: [
      "notifications",
      "quick-settings",
      "lock-screen",
      "recents",
      "power-menu",
    ],
    label: "System actions",
  },
  {
    actions: ["launch-app"],
    label: "Apps and shortcuts",
  },
];

export interface GestureActionSheetHandle {
  dismiss: () => void;
  present: () => void;
}

interface GestureActionSheetProps {
  gestureLabel: string;
  currentAction: GestureAction;
  onSelect: (action: GestureAction) => void;
  onClose: () => void;
  onSelectLaunchApp: () => void;
}

export const GestureActionSheet = Object.assign(
  forwardRef<GestureActionSheetHandle, GestureActionSheetProps>(
    (
      { gestureLabel, currentAction, onSelect, onClose, onSelectLaunchApp },
      ref
    ) => {
      const sheetRef = useRef<TrueSheet>(null);
      const { fontFamily } = useThemeOverrides();
      const [foreground, muted] = useThemeColor([
        "foreground",
        "muted",
      ] as const);

      useImperativeHandle(ref, () => ({
        dismiss: () => sheetRef.current?.dismiss(),
        present: () => sheetRef.current?.present(),
      }));

      const handleSelect = useCallback(
        (action: GestureAction) => {
          if (action === "launch-app") {
            onSelectLaunchApp();
            return;
          }
          onSelect(action);
        },
        [onSelect, onSelectLaunchApp]
      );

      const renderActionRow = (action: GestureAction, isFirst = false) => {
        const permission = getActionPermission(action);
        const hasWarning = permission !== null;
        const iconName = ACTION_ICONS[action];
        const actionLabel = GESTURE_ACTION_LABELS[action];
        const isSelected = currentAction === action;

        return (
          <Pressable
            key={action}
            onPress={() => handleSelect(action)}
            style={({ pressed }) => ({
              alignItems: "center",
              borderCurve: "continuous",
              flexDirection: "row",
              gap: 14,
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: 16,
              paddingVertical: 13,
            })}
          >
            <MaterialIcons
              name={iconName}
              size={22}
              color={isFirst ? muted : foreground}
            />

            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  color: foreground,
                  fontFamily,
                  fontSize: 15,
                  fontWeight: isSelected ? "600" : "400",
                  letterSpacing: -0.1,
                }}
              >
                {actionLabel}
              </Text>
              {hasWarning ? (
                <Text
                  style={{
                    color: muted,
                    fontSize: 12,
                    letterSpacing: -0.1,
                  }}
                >
                  {permission.description}
                </Text>
              ) : null}
            </View>

            {hasWarning && (
              <MaterialIcons name="lock-outline" size={16} color={muted} />
            )}
            {!hasWarning && isSelected && (
              <MaterialIcons name="check" size={20} color={accent} />
            )}
          </Pressable>
        );
      };

      return (
        <TrueSheet
          ref={sheetRef}
          detents={[0.65, 0.88]}
          cornerRadius={28}
          grabber
          dimmed
          scrollable
          onDidDismiss={onClose}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                color: foreground,
                fontFamily,
                fontSize: 22,
                fontWeight: "700",
                letterSpacing: -0.3,
                paddingBottom: 4,
                paddingHorizontal: 20,
                paddingTop: 8,
              }}
            >
              {gestureLabel}
            </Text>

            {renderActionRow("none", true)}

            {ACTION_GROUPS.map((group) => (
              <View key={group.label}>
                <Text
                  style={{
                    color: muted,
                    fontFamily,
                    fontSize: 13,
                    fontWeight: "600",
                    letterSpacing: 0.5,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                  }}
                >
                  {group.label}
                </Text>

                {group.actions.map((action) => renderActionRow(action))}
              </View>
            ))}
          </ScrollView>
        </TrueSheet>
      );
    }
  ),
  { displayName: "GestureActionSheet" }
);
