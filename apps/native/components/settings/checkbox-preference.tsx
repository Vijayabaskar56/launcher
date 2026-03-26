import { MaterialIcons } from "@expo/vector-icons";
import { Checkbox } from "heroui-native";
import { Text, View } from "react-native";

interface CheckboxPreferenceProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const CheckboxPreference = ({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: CheckboxPreferenceProps) => (
  <View
    style={{
      alignItems: "center",
      flexDirection: "row",
      gap: 14,
      opacity: disabled ? 0.5 : 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
    }}
  >
    {icon ? (
      <MaterialIcons name={icon} size={22} className="text-muted-foreground" />
    ) : null}
    <View style={{ flex: 1, gap: 2 }}>
      <Text className="text-base font-medium text-foreground">{title}</Text>
      {description ? (
        <Text className="text-sm text-muted-foreground">{description}</Text>
      ) : null}
    </View>
    <Checkbox
      isSelected={value}
      onSelectedChange={onValueChange}
      isDisabled={disabled}
    >
      <Checkbox.Indicator />
    </Checkbox>
  </View>
);
