import { Slider, useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

interface SliderPreferenceProps {
  title: string;
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  disabled?: boolean;
  formatValue?: (value: number) => string;
}

export const SliderPreference = ({
  title,
  value,
  onValueChange,
  minValue = 0,
  maxValue = 100,
  step = 1,
  disabled = false,
  formatValue,
}: SliderPreferenceProps) => {
  const { smallRadius, fontFamily } = useThemeOverrides();
  const displayValue = formatValue ? formatValue(value) : String(value);

  const handleChange = useCallback(
    (v: number | number[]) => {
      const numValue = Array.isArray(v) ? (v[0] ?? minValue) : v;
      onValueChange(numValue);
    },
    [onValueChange, minValue]
  );

  const handleChangeEnd = useCallback(
    (v: number | number[]) => {
      const numValue = Array.isArray(v) ? (v[0] ?? minValue) : v;
      onValueChange(numValue);
    },
    [onValueChange, minValue]
  );

  const [foreground, defaultBg, muted] = useThemeColor([
    "foreground",
    "default",
    "muted",
  ] as const);

  return (
    <View
      style={{
        gap: 10,
        opacity: disabled ? 0.4 : 1,
        paddingHorizontal: 16,
        paddingVertical: 13,
      }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: foreground,
            fontFamily,
            fontSize: 16,
            fontWeight: "500",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        <View
          style={{
            backgroundColor: defaultBg,
            borderCurve: "continuous",
            borderRadius: smallRadius,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              color: muted,
              fontSize: 13,
              fontVariant: ["tabular-nums"],
              fontWeight: "600",
              letterSpacing: -0.1,
            }}
          >
            {displayValue}
          </Text>
        </View>
      </View>
      <Slider
        value={value}
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        minValue={minValue}
        maxValue={maxValue}
        step={step}
        isDisabled={disabled}
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </View>
  );
};
