import { Ionicons } from "@expo/vector-icons";
import { Chip, useThemeColor } from "heroui-native";
import { memo, useCallback } from "react";
import { Clipboard, Pressable, Text, View } from "react-native";

import type { SmartCalculatorResult } from "@/lib/smart-calculator/types";

type IoniconName = keyof typeof Ionicons.glyphMap;

const KIND_LABELS: Record<
  SmartCalculatorResult["kind"],
  { icon: IoniconName; label: string }
> = {
  base: { icon: "git-compare-outline", label: "Base" },
  date: { icon: "calendar-outline", label: "Date" },
  duration: { icon: "time-outline", label: "Duration" },
  math: { icon: "calculator-outline", label: "Math" },
  percentage: { icon: "stats-chart-outline", label: "Percentage" },
  time: { icon: "time-outline", label: "Time" },
  unit: { icon: "swap-horizontal-outline", label: "Unit" },
};

export const CalculatorCard = memo(function CalculatorCard({
  result,
}: {
  result: SmartCalculatorResult;
}) {
  const accent = useThemeColor("accent");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const surface = useThemeColor("surface");
  const border = useThemeColor("border");
  const kindConfig = KIND_LABELS[result.kind];

  const handlePress = useCallback(() => {
    Clipboard.setString(result.copyValue);
  }, [result.copyValue]);

  return (
    <View style={{ paddingBottom: 8, paddingHorizontal: 16, paddingTop: 8 }}>
      <Pressable
        accessibilityHint="Copies the calculator result"
        accessibilityLabel={`${kindConfig.label} calculator result`}
        onPress={handlePress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "rgba(255,255,255,0.08)" : surface,
          borderColor: border,
          borderRadius: 20,
          borderWidth: 1,
          overflow: "hidden",
          padding: 16,
        })}
      >
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Chip
            color="default"
            style={{
              backgroundColor: "transparent",
              borderColor: accent,
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
            variant="secondary"
          >
            <Ionicons name={kindConfig.icon} size={14} color={accent} />
            <Chip.Label
              style={{ color: foreground, fontSize: 12, fontWeight: "700" }}
            >
              {kindConfig.label}
            </Chip.Label>
          </Chip>

          <Text
            style={{
              color: muted,
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            Tap to copy
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text
              style={{
                color: muted,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {result.inputLabel}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: foreground,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              {result.input}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              gap: 6,
              padding: 14,
            }}
          >
            <Text
              style={{
                color: muted,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {result.resultLabel}
            </Text>
            <Text
              numberOfLines={3}
              style={{
                color: foreground,
                fontSize: 24,
                fontWeight: "700",
              }}
            >
              {result.result}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
});
