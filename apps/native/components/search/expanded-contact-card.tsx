import { Ionicons } from "@expo/vector-icons";
import { Card, useThemeColor } from "heroui-native";
import { memo, useCallback } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";

import type { ContactResultData, SearchResult } from "@/types/search";

type IoniconName = keyof typeof Ionicons.glyphMap;

const ActionRow = ({
  icon,
  label,
  value,
  trailingIcon,
  onPress,
  onTrailingPress,
}: {
  icon: IoniconName;
  label?: string;
  value: string;
  trailingIcon?: IoniconName;
  onPress: () => void;
  onTrailingPress?: () => void;
}) => {
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const border = useThemeColor("border");

  return (
    <View
      className="flex-row items-center rounded-xl border"
      style={{ borderColor: border, minHeight: 56 }}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center flex-1 gap-3 px-4 py-3"
      >
        <Ionicons name={icon} size={22} color={foreground} />
        <View className="flex-1">
          {label ? (
            <Text style={{ color: muted, fontSize: 12 }}>{label}</Text>
          ) : null}
          <Text style={{ color: foreground, fontSize: 15, fontWeight: "600" }}>
            {value}
          </Text>
        </View>
      </Pressable>
      {trailingIcon ? (
        <Pressable
          onPress={onTrailingPress}
          hitSlop={8}
          className="items-center justify-center border-l px-4"
          style={{ alignSelf: "stretch", borderColor: border }}
        >
          <Ionicons name={trailingIcon} size={20} color={foreground} />
        </Pressable>
      ) : null}
    </View>
  );
};

const MessagingRow = ({
  icon,
  iconColor,
  label,
  onPress,
}: {
  icon: IoniconName;
  iconColor: string;
  label: string;
  onPress: () => void;
}) => {
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const border = useThemeColor("border");

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: border, minHeight: 56 }}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text
        className="flex-1"
        style={{ color: foreground, fontSize: 15, fontWeight: "600" }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={muted} />
    </Pressable>
  );
};

const ToolbarButton = ({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
}) => {
  const foreground = useThemeColor("foreground");
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={accessibilityLabel}
      className="h-11 w-11 items-center justify-center"
    >
      <Ionicons name={icon} size={22} color={foreground} />
    </Pressable>
  );
};

export const ExpandedContactCard = memo(function ExpandedContactCard({
  result,
  onCollapse,
  onCustomize,
}: {
  result: SearchResult;
  onCollapse?: () => void;
  onCustomize?: (result: SearchResult) => void;
}) {
  const foreground = useThemeColor("foreground");
  const data = result.data as ContactResultData | null;

  const firstPhone = data?.phoneNumbers?.[0];

  const handleWhatsApp = useCallback(() => {
    if (!firstPhone) {
      return;
    }
    const digits = firstPhone.number.replaceAll(/[^\d]/g, "");
    Linking.openURL(`https://wa.me/${digits}`);
  }, [firstPhone]);

  const handleTelegram = useCallback(async () => {
    if (!firstPhone) {
      return;
    }
    const digits = firstPhone.number.replaceAll(/[^\d]/g, "");
    try {
      await Linking.openURL(`tg://resolve?phone=${digits}`);
    } catch {
      await Linking.openURL(`https://t.me/+${digits}`);
    }
  }, [firstPhone]);

  const handleShare = useCallback(async () => {
    const lines = [result.title];
    if (firstPhone) {
      lines.push(firstPhone.number);
    }
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      // ignore share failures
    }
  }, [firstPhone, result.title]);

  const handleFavorite = useCallback(() => {
    Alert.alert("Favorite", "Favoriting contacts is coming soon.");
  }, []);

  const handleCustomize = useCallback(() => {
    if (onCustomize) {
      onCustomize(result);
    } else {
      Alert.alert("Customize", "Contact customization is coming soon.");
    }
  }, [onCustomize, result]);

  return (
    <Card variant="transparent" className="rounded-3xl p-4 gap-3 bg-surface/70">
      <View className="flex-row items-center gap-3 py-2">
        <View
          className="bg-secondary"
          style={{
            alignItems: "center",
            borderRadius: 24,
            height: 48,
            justifyContent: "center",
            width: 48,
          }}
        >
          {data?.imageUri ? (
            <Image
              source={{ uri: data.imageUri }}
              style={{ borderRadius: 24, height: 48, width: 48 }}
            />
          ) : (
            <Text
              style={{ color: foreground, fontSize: 20, fontWeight: "700" }}
            >
              {result.title.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text
          className="flex-1"
          numberOfLines={1}
          style={{ color: foreground, fontSize: 18, fontWeight: "700" }}
        >
          {result.title}
        </Text>
      </View>

      <View className="gap-2">
        {data?.phoneNumbers?.map((phone) => (
          <ActionRow
            key={phone.number}
            icon="call-outline"
            label={phone.label || "Mobile"}
            value={phone.number}
            trailingIcon="chatbubble-outline"
            onPress={() => Linking.openURL(`tel:${phone.number}`)}
            onTrailingPress={() => Linking.openURL(`sms:${phone.number}`)}
          />
        ))}
        {firstPhone ? (
          <>
            <MessagingRow
              icon="logo-whatsapp"
              iconColor="#25D366"
              label="WhatsApp"
              onPress={handleWhatsApp}
            />
            <MessagingRow
              icon="paper-plane-outline"
              iconColor="#229ED9"
              label="Telegram"
              onPress={handleTelegram}
            />
          </>
        ) : null}
        {data?.emails?.map((email) => (
          <ActionRow
            key={email.email}
            icon="mail-outline"
            label={email.label || "Email"}
            value={email.email}
            onPress={() => Linking.openURL(`mailto:${email.email}`)}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between pt-1">
        {onCollapse ? (
          <ToolbarButton
            icon="arrow-back"
            onPress={onCollapse}
            accessibilityLabel="Back"
          />
        ) : null}
        <View className="flex-row items-center gap-4">
          <ToolbarButton
            icon="star-outline"
            onPress={handleFavorite}
            accessibilityLabel="Favorite contact"
          />
          <ToolbarButton
            icon="open-outline"
            onPress={handleShare}
            accessibilityLabel="Share contact"
          />
          <ToolbarButton
            icon="options-outline"
            onPress={handleCustomize}
            accessibilityLabel="Customize contact"
          />
        </View>
      </View>
    </Card>
  );
});
