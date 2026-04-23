import { Card } from "heroui-native";
import { memo, useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { DimensionValue } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { WIDGET_ICONS } from "@/context/widget-config";
import type { WidgetId } from "@/context/widget-config";

import { Icon, IconAccent, ICON_MAP } from "../ui/icon";

interface AppPreviewInfo {
  appName: string;
  icon: string | null;
  letter: string;
  packageName: string;
}

const CARD_BACKGROUND = "rgba(255,255,255,0.05)";
const PREVIEW_BACKGROUND = "rgba(255,255,255,0.04)";

const PreviewShell = memo(function PreviewShell({
  children,
  disabled = false,
  footer,
  onPress,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  footer?: React.ReactNode;
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  const pressStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => {
      let opacity = 1;

      if (disabled) {
        opacity = 0.45;
      } else if (pressed) {
        opacity = 0.82;
      }

      return { opacity };
    },
    [disabled]
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={pressStyle}
    >
      <Card
        className="overflow-hidden rounded-[28px] border border-white/8"
        variant="transparent"
        style={{ backgroundColor: CARD_BACKGROUND }}
      >
        <Card.Body className="gap-4 p-4">
          <View
            className="overflow-hidden rounded-[22px] border border-white/8 p-4"
            style={{ backgroundColor: PREVIEW_BACKGROUND, minHeight: 152 }}
          >
            {children}
          </View>

          <View className="gap-1">
            <Card.Title className="text-base font-semibold text-white">
              {title}
            </Card.Title>
            <Card.Description className="text-sm text-white/55">
              {subtitle}
            </Card.Description>
          </View>

          <View className="flex-row items-center justify-between">
            {footer ?? (
              <Text className="text-xs font-medium uppercase tracking-[1.4px] text-white/45">
                Tap to add
              </Text>
            )}
            <Icon name={ICON_MAP.add} size={18} />
          </View>
        </Card.Body>
      </Card>
    </Pressable>
  );
});

const SmallStat = ({ label, value }: { label: string; value: string }) => (
  <View className="gap-1">
    <Text className="text-[11px] uppercase tracking-[1.2px] text-white/35">
      {label}
    </Text>
    <Text className="text-sm font-semibold text-white/90">{value}</Text>
  </View>
);

const BUILTIN_ACCENTS: Record<WidgetId, string> = {
  battery: "#7FE27B",
  calendar: "#FF5F57",
  clock: "#9FC6FF",
  music: "#FF8FB1",
  weather: "#FDBA74",
};

const BuiltinWidgetPreviewCard = memo(function BuiltinWidgetPreviewCard({
  label,
  onPress,
  widgetId,
}: {
  label: string;
  onPress: () => void;
  widgetId: WidgetId;
}) {
  const accent = BUILTIN_ACCENTS[widgetId] ?? "#9FC6FF";

  const preview = (() => {
    switch (widgetId) {
      case "battery": {
        return (
          <View className="flex-1 justify-between">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-white/70">Battery</Text>
              <IconAccent name={ICON_MAP.battery} size={20} />
            </View>
            <View className="gap-2">
              <Text className="text-5xl font-semibold text-white">78%</Text>
              <View className="h-2 rounded-full bg-white/10">
                <View
                  className="h-2 rounded-full"
                  style={{ backgroundColor: accent, width: "78%" }}
                />
              </View>
            </View>
          </View>
        );
      }
      case "calendar": {
        return (
          <View className="flex-1 justify-between">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-white/70">
                  Tuesday
                </Text>
                <Text className="text-4xl font-semibold text-white">07</Text>
              </View>
              <IconAccent name={ICON_MAP.calendar} size={20} />
            </View>
            <View className="gap-2">
              <View className="rounded-2xl bg-white/8 px-3 py-2">
                <Text className="text-sm font-medium text-white/90">
                  Team standup
                </Text>
                <Text className="text-xs text-white/45">11:00 AM</Text>
              </View>
              <View className="rounded-2xl bg-white/6 px-3 py-2">
                <Text className="text-sm font-medium text-white/70">
                  Design sync
                </Text>
              </View>
            </View>
          </View>
        );
      }
      case "clock": {
        return (
          <View className="flex-1 justify-between">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-white/70">
                Clock & Date
              </Text>
              <IconAccent name={ICON_MAP.clock} size={20} />
            </View>
            <View>
              <Text className="text-5xl font-semibold text-white">17:29</Text>
              <Text className="mt-2 text-sm text-white/45">
                Tuesday, April 7
              </Text>
            </View>
          </View>
        );
      }
      case "music": {
        return (
          <View className="flex-1 justify-between">
            <View className="flex-row gap-3">
              <View
                className="h-14 w-14 rounded-2xl"
                style={{ backgroundColor: "rgba(255,143,177,0.25)" }}
              />
              <View className="flex-1 justify-center gap-1">
                <Text className="text-base font-semibold text-white">
                  Sunset Drive
                </Text>
                <Text className="text-sm text-white/45">Chromatics</Text>
              </View>
            </View>
            <View className="gap-3">
              <View className="h-1.5 rounded-full bg-white/10">
                <View
                  className="h-1.5 rounded-full"
                  style={{ backgroundColor: accent, width: "44%" }}
                />
              </View>
              <View className="flex-row items-center justify-between px-4">
                <Icon name={ICON_MAP.skipBack} size={18} />
                <View className="rounded-full bg-white px-3 py-3">
                  <Icon name={ICON_MAP.pause} size={18} />
                </View>
                <Icon name={ICON_MAP.skipForward} size={18} />
              </View>
            </View>
          </View>
        );
      }
      default: {
        return (
          <View className="flex-1 justify-between">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-white/70">Weather</Text>
              <IconAccent name={ICON_MAP.weather} size={20} />
            </View>
            <View className="gap-3">
              <Text className="text-5xl font-semibold text-white">28°</Text>
              <View className="flex-row items-center justify-between">
                <SmallStat label="Condition" value="Clear" />
                <SmallStat label="High" value="31°" />
                <SmallStat label="Low" value="24°" />
              </View>
            </View>
          </View>
        );
      }
    }
  })();

  return (
    <PreviewShell
      onPress={onPress}
      subtitle="Launcher widget"
      title={label}
      footer={
        <View className="flex-row items-center gap-2">
          <IconAccent name={ICON_MAP[WIDGET_ICONS[widgetId]]} size={16} />
          <Text className="text-xs font-medium uppercase tracking-[1.4px] text-white/45">
            Tap to add
          </Text>
        </View>
      }
    >
      {preview}
    </PreviewShell>
  );
});

const WIDGET_GRID_ITEMS: Record<
  number,
  { id: string; width: DimensionValue }[]
> = {
  3: [
    { id: "hero", width: "58%" },
    { id: "support-a", width: "38%" },
    { id: "support-b", width: "38%" },
  ],
  4: [
    { id: "hero", width: "58%" },
    { id: "support-a", width: "38%" },
    { id: "support-b", width: "38%" },
    { id: "support-c", width: "58%" },
  ],
};

const WidgetGridPreview = ({ count }: { count: number }) => {
  const items = WIDGET_GRID_ITEMS[count] ?? WIDGET_GRID_ITEMS[4];

  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <View
          key={item.id}
          className="h-10 rounded-2xl bg-white/10"
          style={{ width: item.width }}
        />
      ))}
    </View>
  );
};

const NativeWidgetPreviewCard = memo(function NativeWidgetPreviewCard({
  app,
  isBusy = false,
  label,
  minHeight,
  minWidth,
  onPress,
}: {
  app?: AppPreviewInfo;
  isBusy?: boolean;
  label: string;
  minHeight: number;
  minWidth: number;
  onPress: () => void;
}) {
  const isWide = minWidth >= minHeight * 1.6;
  const isTall = minHeight >= minWidth * 1.2;
  const appName = app?.appName ?? "App widget";
  const previewBody = useMemo(() => {
    if (isWide) {
      return (
        <View className="gap-3">
          <View className="flex-row items-center rounded-full bg-white/12 px-4 h-12">
            <Text className="text-sm text-white/45">Search</Text>
          </View>
          <WidgetGridPreview count={3} />
        </View>
      );
    }

    if (isTall) {
      return (
        <View className="gap-2">
          <View className="h-16 rounded-[20px] bg-white/12" />
          <WidgetGridPreview count={4} />
        </View>
      );
    }

    return (
      <View className="gap-2">
        <WidgetGridPreview count={4} />
        <View className="h-12 rounded-[20px] bg-white/8" />
      </View>
    );
  }, [isTall, isWide]);

  return (
    <PreviewShell
      disabled={isBusy}
      onPress={onPress}
      subtitle={appName}
      title={label}
      footer={
        <View className="flex-row items-center gap-3">
          {app ? (
            <View pointerEvents="none">
              <AppIcon
                icon={app.icon}
                label={app.appName}
                letter={app.letter}
                packageName={app.packageName}
                showLabel={false}
                size={24}
              />
            </View>
          ) : (
            <View className="items-center justify-center rounded-full bg-white/10 p-1.5">
              <Icon name={ICON_MAP.grid} size={14} />
            </View>
          )}
          <Text className="text-xs font-medium uppercase tracking-[1.4px] text-white/45">
            {isBusy ? "Waiting for Android…" : "Tap to add"}
          </Text>
        </View>
      }
    >
      <View className="flex-1 justify-between">
        <View className="flex-row items-center justify-between">
          {app ? (
            <View pointerEvents="none">
              <AppIcon
                icon={app.icon}
                label={app.appName}
                letter={app.letter}
                packageName={app.packageName}
                showLabel={false}
                size={30}
              />
            </View>
          ) : (
            <View className="items-center justify-center rounded-full bg-white/10 p-2">
              <Icon name={ICON_MAP.grid} size={18} />
            </View>
          )}
          <View className="rounded-full bg-white/8 px-2.5 py-1">
            <Text className="text-[11px] font-medium text-white/55">
              {Math.round(minWidth)} x {Math.round(minHeight)}
            </Text>
          </View>
        </View>

        {previewBody}
      </View>
    </PreviewShell>
  );
});

export { BuiltinWidgetPreviewCard, NativeWidgetPreviewCard };
export type { AppPreviewInfo };
