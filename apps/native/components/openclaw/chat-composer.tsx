import { MaterialIcons } from "@expo/vector-icons";
import { Button, Input, Label, TextField, useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { View } from "react-native";

import { useThemeOverrides } from "@/context/theme-overrides";

interface ChatComposerProps {
  disabled?: boolean;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  sending?: boolean;
  value: string;
}

export const ChatComposer = ({
  disabled = false,
  onChangeText,
  onSubmit,
  placeholder = "Send a message",
  sending = false,
  value,
}: ChatComposerProps) => {
  const [border, foreground, muted, surface] = useThemeColor([
    "border",
    "foreground",
    "muted",
    "surface",
  ] as const);
  const { smallRadius } = useThemeOverrides();

  const handleSubmit = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <View
      style={{
        backgroundColor: surface,
        borderTopColor: border,
        borderTopWidth: 1,
        gap: 12,
        paddingBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 12,
      }}
    >
      <TextField isDisabled={disabled || sending}>
        <View style={{ gap: 8 }}>
          <Label>Message</Label>
          <Input
            multiline
            numberOfLines={3}
            onChangeText={onChangeText}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor={muted}
            style={{
              backgroundColor: surface,
              borderColor: border,
              borderCurve: "continuous",
              borderRadius: smallRadius,
              borderWidth: 1,
              color: foreground,
              maxHeight: 140,
              minHeight: 48,
              paddingHorizontal: 14,
              paddingVertical: 12,
              textAlignVertical: "top",
            }}
            submitBehavior="submit"
            value={value}
          />
        </View>
      </TextField>

      <Button
        isDisabled={disabled || sending || value.trim().length === 0}
        onPress={handleSubmit}
        variant="primary"
      >
        <MaterialIcons name="send" size={18} color="#ffffff" />
        <Button.Label>{sending ? "Sending..." : "Send"}</Button.Label>
      </Button>
    </View>
  );
};
