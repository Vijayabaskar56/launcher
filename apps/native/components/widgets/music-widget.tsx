import { TouchableOpacity, View } from "react-native";

import type { WidgetSize } from "@/context/widget-config";

import { Icon, ICON_MAP } from "../ui/icon";
import { WidgetCard } from "./widget-card";

const MusicWidget = function MusicWidget({
  opacity,
  size = "medium",
}: {
  opacity?: number;
  size?: WidgetSize;
}) {
  const isSmall = size === "small";

  return (
    <WidgetCard opacity={opacity} size={size}>
      <View className="flex-row items-center">
        <View
          className={`bg-muted rounded-xl ${isSmall ? "h-10 w-10" : "h-16 w-16"}`}
        />
        {!isSmall && (
          <View className="flex-1 pl-4 gap-0.5">
            <Icon name={ICON_MAP.music} size={40} />
          </View>
        )}
        {isSmall && (
          <View className="flex-1 pl-3">
            <Icon name={ICON_MAP.music} size={20} />
          </View>
        )}
      </View>
      {!isSmall && (
        <View className="flex-row items-center justify-center gap-2 pt-2">
          <TouchableOpacity className="h-11 w-11 items-center justify-center">
            <Icon name={ICON_MAP.skipBack} size={24} />
          </TouchableOpacity>
          <TouchableOpacity className="h-13 w-13 items-center justify-center bg-primary rounded-full">
            <Icon name={ICON_MAP.pause} size={28} />
          </TouchableOpacity>
          <TouchableOpacity className="h-11 w-11 items-center justify-center">
            <Icon name={ICON_MAP.skipForward} size={24} />
          </TouchableOpacity>
        </View>
      )}
    </WidgetCard>
  );
};

export { MusicWidget };
