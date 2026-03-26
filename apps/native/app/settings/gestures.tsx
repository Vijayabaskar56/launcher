import { use, useCallback } from "react";
import { ScrollView } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SelectPreference } from "@/components/settings/select-preference";
import { SettingsContext } from "@/context/settings";
import type { GestureAction } from "@/types/settings";

const GESTURE_OPTIONS: { label: string; value: GestureAction }[] = [
  { label: "None", value: "none" },
  { label: "Search", value: "search" },
  { label: "Notifications", value: "notifications" },
  { label: "Quick Settings", value: "quick-settings" },
  { label: "App Drawer", value: "app-drawer" },
  { label: "Recents", value: "recents" },
  { label: "Power Menu", value: "power-menu" },
  { label: "Lock Screen", value: "lock-screen" },
];

export default function GesturesSettings() {
  const settings = use(SettingsContext);

  const handleSwipeDown = useCallback(
    (v: GestureAction) => {
      settings?.actions.updateGestures({ swipeDown: v });
    },
    [settings]
  );
  const handleSwipeUp = useCallback(
    (v: GestureAction) => {
      settings?.actions.updateGestures({ swipeUp: v });
    },
    [settings]
  );
  const handleSwipeLeft = useCallback(
    (v: GestureAction) => {
      settings?.actions.updateGestures({ swipeLeft: v });
    },
    [settings]
  );
  const handleSwipeRight = useCallback(
    (v: GestureAction) => {
      settings?.actions.updateGestures({ swipeRight: v });
    },
    [settings]
  );
  const handleDoubleTap = useCallback(
    (v: GestureAction) => {
      settings?.actions.updateGestures({ doubleTap: v });
    },
    [settings]
  );
  const handleLongPress = useCallback(
    (v: GestureAction) => {
      settings?.actions.updateGestures({ longPress: v });
    },
    [settings]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const { gestures } = state;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory title="Swipe Gestures">
        <SelectPreference
          icon="swipe-down"
          title="Swipe Down"
          value={gestures.swipeDown}
          options={GESTURE_OPTIONS}
          onValueChange={handleSwipeDown}
        />
        <SelectPreference
          icon="swipe-up"
          title="Swipe Up"
          value={gestures.swipeUp}
          options={GESTURE_OPTIONS}
          onValueChange={handleSwipeUp}
        />
        <SelectPreference
          icon="swipe-left"
          title="Swipe Left"
          value={gestures.swipeLeft}
          options={GESTURE_OPTIONS}
          onValueChange={handleSwipeLeft}
        />
        <SelectPreference
          icon="swipe-right"
          title="Swipe Right"
          value={gestures.swipeRight}
          options={GESTURE_OPTIONS}
          onValueChange={handleSwipeRight}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Tap Gestures">
        <SelectPreference
          icon="touch-app"
          title="Double Tap"
          value={gestures.doubleTap}
          options={GESTURE_OPTIONS}
          onValueChange={handleDoubleTap}
        />
        <SelectPreference
          title="Long Press"
          value={gestures.longPress}
          options={GESTURE_OPTIONS}
          onValueChange={handleLongPress}
        />
      </PreferenceCategory>
    </ScrollView>
  );
}
