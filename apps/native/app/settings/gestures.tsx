import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { use, useCallback, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import { AppPickerSheet } from "@/components/settings/app-picker-sheet";
import { GestureActionSheet } from "@/components/settings/gesture-action-sheet";
import type { GestureActionSheetHandle } from "@/components/settings/gesture-action-sheet";
import { PreferenceCategory } from "@/components/settings/preference-category";
import { AppListContext } from "@/context/app-list";
import { SettingsContext } from "@/context/settings";
import { useThemeOverrides } from "@/context/theme-overrides";
import { GESTURE_ACTION_LABELS } from "@/lib/gesture-actions";
import type { GestureAction, GestureKey } from "@/types/settings";

// --- Gesture row configuration ---

interface GestureRowConfig {
  key: GestureKey;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const SWIPE_GESTURES: GestureRowConfig[] = [
  { icon: "swipe-down", key: "swipeDown", label: "Swipe Down" },
  { icon: "swipe-up", key: "swipeUp", label: "Swipe Up" },
  { icon: "swipe-left", key: "swipeLeft", label: "Swipe Left" },
  { icon: "swipe-right", key: "swipeRight", label: "Swipe Right" },
];

const TAP_GESTURES: GestureRowConfig[] = [
  { icon: "touch-app", key: "doubleTap", label: "Double Tap" },
  { icon: "touch-app", key: "longPress", label: "Long Press" },
];

// --- Gesture Row Component ---

const GestureRow = ({
  config,
  currentAction,
  appLabel,
  appIcon,
  onPress,
}: {
  config: GestureRowConfig;
  currentAction: GestureAction;
  appLabel?: string;
  appIcon?: string;
  onPress: () => void;
}) => {
  const { fontFamily, smallRadius } = useThemeOverrides();
  const [foreground, muted, defaultBg] = useThemeColor([
    "foreground",
    "muted",
    "default",
  ] as const);

  const actionLabel =
    currentAction === "launch-app" && appLabel
      ? `Launch ${appLabel}`
      : GESTURE_ACTION_LABELS[currentAction];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        flexDirection: "row",
        gap: 14,
        opacity: pressed ? 0.7 : 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
      })}
    >
      {/* Icon */}
      <View
        style={{
          alignItems: "center",
          backgroundColor: defaultBg,
          borderCurve: "continuous",
          borderRadius: smallRadius,
          height: 40,
          justifyContent: "center",
          width: 40,
        }}
      >
        <MaterialIcons name={config.icon} size={22} color={foreground} />
      </View>

      {/* Title + subtitle */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: foreground,
            fontFamily,
            fontSize: 16,
            fontWeight: "500",
            letterSpacing: -0.2,
          }}
        >
          {config.label}
        </Text>
        <Text
          style={{
            color: muted,
            fontSize: 13,
            fontWeight: "400",
            letterSpacing: -0.1,
          }}
        >
          {actionLabel}
        </Text>
      </View>

      {/* App icon for launch-app */}
      {currentAction === "launch-app" && appIcon ? (
        <Image
          source={{ uri: appIcon }}
          style={{ borderRadius: 8, height: 32, width: 32 }}
        />
      ) : null}

      {/* Chevron */}
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </Pressable>
  );
};

// --- Main Screen ---

const renderGestureList = (
  gestures: Record<string, GestureAction>,
  configs: GestureRowConfig[],
  getAppInfo: (key: GestureKey) => { appIcon?: string; appLabel?: string },
  handleOpenSheet: (key: GestureKey, label: string) => void
) =>
  configs.map((config) => {
    const { appIcon, appLabel } = getAppInfo(config.key);
    return (
      <GestureRow
        key={config.key}
        config={config}
        currentAction={gestures[config.key] as GestureAction}
        appLabel={appLabel}
        appIcon={appIcon}
        onPress={() => handleOpenSheet(config.key, config.label)}
      />
    );
  });

export default function GesturesSettings() {
  const settings = use(SettingsContext);
  const appList = use(AppListContext);
  const actionSheetRef = useRef<GestureActionSheetHandle>(null);
  const [activeGestureKey, setActiveGestureKey] = useState<GestureKey | null>(
    null
  );
  const [activeGestureLabel, setActiveGestureLabel] = useState("");
  const [showAppPicker, setShowAppPicker] = useState(false);

  const handleOpenSheet = useCallback((key: GestureKey, label: string) => {
    setActiveGestureKey(key);
    setActiveGestureLabel(label);
    requestAnimationFrame(() => {
      actionSheetRef.current?.present();
    });
  }, []);

  const handleCloseSheet = useCallback(() => {
    actionSheetRef.current?.dismiss();
    setActiveGestureKey(null);
    setActiveGestureLabel("");
  }, []);

  const handleSelectAction = useCallback(
    (action: GestureAction) => {
      if (!settings || !activeGestureKey) {
        return;
      }
      settings.actions.updateGestures({ [activeGestureKey]: action });
      actionSheetRef.current?.dismiss();
      setActiveGestureKey(null);
      setActiveGestureLabel("");
    },
    [settings, activeGestureKey]
  );

  const handleSelectLaunchApp = useCallback(() => {
    setShowAppPicker(true);
  }, []);

  const handleAppSelected = useCallback(
    (packageName: string, label: string) => {
      if (!settings || !activeGestureKey) {
        return;
      }
      const currentBindings = settings.state.gestures.launchAppBindings;
      settings.actions.updateGestures({
        [activeGestureKey]: "launch-app",
        launchAppBindings: {
          ...currentBindings,
          [activeGestureKey]: { label, packageName },
        },
      });
      setShowAppPicker(false);
      handleCloseSheet();
    },
    [settings, activeGestureKey, handleCloseSheet]
  );

  const handleCloseAppPicker = useCallback(() => {
    setShowAppPicker(false);
  }, []);

  if (!settings) {
    return null;
  }

  const { gestures } = settings.state;

  const getAppInfo = (key: GestureKey) => {
    const binding = gestures.launchAppBindings[key];
    if (!binding) {
      return { appIcon: undefined, appLabel: undefined };
    }
    const app = appList.apps.find((a) => a.packageName === binding.packageName);
    return { appIcon: app?.icon ?? undefined, appLabel: binding.label };
  };

  const currentAction = activeGestureKey
    ? (gestures[activeGestureKey] as GestureAction)
    : "none";

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
      >
        <PreferenceCategory title="Swipe Gestures">
          {renderGestureList(
            gestures,
            SWIPE_GESTURES,
            getAppInfo,
            handleOpenSheet
          )}
        </PreferenceCategory>

        <PreferenceCategory title="Tap Gestures">
          {renderGestureList(
            gestures,
            TAP_GESTURES,
            getAppInfo,
            handleOpenSheet
          )}
        </PreferenceCategory>
      </ScrollView>

      <GestureActionSheet
        ref={actionSheetRef}
        gestureLabel={activeGestureLabel}
        currentAction={currentAction}
        onSelect={handleSelectAction}
        onClose={handleCloseSheet}
        onSelectLaunchApp={handleSelectLaunchApp}
      />

      <AppPickerSheet
        visible={showAppPicker}
        onSelect={handleAppSelected}
        onClose={handleCloseAppPicker}
      />
    </>
  );
}
