import { forwardRef, useCallback, useMemo } from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  Path,
  Rect,
} from "react-native-svg";

import { useNotificationBadge } from "@/hooks/use-notification-badge";
import { getIconClipPath } from "@/lib/icon-shapes";
import type { IconShape } from "@/types/settings";

import { IconAccent, ICON_MAP } from "./ui/icon";

interface AppIconProps {
  packageName: string;
  label: string;
  letter: string;
  icon?: string | null;
  isPinned?: boolean;
  showLabel?: boolean;
  iconShape?: IconShape;
  onLongPress?: (event: GestureResponderEvent) => void;
  onPress?: () => void;
  size?: number;
  onLayout?: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
}

/** Shapes that can be done with just borderRadius */
const SIMPLE_SHAPES: Record<string, (size: number) => number> = {
  circle: (s) => s / 2,
  "rounded-square": (s) => s * 0.2,
  square: () => 0,
};

/** Simple string hash for unique SVG clip IDs */
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.codePointAt(i) ?? 0;
    // eslint-disable-next-line no-bitwise -- Intentional hash computation
    hash = (hash << 5) - hash + char;
    hash = Math.trunc(hash);
  }
  return Math.abs(hash).toString(36);
};

/** Circle, square, rounded-square — use RN Image with borderRadius */
const SimpleShapeIcon = ({
  icon,
  letter,
  size,
  borderRadius,
}: {
  icon: string | null | undefined;
  letter: string;
  size: number;
  borderRadius: number;
}) => {
  if (icon) {
    return (
      <Image
        source={{ uri: icon }}
        style={{
          borderCurve: "continuous",
          borderRadius,
          height: size,
          width: size,
        }}
      />
    );
  }

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#f3f4f6",
        borderCurve: "continuous",
        borderRadius,
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      <Text
        className="text-foreground font-semibold"
        style={{ fontSize: size * 0.4 }}
      >
        {letter}
      </Text>
    </View>
  );
};

/** Squircle, teardrop, hexagon — use SVG clipPath */
const SvgShapeIcon = ({
  icon,
  letter,
  size,
  iconShape,
  packageName,
}: {
  icon: string | null | undefined;
  letter: string;
  size: number;
  iconShape: IconShape;
  packageName: string;
}) => {
  const clipPathData = useMemo(
    () => getIconClipPath(iconShape, size),
    [iconShape, size]
  );
  const clipId = useMemo(() => `ic-${hashString(packageName)}`, [packageName]);

  return (
    <>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={clipPathData} />
          </ClipPath>
        </Defs>
        {icon ? (
          <SvgImage
            href={{ uri: icon }}
            width={size}
            height={size}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <Rect
            width={size}
            height={size}
            fill="#f3f4f6"
            clipPath={`url(#${clipId})`}
          />
        )}
      </Svg>
      {/* Letter fallback for SVG shapes */}
      {!icon && (
        <View
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <Text
            className="text-foreground font-semibold"
            style={{ fontSize: size * 0.4 }}
          >
            {letter}
          </Text>
        </View>
      )}
    </>
  );
};

/** Notification badge indicator at top-right of icon */
const NotificationBadge = ({
  count,
  size,
}: {
  count: number;
  size: number;
}) => {
  if (count <= 0) {
    return null;
  }

  const badgeSize = Math.max(16, size * 0.32);
  const fontSize = badgeSize * 0.6;
  const showCount = count <= 99;

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#ef4444",
        borderColor: "#ffffff",
        borderRadius: badgeSize / 2,
        borderWidth: 1.5,
        height: badgeSize,
        justifyContent: "center",
        minWidth: badgeSize,
        paddingHorizontal: count > 9 ? 3 : 0,
        position: "absolute",
        right: -4,
        top: -4,
        zIndex: 10,
      }}
    >
      <Text
        style={{
          color: "#ffffff",
          fontSize,
          fontWeight: "700",
          lineHeight: badgeSize - 3,
          textAlign: "center",
        }}
      >
        {showCount ? count : "99+"}
      </Text>
    </View>
  );
};

export const AppIcon = forwardRef<View, AppIconProps>(
  (
    {
      packageName,
      label,
      letter,
      icon,
      isPinned = false,
      showLabel = true,
      iconShape = "circle",
      onLongPress,
      onPress,
      size = 56,
      onLayout,
    },
    ref
  ) => {
    const badgeCount = useNotificationBadge(packageName);

    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        if (!onLayout) {
          return;
        }
        event.target.measureInWindow((x, y, width, height) => {
          onLayout({ height, width, x, y });
        });
      },
      [onLayout]
    );

    const isSimpleShape = iconShape in SIMPLE_SHAPES;

    return (
      <Pressable
        ref={ref}
        delayLongPress={220}
        onLongPress={onLongPress}
        onPress={onPress}
        onLayout={handleLayout}
        className="items-center gap-1"
      >
        <View style={{ height: size, width: size }}>
          {isSimpleShape ? (
            <SimpleShapeIcon
              icon={icon}
              letter={letter}
              size={size}
              borderRadius={(
                SIMPLE_SHAPES[iconShape] ?? ((s: number) => s / 2)
              )(size)}
            />
          ) : (
            <SvgShapeIcon
              icon={icon}
              letter={letter}
              size={size}
              iconShape={iconShape}
              packageName={packageName}
            />
          )}
          {/* Notification badge */}
          <NotificationBadge count={badgeCount} size={size} />
          {/* Pinned badge */}
          {isPinned ? (
            <View
              className="absolute items-center justify-center bg-primary rounded-full"
              style={{
                bottom: -2,
                height: 18,
                right: -2,
                width: 18,
              }}
            >
              <IconAccent name={ICON_MAP.star} size={10} />
            </View>
          ) : null}
        </View>
        {showLabel && (
          <Text
            className="text-foreground text-xs text-center"
            style={{ width: 64 }}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </Pressable>
    );
  }
);
AppIcon.displayName = "AppIcon";
