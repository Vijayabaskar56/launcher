import { useThemeColor } from "heroui-native";
import { use, useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppListContext } from "@/context/app-list";
import { useThemeOverrides } from "@/context/theme-overrides";

interface AppPickerSheetProps {
  visible: boolean;
  onSelect: (packageName: string, label: string) => void;
  onClose: () => void;
}

export const AppPickerSheet = ({
  visible,
  onSelect,
  onClose,
}: AppPickerSheetProps) => {
  const appList = use(AppListContext);
  const { accentColor, fontFamily, smallRadius } = useThemeOverrides();
  const [foreground, muted, surface] = useThemeColor([
    "foreground",
    "muted",
    "surface",
  ] as const);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApps = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const apps = [...appList.apps];
    apps.sort((a, b) => a.appName.localeCompare(b.appName));
    if (!query) {
      return apps;
    }
    return apps.filter((app) => app.appName.toLowerCase().includes(query));
  }, [appList.apps, searchQuery]);

  const handleSelect = useCallback(
    (packageName: string, label: string) => {
      onSelect(packageName, label);
      setSearchQuery("");
    },
    [onSelect]
  );

  const handleClose = useCallback(() => {
    setSearchQuery("");
    onClose();
  }, [onClose]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable
        style={{
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          flex: 1,
          justifyContent: "center",
          padding: 32,
        }}
        onPress={handleClose}
      >
        <Pressable
          style={{
            backgroundColor: surface,
            borderCurve: "continuous",
            borderRadius: 20,
            maxHeight: "75%",
            overflow: "hidden",
            width: "100%",
          }}
          onPress={() => {}}
        >
          <Text
            style={{
              color: foreground,
              fontFamily,
              fontSize: 20,
              fontWeight: "700",
              letterSpacing: -0.3,
              paddingBottom: 8,
              paddingHorizontal: 24,
              paddingTop: 24,
            }}
          >
            Select App
          </Text>

          {/* Search input */}
          <View
            style={{
              backgroundColor: `${muted}20`,
              borderCurve: "continuous",
              borderRadius: smallRadius,
              marginBottom: 8,
              marginHorizontal: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <TextInput
              placeholder="Search apps..."
              placeholderTextColor={muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                color: foreground,
                fontFamily,
                fontSize: 15,
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filteredApps}
            keyExtractor={(item) => item.packageName}
            style={{ maxHeight: 380 }}
            contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: app }) => (
              <Pressable
                onPress={() => handleSelect(app.packageName, app.appName)}
                style={({ pressed }) => ({
                  alignItems: "center",
                  borderCurve: "continuous",
                  borderRadius: smallRadius,
                  flexDirection: "row",
                  gap: 12,
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                })}
              >
                {app.icon ? (
                  <Image
                    source={{ uri: app.icon }}
                    style={{
                      borderRadius: 10,
                      height: 40,
                      width: 40,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: accentColor,
                      borderRadius: 10,
                      height: 40,
                      justifyContent: "center",
                      width: 40,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 18,
                        fontWeight: "700",
                      }}
                    >
                      {app.appName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    color: foreground,
                    flex: 1,
                    fontFamily,
                    fontSize: 15,
                    fontWeight: "500",
                    letterSpacing: -0.1,
                  }}
                  numberOfLines={1}
                >
                  {app.appName}
                </Text>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
