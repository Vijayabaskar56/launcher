import { useEffect, useRef } from "react";
import { Appearance } from "react-native";
import { Uniwind } from "uniwind";

import type { ColorScheme, ThemePreset } from "@/types/settings";

const resolveMode = (scheme: ColorScheme): "light" | "dark" => {
  if (scheme === "system") {
    return Appearance.getColorScheme() === "light" ? "light" : "dark";
  }
  return scheme;
};

const resolveThemeName = (
  preset: ThemePreset,
  mode: "light" | "dark"
): string => {
  if (preset === "default") {
    return mode;
  }
  if (preset === "high-contrast") {
    return `high-contrast-${mode}`;
  }
  if (preset === "black-and-white") {
    return `bw-${mode}`;
  }
  /* c8 ignore next */
  throw new Error(`Unknown theme preset: ${preset}`);
};

export const useThemeSync = (
  themePreset: ThemePreset,
  colorScheme: ColorScheme
): void => {
  const lastAppliedThemeRef = useRef("");

  useEffect(() => {
    const applyTheme = (themeName: string) => {
      if (lastAppliedThemeRef.current === themeName) {
        return;
      }
      lastAppliedThemeRef.current = themeName;
      Uniwind.setTheme(themeName as Parameters<typeof Uniwind.setTheme>[0]);
    };

    const mode = resolveMode(colorScheme);
    const themeName = resolveThemeName(themePreset, mode);
    applyTheme(themeName);

    if (colorScheme === "system") {
      const listener = Appearance.addChangeListener(
        ({ colorScheme: scheme }) => {
          const newMode = scheme === "light" ? "light" : "dark";
          const newTheme = resolveThemeName(themePreset, newMode);
          applyTheme(newTheme);
        }
      );
      return () => listener.remove();
    }
  }, [themePreset, colorScheme]);
};
