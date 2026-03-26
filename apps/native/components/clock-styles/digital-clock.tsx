import { memo } from "react";
import { TextInput, Text } from "react-native";
import { createAnimatedComponent } from "react-native-reanimated";

import type { useClock } from "@/hooks/use-clock";

const AnimatedTextInput = createAnimatedComponent(TextInput);

interface DigitalClockProps {
  clock: ReturnType<typeof useClock>;
  size?: "homescreen" | "widget" | "widget-small";
}

const textSizeMap = {
  homescreen: "text-8xl",
  widget: "text-7xl",
  "widget-small": "text-3xl",
} as const;

export const DigitalClock = memo(function DigitalClock({
  clock,
  size = "homescreen",
}: DigitalClockProps) {
  const { timeAnimatedProps, dateString } = clock;
  const textSizeClass = textSizeMap[size];

  return (
    <>
      <AnimatedTextInput
        animatedProps={timeAnimatedProps}
        editable={false}
        pointerEvents="none"
        className={`text-foreground font-extralight tabular-nums text-center ${textSizeClass}`}
        style={{ borderWidth: 0, letterSpacing: -2, padding: 0 }}
        underlineColorAndroid="transparent"
      />
      {size === "homescreen" && (
        <Text className="text-sm text-muted-foreground">{dateString}</Text>
      )}
    </>
  );
});
