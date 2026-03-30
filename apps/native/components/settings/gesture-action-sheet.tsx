import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";
import {
  GESTURE_ACTION_LABELS,
  getActionPermission,
} from "@/lib/gesture-actions";
import type { GestureAction, GestureKey } from "@/types/settings";

const GESTURE_ACTIONS: GestureAction[] = [
  "none",
  "notifications",
  "quick-settings",
  "lock-screen",
  "recents",
  "power-menu",
  "search",
  "widgets",
  "app-drawer",
  "launch-app",
];

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

interface GestureActionSheetProps {
  gestureKey: GestureKey | null;
  gestureLabel: string;
  currentAction: GestureAction;
  onSelect: (action: GestureAction) => void;
  onClose: () => void;
  onSelectLaunchApp: () => void;
}

export const GestureActionSheet = ({
  gestureKey,
  gestureLabel,
  currentAction,
  onSelect,
  onClose,
  onSelectLaunchApp,
}: GestureActionSheetProps) => {
  const { accentColor, fontFamily, smallRadius } = useThemeOverrides();
  const [foreground, muted, surface] = useThemeColor([
    "foreground",
    "muted",
    "surface",
  ] as const);

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

  return (
    <Modal
      visible={gestureKey !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          flex: 1,
          justifyContent: "center",
          padding: 32,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: surface,
            borderCurve: "continuous",
            borderRadius: 20,
            maxHeight: "80%",
            overflow: "hidden",
            width: "100%",
          }}
          onPress={() => {}}
        >
          <Text
            style={{
              color: foreground,
              fontFamily,
              fontSize: 20,
              fontWeight: "700",
              letterSpacing: -0.3,
              paddingBottom: 8,
              paddingHorizontal: 24,
              paddingTop: 24,
            }}
          >
            {gestureLabel}
          </Text>

          <ScrollView
            style={{ maxHeight: 450 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 8 }}
          >
            {GESTURE_ACTIONS.map((action) => {
              const isSelected = currentAction === action;
              const permission = getActionPermission(action);
              const hasWarning = permission !== null;
              const icon = ACTION_ICONS[action];
              const label = GESTURE_ACTION_LABELS[action];

              return (
                <Pressable
                  key={action}
                  onPress={() => handleSelect(action)}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    backgroundColor: isSelected
                      ? `${accentColor}15`
                      : "transparent",
                    borderCurve: "continuous",
                    borderRadius: smallRadius,
                    flexDirection: "row",
                    gap: 14,
                    opacity: pressed ? 0.7 : 1,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  })}
                >
                  {/* Radio circle */}
                  <View
                    style={{
                      alignItems: "center",
                      borderColor: isSelected ? accentColor : muted,
                      borderRadius: 12,
                      borderWidth: 2,
                      height: 24,
                      justifyContent: "center",
                      width: 24,
                    }}
                  >
                    {isSelected ? (
                      <View
                        style={{
                          backgroundColor: accentColor,
                          borderRadius: 6,
                          height: 12,
                          width: 12,
                        }}
                      />
                    ) : null}
                  </View>

                  {/* Icon */}
                  <MaterialIcons name={icon} size={20} color={foreground} />

                  {/* Label + warning */}
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
                      {label}
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

                  {/* Warning badge */}
                  {hasWarning ? (
                    <MaterialIcons
                      name="lock-outline"
                      size={16}
                      color={muted}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
