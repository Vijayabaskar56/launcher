import { useThemeColor } from "heroui-native";
import { Text, View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

interface PreferenceCategoryProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const PreferenceCategory = ({
  title,
  description,
  children,
}: PreferenceCategoryProps) => {
  const muted = useThemeColor("muted");
  const surface = useThemeColor("surface");
  const { cardRadius, transparency } = useThemeOverrides();

  return (
    <View style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 6 }}>
      <View style={{ gap: 2, paddingHorizontal: 4 }}>
        <Text
          style={{
            color: muted,
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              color: muted,
              fontSize: 12,
              lineHeight: 16,
              opacity: 0.7,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: surface,
          borderCurve: "continuous",
          borderRadius: cardRadius,
          opacity: transparency,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
};
