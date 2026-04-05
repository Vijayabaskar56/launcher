import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Button } from "heroui-native";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { WIDGET_LABELS, WIDGET_ICONS } from "@/context/widget-config";
import type { WidgetId, WidgetSize } from "@/context/widget-config";

import {
  SHEET_TRANSLUCENT_BACKGROUND,
  SHEET_TRANSLUCENT_HANDLE,
} from "../ui/bottom-sheet-styles";
import { IconAccent, ICON_MAP } from "../ui/icon";

const SizeOptionButton = ({
  isActive,
  label,
  onPress,
  value,
}: {
  isActive: boolean;
  label: string;
  onPress: (size: WidgetSize) => void;
  value: WidgetSize;
}) => {
  const handlePress = useCallback(() => {
    onPress(value);
  }, [onPress, value]);

  return (
    <Pressable
      onPress={handlePress}
      className="flex-1 items-center justify-center rounded-xl py-4"
      style={{
        backgroundColor: isActive
          ? "rgba(255,255,255,0.15)"
          : "rgba(255,255,255,0.05)",
        borderColor: isActive
          ? "rgba(255,255,255,0.3)"
          : "rgba(255,255,255,0.08)",
        borderWidth: 1,
      }}
    >
      <Text
        className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-foreground/50"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const SIZE_OPTIONS: { label: string; value: WidgetSize }[] = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
];

interface ConfigureWidgetSheetProps {
  widgetId: WidgetId;
  currentSize: WidgetSize;
  onSizeChange: (size: WidgetSize) => void;
  onClose: () => void;
}

const ConfigureWidgetSheet = function ConfigureWidgetSheet({
  widgetId,
  currentSize,
  onSizeChange,
  onClose,
}: ConfigureWidgetSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["45%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index < 0) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={SHEET_TRANSLUCENT_BACKGROUND}
      handleIndicatorStyle={SHEET_TRANSLUCENT_HANDLE}
    >
      <BottomSheetView className="flex-1 px-4 gap-5">
        <View className="flex-row items-center justify-center gap-2 pt-2">
          <IconAccent name={ICON_MAP[WIDGET_ICONS[widgetId]]} size={22} />
          <Text className="text-lg font-bold text-foreground">
            {WIDGET_LABELS[widgetId]}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-foreground/50 px-1">
            Size
          </Text>
          <View className="flex-row gap-3">
            {SIZE_OPTIONS.map((option) => (
              <SizeOptionButton
                key={option.value}
                isActive={currentSize === option.value}
                label={option.label}
                onPress={onSizeChange}
                value={option.value}
              />
            ))}
          </View>
        </View>

        <Button
          variant="secondary"
          onPress={onClose}
          className="mx-4 rounded-full"
        >
          <Button.Label>Done</Button.Label>
        </Button>
      </BottomSheetView>
    </BottomSheet>
  );
};

export { ConfigureWidgetSheet };
