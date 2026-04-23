import { openApplication } from "expo-intent-launcher";
import { Button } from "heroui-native";
import { useCallback } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import type { WidgetSize } from "@/context/widget-config";
import { useNowPlaying } from "@/hooks/use-now-playing";

import { Icon } from "../ui/icon";
import { WidgetCard } from "./widget-card";

const toImageUri = (path: string | undefined): string | undefined => {
  if (!path) {
    return undefined;
  }

  if (path.includes("://")) {
    return path;
  }

  return `file://${path}`;
};

interface IconButtonProps {
  icon: "play" | "pause" | "play-skip-back" | "play-skip-forward";
  onPress: () => void;
  large?: boolean;
}

const IconButton = ({ icon, onPress, large }: IconButtonProps) => (
  <Button
    isIconOnly
    onPress={onPress}
    size="sm"
    variant={large ? "secondary" : "ghost"}
  >
    <Icon name={`${icon}-outline` as never} size={large ? 24 : 20} />
  </Button>
);

const MusicHeader = ({
  albumArtUri,
  artist,
  isSmall,
  onPress,
  title,
}: {
  albumArtUri: string | undefined;
  artist: string | undefined;
  isSmall: boolean;
  onPress: () => void;
  title: string | undefined;
}) => (
  <Pressable onPress={onPress}>
    <Animated.View
      className="flex-row items-center gap-3"
      layout={LinearTransition.duration(250)}
    >
      <View className="flex-1">
        <Animated.Text
          className="text-base font-bold text-foreground"
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(150)}
          key={`title-${title}`}
          numberOfLines={1}
        >
          {title}
        </Animated.Text>
        {!isSmall && artist ? (
          <Animated.Text
            className="text-sm text-muted-foreground"
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(150)}
            key={`artist-${artist}`}
            numberOfLines={1}
          >
            {artist}
          </Animated.Text>
        ) : null}
      </View>
      {albumArtUri ? (
        <Image
          accessibilityIgnoresInvertColors
          className="h-16 w-16 rounded-2xl"
          source={{ uri: albumArtUri }}
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-default/30">
          <Icon name="musical-notes-outline" size={24} />
        </View>
      )}
    </Animated.View>
  </Pressable>
);

const MusicWidget = function MusicWidget({
  opacity,
  size = "medium",
}: {
  opacity?: number;
  size?: WidgetSize;
}) {
  const {
    metadata,
    state,
    hasPermission,
    requestPermission,
    toggle,
    next,
    previous,
  } = useNowPlaying();

  const isSmall = size === "small";
  const isPlaying = state === "playing";
  const hasTrack = Boolean(metadata?.title);
  const albumArtUri = toImageUri(metadata?.albumArtPath);

  const handleOpenPlayer = useCallback(() => {
    if (!metadata?.packageName) {
      return;
    }

    openApplication(metadata.packageName);
  }, [metadata?.packageName]);

  // No-permission state
  if (!hasPermission) {
    return (
      <WidgetCard opacity={opacity} size={size}>
        <Pressable
          className="flex-1 items-center justify-center gap-2 py-2"
          onPress={requestPermission}
        >
          <Icon name="musical-notes-outline" size={28} />
          <Text className="text-sm text-muted-foreground">
            Enable media access
          </Text>
        </Pressable>
      </WidgetCard>
    );
  }

  // No track playing
  if (!hasTrack) {
    return (
      <WidgetCard opacity={opacity} size={size}>
        <View className="flex-1 items-center justify-center gap-2 py-2">
          <Icon name="musical-notes-outline" size={28} />
          <Text className="text-sm text-muted-foreground">Nothing playing</Text>
        </View>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard opacity={opacity} size={size}>
      <MusicHeader
        albumArtUri={albumArtUri}
        artist={metadata?.artist}
        isSmall={isSmall}
        onPress={handleOpenPlayer}
        title={metadata?.title}
      />

      <View className="mt-2 flex-row items-center justify-around">
        <IconButton icon="play-skip-back" onPress={previous} />
        <IconButton
          icon={isPlaying ? "pause" : "play"}
          large
          onPress={toggle}
        />
        <IconButton icon="play-skip-forward" onPress={next} />
      </View>
    </WidgetCard>
  );
};

export { MusicWidget };
