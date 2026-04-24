import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Pressable, TextInput, View } from "react-native";

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
  const [accent, accentForeground, border, foreground, muted, surface] =
    useThemeColor([
      "accent",
      "accent-foreground",
      "border",
      "foreground",
      "muted",
      "surface",
    ] as const);

  const handleSubmit = useCallback(() => {
    if (disabled || sending) {
      return;
    }
    onSubmit();
  }, [disabled, onSubmit, sending]);

  const canSend = value.trim().length > 0 && !disabled && !sending;

  return (
    <View
      style={{
        backgroundColor: surface,
        borderTopColor: border,
        borderTopWidth: 1,
        paddingBottom: 16,
        paddingHorizontal: 12,
        paddingTop: 10,
      }}
    >
      <View
        style={{
          alignItems: "flex-end",
          backgroundColor: surface,
          borderColor: border,
          borderCurve: "continuous",
          borderRadius: 24,
          borderWidth: 1,
          flexDirection: "row",
          gap: 6,
          paddingLeft: 14,
          paddingRight: 6,
          paddingVertical: 6,
        }}
      >
        <TextInput
          editable={!(disabled || sending)}
          multiline
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={muted}
          style={{
            color: foreground,
            flex: 1,
            fontSize: 15,
            lineHeight: 20,
            maxHeight: 140,
            minHeight: 32,
            paddingVertical: 6,
            textAlignVertical: "center",
          }}
          submitBehavior="submit"
          value={value}
        />
        <Pressable
          accessibilityLabel={sending ? "Sending" : "Send message"}
          disabled={!canSend}
          onPress={handleSubmit}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: canSend ? accent : border,
            borderRadius: 20,
            height: 40,
            justifyContent: "center",
            opacity: pressed ? 0.75 : 1,
            width: 40,
          })}
        >
          <Ionicons
            name={sending ? "hourglass-outline" : "arrow-up"}
            size={20}
            color={canSend ? accentForeground : muted}
          />
        </Pressable>
      </View>
    </View>
  );
};
