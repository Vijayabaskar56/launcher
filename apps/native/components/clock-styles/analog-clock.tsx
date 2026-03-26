import { memo } from "react";
import { Text, View } from "react-native";
import {
  createAnimatedComponent,
  useAnimatedProps,
  useDerivedValue,
} from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";

import type { useClock } from "@/hooks/use-clock";

const AnimatedLine = createAnimatedComponent(Line);

const CLOCK_SIZE = 200;
const CENTER = CLOCK_SIZE / 2;
const TICK_OUTER = CENTER - 8;
const TICK_INNER = CENTER - 16;
const HOUR_HAND_LENGTH = CENTER * 0.5;
const MINUTE_HAND_LENGTH = CENTER * 0.72;
const SECOND_HAND_LENGTH = CENTER * 0.8;

interface AnalogClockProps {
  clock: ReturnType<typeof useClock>;
  size?: "homescreen" | "widget" | "widget-small";
  showSeconds?: boolean;
}

export const AnalogClock = memo(function AnalogClock({
  clock,
  size = "homescreen",
  showSeconds = false,
}: AnalogClockProps) {
  const { hourRotation, minuteRotation, secondRotation, dateString } = clock;

  const scaleMap = { homescreen: 1, widget: 0.8, "widget-small": 0.5 } as const;
  const scale = scaleMap[size];
  const displaySize = CLOCK_SIZE * scale;

  // Compute hand endpoints on the UI thread
  const hourEnd = useDerivedValue(() => {
    const rad = ((hourRotation.value - 90) * Math.PI) / 180;
    return {
      x: CENTER + HOUR_HAND_LENGTH * Math.cos(rad),
      y: CENTER + HOUR_HAND_LENGTH * Math.sin(rad),
    };
  });

  const minuteEnd = useDerivedValue(() => {
    const rad = ((minuteRotation.value - 90) * Math.PI) / 180;
    return {
      x: CENTER + MINUTE_HAND_LENGTH * Math.cos(rad),
      y: CENTER + MINUTE_HAND_LENGTH * Math.sin(rad),
    };
  });

  const secondEnd = useDerivedValue(() => {
    const rad = ((secondRotation.value - 90) * Math.PI) / 180;
    return {
      x: CENTER + SECOND_HAND_LENGTH * Math.cos(rad),
      y: CENTER + SECOND_HAND_LENGTH * Math.sin(rad),
    };
  });

  const hourHandProps = useAnimatedProps(() => ({
    x2: String(hourEnd.value.x),
    y2: String(hourEnd.value.y),
  }));

  const minuteHandProps = useAnimatedProps(() => ({
    x2: String(minuteEnd.value.x),
    y2: String(minuteEnd.value.y),
  }));

  const secondHandProps = useAnimatedProps(() => ({
    x2: String(secondEnd.value.x),
    y2: String(secondEnd.value.y),
  }));

  // Generate tick marks at 12 positions
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = ((i * 30 - 90) * Math.PI) / 180;
    const isHour = i % 3 === 0;
    const inner = isHour ? TICK_INNER - 4 : TICK_INNER;
    return {
      hour: i,
      strokeWidth: isHour ? 2.5 : 1,
      x1: CENTER + inner * Math.cos(angle),
      x2: CENTER + TICK_OUTER * Math.cos(angle),
      y1: CENTER + inner * Math.sin(angle),
      y2: CENTER + TICK_OUTER * Math.sin(angle),
    };
  });

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <View
        style={{
          height: displaySize,
          transform: [{ scale }],
          width: displaySize,
        }}
      >
        <Svg
          width={CLOCK_SIZE}
          height={CLOCK_SIZE}
          viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
        >
          {/* Clock face */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={CENTER - 4}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1.5}
            fill="none"
          />

          {/* Tick marks */}
          {ticks.map((tick) => (
            <Line
              key={`tick-${tick.hour}`}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth={tick.strokeWidth}
              strokeLinecap="round"
            />
          ))}

          {/* Hour hand */}
          <AnimatedLine
            x1={CENTER}
            y1={CENTER}
            animatedProps={hourHandProps}
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Minute hand */}
          <AnimatedLine
            x1={CENTER}
            y1={CENTER}
            animatedProps={minuteHandProps}
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Second hand (optional) */}
          {showSeconds && (
            <AnimatedLine
              x1={CENTER}
              y1={CENTER}
              animatedProps={secondHandProps}
              stroke="rgba(99, 102, 241, 0.8)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )}

          {/* Center dot */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={4}
            fill="rgba(255, 255, 255, 0.9)"
          />
        </Svg>
      </View>
      {size === "homescreen" && (
        <Text className="text-sm text-muted-foreground">{dateString}</Text>
      )}
    </View>
  );
});
