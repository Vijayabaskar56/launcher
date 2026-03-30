import { useMemo } from "react";
import { Platform } from "react-native";
import MaterialYou from "react-native-material-you-colors";

const DEFAULT_ACCENT = "#6366f1";

/**
 * Extract the primary accent color from the Material You system palette.
 *
 * On Android 12+ the color comes from the device wallpaper via the native
 * module. On all other platforms a fallback palette is generated from
 * {@link DEFAULT_ACCENT} so the app never crashes.
 *
 * The returned hex string is the `system_accent1[4]` shade (tone 40),
 * which maps to the Material 3 "primary" role.
 */
export const useMaterialYouColor = (): string => {
  const color = useMemo(() => {
    try {
      const palette = MaterialYou.getMaterialYouPalette(
        DEFAULT_ACCENT,
        "TONAL_SPOT"
      );
      // Index 4 corresponds to tone 40 — the primary color in M3.
      return palette.system_accent1[4] ?? DEFAULT_ACCENT;
    } catch {
      return DEFAULT_ACCENT;
    }
  }, []);

  return color;
};

/**
 * Synchronous helper for non-hook contexts.
 * Returns the Material You primary accent or the default indigo fallback.
 */
export const getMaterialYouAccentColor = (): string => {
  try {
    if (Platform.OS !== "android") {
      return DEFAULT_ACCENT;
    }
    const palette = MaterialYou.getMaterialYouPalette(
      DEFAULT_ACCENT,
      "TONAL_SPOT"
    );
    return palette.system_accent1[4] ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
};
