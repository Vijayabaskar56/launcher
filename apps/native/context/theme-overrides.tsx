import { createContext, use, useMemo } from "react";

import { SettingsContext } from "@/context/settings";
import type { FontFamily } from "@/types/settings";

interface ThemeOverridesValue {
  accentColor: string;
  accentForeground: string;
  cornerRadius: number;
  transparency: number;
  /** Computed card radius based on cornerRadius */
  cardRadius: number;
  /** Computed small element radius (chips, badges, icon containers) */
  smallRadius: number;
  /** Resolved font family name for use in style props */
  fontFamily: string | undefined;
  /** The raw font family setting ID */
  fontFamilyId: FontFamily;
}

export const ThemeOverridesContext = createContext<ThemeOverridesValue | null>(
  null
);

/** Determine foreground color for a given accent hex — white for all saturated colors */
const computeAccentForeground = (hex: string): string => {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
};

/** Map font family ID to the loaded font name */
const FONT_FAMILY_MAP: Record<FontFamily, string | undefined> = {
  inter: "Inter_400Regular",
  "jetbrains-mono": "JetBrainsMono_400Regular",
  "space-grotesk": "SpaceGrotesk_400Regular",
  system: undefined,
};

export const ThemeOverridesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const settings = use(SettingsContext);

  const value = useMemo<ThemeOverridesValue>(() => {
    const appearance = settings?.state.appearance;
    const cornerRadius = appearance?.cornerRadius ?? 12;
    const accentColor = appearance?.accentColor ?? "#6366f1";
    const transparency = appearance?.transparency ?? 0.8;
    const fontFamilyId = (appearance?.fontFamily ?? "system") as FontFamily;

    return {
      accentColor,
      accentForeground: computeAccentForeground(accentColor),
      cardRadius: cornerRadius,
      cornerRadius,
      fontFamily: FONT_FAMILY_MAP[fontFamilyId],
      fontFamilyId,
      smallRadius: Math.max(4, Math.round(cornerRadius * 0.625)),
      transparency,
    };
  }, [settings?.state.appearance]);

  return (
    <ThemeOverridesContext value={value}>{children}</ThemeOverridesContext>
  );
};

/** Hook to consume theme overrides */
export const useThemeOverrides = (): ThemeOverridesValue => {
  const value = use(ThemeOverridesContext);
  if (!value) {
    return {
      accentColor: "#6366f1",
      accentForeground: "#ffffff",
      cardRadius: 12,
      cornerRadius: 12,
      fontFamily: undefined,
      fontFamilyId: "system",
      smallRadius: 8,
      transparency: 0.8,
    };
  }
  return value;
};
