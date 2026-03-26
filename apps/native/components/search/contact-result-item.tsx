import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { memo, useCallback, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import type { ContactResultData, SearchResult } from "@/types/search";

type IoniconName = keyof typeof Ionicons.glyphMap;

const actionButtonPressedStyle: ViewStyle = {
  alignItems: "center",
  borderRadius: 20,
  borderWidth: 1,
  flexDirection: "row",
  gap: 6,
  opacity: 0.7,
  paddingHorizontal: 12,
  paddingVertical: 6,
};

const actionButtonDefaultStyle: ViewStyle = {
  ...actionButtonPressedStyle,
  opacity: 1,
};

const ActionButton = ({
  icon,
  label,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
}) => {
  const accent = useThemeColor("accent");
  const foreground = useThemeColor("foreground");

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => ({
      ...(pressed ? actionButtonPressedStyle : actionButtonDefaultStyle),
      borderColor: accent,
    }),
    [accent]
  );

  return (
    <Pressable onPress={onPress} style={getStyle}>
      <Ionicons name={icon} size={16} color={accent} />
      <Text
        numberOfLines={1}
        style={{ color: foreground, fontSize: 13, maxWidth: 120 }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const CallActionButton = ({
  phone,
}: {
  phone: { number: string; label: string };
}) => {
  const handlePress = useCallback(() => {
    Linking.openURL(`tel:${phone.number}`);
  }, [phone.number]);

  return (
    <ActionButton
      icon="call-outline"
      label={phone.number}
      onPress={handlePress}
    />
  );
};

const SmsActionButton = ({
  phone,
}: {
  phone: { number: string; label: string };
}) => {
  const handlePress = useCallback(() => {
    Linking.openURL(`sms:${phone.number}`);
  }, [phone.number]);

  return (
    <ActionButton
      icon="chatbubble-outline"
      label={`SMS ${phone.label}`}
      onPress={handlePress}
    />
  );
};

const EmailActionButton = ({
  email,
}: {
  email: { email: string; label: string };
}) => {
  const handlePress = useCallback(() => {
    Linking.openURL(`mailto:${email.email}`);
  }, [email.email]);

  return (
    <ActionButton
      icon="mail-outline"
      label={email.email}
      onPress={handlePress}
    />
  );
};

const contactPressedStyle: ViewStyle = {
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.04)",
  flexDirection: "row",
  gap: 12,
  paddingHorizontal: 16,
  paddingVertical: 10,
};

const contactDefaultStyle: ViewStyle = {
  ...contactPressedStyle,
  backgroundColor: "transparent",
};

const getContactPressableStyle = ({ pressed }: { pressed: boolean }) =>
  pressed ? contactPressedStyle : contactDefaultStyle;

export const ContactResultItem = memo(function ContactResultItem({
  result,
  callOnTap,
}: {
  result: SearchResult;
  callOnTap: boolean;
}) {
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const [expanded, setExpanded] = useState(false);

  const data = result.data as ContactResultData | null;

  const handlePress = useCallback(() => {
    if (callOnTap && data?.phoneNumbers?.[0]) {
      Linking.openURL(`tel:${data.phoneNumbers[0].number}`);
      return;
    }
    setExpanded((prev) => !prev);
  }, [callOnTap, data]);

  return (
    <View>
      <Pressable onPress={handlePress} style={getContactPressableStyle}>
        <View
          style={{
            alignItems: "center",
            height: 36,
            justifyContent: "center",
            width: 36,
          }}
        >
          {data?.imageUri ? (
            <Image
              source={{ uri: data.imageUri }}
              style={{ borderRadius: 18, height: 36, width: 36 }}
            />
          ) : (
            <Ionicons name="person-outline" size={22} color={muted} />
          )}
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: foreground, fontSize: 15, fontWeight: "500" }}
          >
            {result.title}
          </Text>
          {result.subtitle ? (
            <Text numberOfLines={1} style={{ color: muted, fontSize: 13 }}>
              {result.subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={muted}
        />
      </Pressable>

      {expanded && data ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            paddingBottom: 10,
            paddingHorizontal: 64,
          }}
        >
          {data.phoneNumbers.map((phone) => (
            <CallActionButton key={`call-${phone.number}`} phone={phone} />
          ))}
          {data.phoneNumbers.map((phone) => (
            <SmsActionButton key={`sms-${phone.number}`} phone={phone} />
          ))}
          {data.emails.map((email) => (
            <EmailActionButton key={`email-${email.email}`} email={email} />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
});
