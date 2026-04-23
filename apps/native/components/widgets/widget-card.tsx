import { Card } from "heroui-native";
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
    <Card
      variant="transparent"
      className="w-full rounded-2xl border border-border/40 p-4 gap-2 bg-surface/70"
      style={{
        minHeight: sizeConfig.height,
        opacity,
      }}
    >
      {title ? (
        <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </Text>
      ) : null}
      {children}
    </Card>
  );
};

export { WidgetCard };
