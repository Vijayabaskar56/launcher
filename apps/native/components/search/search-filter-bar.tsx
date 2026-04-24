import { Ionicons } from "@expo/vector-icons";
import { Chip, useThemeColor } from "heroui-native";
import { memo, useCallback } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import type { SearchActionMatch, SearchFilter } from "@/types/search";

type IoniconName = keyof typeof Ionicons.glyphMap;

const FILTER_CONFIG: {
  key: SearchFilter;
  label: string;
  icon: IoniconName;
}[] = [
  { icon: "grid-outline", key: "apps", label: "Apps" },
  { icon: "person-outline", key: "contacts", label: "Contacts" },
  { icon: "calendar-outline", key: "events", label: "Calendar" },
  { icon: "calculator-outline", key: "tools", label: "Tools" },
  { icon: "globe-outline", key: "web", label: "Web" },
];

const FilterPill = ({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IoniconName;
  active: boolean;
  onPress: () => void;
}) => {
  const accent = useThemeColor("accent");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");

  return (
    <Chip
      onPress={onPress}
      variant={active ? "primary" : "secondary"}
      color="default"
      style={{
        backgroundColor: active ? accent : "transparent",
        borderColor: active ? accent : muted,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Ionicons name={icon} size={14} color={active ? "#fff" : foreground} />
      <Chip.Label
        style={{
          color: active ? "#fff" : foreground,
          fontSize: 13,
          fontWeight: "500",
        }}
      >
        {label}
      </Chip.Label>
    </Chip>
  );
};

const FilterPillWithToggle = ({
  filterKey,
  label,
  icon,
  active,
  onToggleFilter,
}: {
  filterKey: SearchFilter;
  label: string;
  icon: IoniconName;
  active: boolean;
  onToggleFilter: (filter: SearchFilter) => void;
}) => {
  const handlePress = useCallback(() => {
    onToggleFilter(filterKey);
  }, [onToggleFilter, filterKey]);

  return (
    <FilterPill
      label={label}
      icon={icon}
      active={active}
      onPress={handlePress}
    />
  );
};

const ActionChip = ({ action }: { action: SearchActionMatch }) => {
  const accent = useThemeColor("accent");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const handlePress = action.onPress;

  return (
    <Chip
      onPress={handlePress}
      variant="secondary"
      color="default"
      style={{
        backgroundColor: "transparent",
        borderColor: muted,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Ionicons name={action.icon as IoniconName} size={14} color={accent} />
      <Chip.Label
        numberOfLines={1}
        style={{ color: foreground, fontSize: 13, fontWeight: "500" }}
      >
        {action.label}
      </Chip.Label>
    </Chip>
  );
};

export const SearchFilterBar = memo(function SearchFilterBar({
  activeFilters,
  availableFilters,
  onToggleFilter,
  allowNetwork,
  onToggleNetwork,
  actions = [],
}: {
  activeFilters: Set<SearchFilter>;
  availableFilters: Set<SearchFilter>;
  onToggleFilter: (filter: SearchFilter) => void;
  allowNetwork: boolean;
  onToggleNetwork: () => void;
  actions?: SearchActionMatch[];
}) {
  const accent = useThemeColor("accent");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const surface = useThemeColor("surface");
  const keyboardHeight = useKeyboardHeight();

  // Show filters that have results, plus always show all when no results yet
  const visibleFilters =
    availableFilters.size > 0
      ? FILTER_CONFIG.filter((f) => availableFilters.has(f.key))
      : FILTER_CONFIG;

  return (
    <View
      style={{
        backgroundColor: surface,
        borderTopColor: "rgba(255,255,255,0.06)",
        borderTopWidth: 1,
        bottom: Math.max(keyboardHeight, 0),
        height: 48,
        justifyContent: "center",
        left: 0,
        position: "absolute",
        right: 0,
        zIndex: 100,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
        }}
      >
        {/* Network toggle */}
        <Pressable
          onPress={onToggleNetwork}
          style={{
            alignItems: "center",
            backgroundColor: allowNetwork ? accent : "transparent",
            borderColor: allowNetwork ? accent : muted,
            borderRadius: 18,
            borderWidth: 1,
            height: 32,
            justifyContent: "center",
            width: 32,
          }}
        >
          <Ionicons
            name={allowNetwork ? "globe" : "globe-outline"}
            size={16}
            color={allowNetwork ? "#fff" : foreground}
          />
        </Pressable>

        {actions.map((action) => (
          <ActionChip key={`${action.type}-${action.label}`} action={action} />
        ))}

        {/* Category filters */}
        {visibleFilters.map((f) => (
          <FilterPillWithToggle
            key={f.key}
            filterKey={f.key}
            label={f.label}
            icon={f.icon}
            active={activeFilters.has(f.key)}
            onToggleFilter={onToggleFilter}
          />
        ))}
      </ScrollView>
    </View>
  );
});
