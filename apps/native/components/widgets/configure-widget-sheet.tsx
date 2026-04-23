import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Button } from "heroui-native";
import { use, useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import {
  WidgetConfigContext,
  WIDGET_LABELS,
  WIDGET_ICONS,
  isNativeWidgetId,
} from "@/context/widget-config";
import type { WidgetId, WidgetSize } from "@/context/widget-config";

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
      className={`flex-1 items-center justify-center rounded-xl py-4 border ${
        isActive
          ? "bg-surface-secondary border-border"
          : "bg-surface/50 border-border/40"
      }`}
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
  const sheetRef = useRef<TrueSheet>(null);
  const widgetConfig = use(WidgetConfigContext);
  const isNative = isNativeWidgetId(widgetId);
  const widgetLabel = isNative
    ? (widgetConfig?.state.nativeWidgets[widgetId]?.label ?? "Widget")
    : WIDGET_LABELS[widgetId];
  const widgetIcon = isNative
    ? ICON_MAP.grid
    : ICON_MAP[WIDGET_ICONS[widgetId]];

  const handleDoneClose = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.45]}
      initialDetentIndex={0}
      cornerRadius={28}
      grabber
      dimmed
      onDidDismiss={onClose}
    >
      <View className="flex-1 px-4 gap-5 pt-2 pb-6">
        <View className="flex-row items-center justify-center gap-2">
          <IconAccent name={widgetIcon} size={22} />
          <Text className="text-lg font-bold text-foreground">
            {widgetLabel}
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
          onPress={handleDoneClose}
          className="mx-4 rounded-full"
        >
          <Button.Label>Done</Button.Label>
        </Button>
      </View>
    </TrueSheet>
  );
};

export { ConfigureWidgetSheet };
