import { useBatteryLevel, useBatteryState, BatteryState } from "expo-battery";

const STATE_LABELS: Record<number, string> = {
  [BatteryState.CHARGING]: "Charging",
  [BatteryState.FULL]: "Full",
  [BatteryState.UNPLUGGED]: "On Battery",
  [BatteryState.UNKNOWN]: "Unknown",
};

/**
 * Convenience wrapper around expo-battery hooks.
 * Returns level as 0-100 integer and derived status info.
 */
export const useBattery = () => {
  const rawLevel = useBatteryLevel();
  const state = useBatteryState();

  const level = rawLevel >= 0 ? Math.round(rawLevel * 100) : 0;
  const isCharging = state === BatteryState.CHARGING;
  const isFull = state === BatteryState.FULL;
  const isLow = level < 15 && !isCharging;
  const statusText = STATE_LABELS[state] ?? "Unknown";

  return {
    isCharging,
    isFull,
    isLow,
    level,
    state,
    statusText,
  };
};
