import { Surface } from "heroui-native";
import type { ReactNode } from "react";
import { Text } from "react-native";

import type { WidgetSize } from "@/context/widget-config";
import { WIDGET_SIZES } from "@/context/widget-config";

interface WidgetCardProps {
  children: ReactNode;
  opacity?: number;
  size?: WidgetSize;
  title?: string;
}

const WidgetCard = function WidgetCard({
  children,
  opacity = 1,
  size = "medium",
  title,
}: WidgetCardProps) {
  const sizeConfig = WIDGET_SIZES[size];

  return (
    <Surface
      className={`gap-2 p-4 ${sizeConfig.width === "full" ? "w-full" : "w-[48%]"}`}
      variant="default"
      style={{ minHeight: sizeConfig.height, opacity }}
    >
      {title ? (
        <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </Text>
      ) : null}
      {children}
    </Surface>
  );
};

export { WidgetCard };
