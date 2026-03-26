import { useThemeColor } from "heroui-native";
import { memo, use, useCallback, useMemo } from "react";
import { SectionList, Text, View } from "react-native";

import { SettingsContext } from "@/context/settings";
import { sortedSections } from "@/lib/search-service";
import { SECTION_LABELS } from "@/types/search";
import type {
  SearchActionMatch,
  SearchFilter,
  SearchResult,
  SearchResultType,
} from "@/types/search";

import { ContactResultItem } from "./contact-result-item";
import { PermissionPromptItem } from "./permission-prompt-item";
import { SearchActionRow } from "./search-action-row";
import { SearchFilterBar } from "./search-filter-bar";
import { SearchResultItem } from "./search-result-item";

const MAX_COLLAPSED = 3;

const isPermissionPrompt = (result: SearchResult): boolean =>
  result.id.endsWith("-prompt");

const SectionHeader = ({ title }: { title: string }) => {
  const muted = useThemeColor("muted");

  return (
    <View
      style={{
        paddingBottom: 4,
        paddingHorizontal: 16,
        paddingTop: 12,
      }}
    >
      <Text
        style={{
          color: muted,
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
    </View>
  );
};

const RenderItem = ({
  item,
  callOnTap,
}: {
  item: SearchResult;
  callOnTap: boolean;
}) => {
  if (isPermissionPrompt(item)) {
    return <PermissionPromptItem result={item} />;
  }
  if (item.type === "contact") {
    return <ContactResultItem result={item} callOnTap={callOnTap} />;
  }
  return <SearchResultItem result={item} />;
};

interface SearchResultsListProps {
  results: Map<SearchResultType, SearchResult[]>;
  actions: SearchActionMatch[];
  activeFilters: Set<SearchFilter>;
  availableFilters: Set<SearchFilter>;
  onToggleFilter: (filter: SearchFilter) => void;
  allowNetwork: boolean;
  onToggleNetwork: () => void;
  filterBarEnabled: boolean;
}

export const SearchResultsList = memo(function SearchResultsList({
  results,
  actions,
  activeFilters,
  availableFilters,
  onToggleFilter,
  allowNetwork,
  onToggleNetwork,
  filterBarEnabled,
}: SearchResultsListProps) {
  const settingsCtx = use(SettingsContext);
  const callOnTap = settingsCtx?.state.search.contactCallOnTap ?? false;
  const muted = useThemeColor("muted");

  const sections = useMemo(() => {
    const sorted = sortedSections(results);
    const singleFilter = activeFilters.size === 1;

    return sorted.map((section) => ({
      data: singleFilter ? section.data : section.data.slice(0, MAX_COLLAPSED),
      fullCount: section.data.length,
      key: section.type,
      title: SECTION_LABELS[section.type] ?? section.type,
    }));
  }, [results, activeFilters]);

  const hasResults = sections.length > 0 || actions.length > 0;

  const keyExtractor = useCallback((item: SearchResult) => item.id, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <SectionHeader title={section.title} />
    ),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <RenderItem item={item} callOnTap={callOnTap} />
    ),
    [callOnTap]
  );

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={<SearchActionRow actions={actions} />}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          hasResults ? null : (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ color: muted, fontSize: 15 }}>
                No results found
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Filter bar docked above keyboard */}
      {filterBarEnabled ? (
        <SearchFilterBar
          activeFilters={activeFilters}
          availableFilters={availableFilters}
          onToggleFilter={onToggleFilter}
          allowNetwork={allowNetwork}
          onToggleNetwork={onToggleNetwork}
        />
      ) : null}
    </View>
  );
});
