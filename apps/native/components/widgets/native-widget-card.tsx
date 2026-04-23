import { Card } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import type { NativeWidgetInfo, WidgetSize } from "@/context/widget-config";
import { WIDGET_SIZES } from "@/context/widget-config";

import { Icon, ICON_MAP } from "../ui/icon";

// Resolve at module scope — Metro caches require(), no repeated IPC
let ResolvedNativeView: React.ComponentType<Record<string, unknown>> | null =
  null;
try {
  // eslint-disable-next-line unicorn/prefer-module, node/global-require
  ResolvedNativeView = require("react-native-widget-host").NativeAppWidgetView;
} catch {
  // Module not available
}

interface NativeWidgetCardProps {
  widgetInfo: NativeWidgetInfo;
  size?: WidgetSize;
  opacity?: number;
  onRemove?: () => void;
}

const NativeWidgetCard = function NativeWidgetCard({
  widgetInfo,
  size = "large",
  opacity = 1,
  onRemove,
}: NativeWidgetCardProps) {
  const sizeConfig = WIDGET_SIZES[size];

  if (!ResolvedNativeView) {
    return (
      <Card
        variant="transparent"
        className="w-full rounded-2xl border border-border/40 p-4 items-center justify-center gap-3 bg-surface/70"
        style={{
          minHeight: sizeConfig.height,
          opacity,
        }}
      >
        <Icon name={ICON_MAP.warning} size={28} />
        <Text className="text-sm font-semibold text-foreground">
          App widget failed to load
        </Text>
        <View className="flex-row gap-3">
          {onRemove && (
            <Pressable
              onPress={onRemove}
              className="rounded-full px-5 py-2 bg-surface-secondary"
            >
              <Text className="text-sm font-semibold text-foreground">
                Remove
              </Text>
            </Pressable>
          )}
        </View>
      </Card>
    );
  }

  const AppWidgetView = ResolvedNativeView;

  return (
    <Card
      variant="transparent"
      className="w-full rounded-2xl border border-border/40 overflow-hidden bg-surface/70"
      style={{
        minHeight: sizeConfig.height,
        opacity,
      }}
    >
      <AppWidgetView
        appWidgetId={widgetInfo.appWidgetId}
        widgetWidth={-1}
        widgetHeight={sizeConfig.height}
        style={{ flex: 1, minHeight: sizeConfig.height }}
      />
    </Card>
  );
};

export { NativeWidgetCard };
