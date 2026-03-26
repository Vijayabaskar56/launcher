import "../global.css";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { HeroUINativeProvider } from "heroui-native";
import type { HeroUINativeConfig } from "heroui-native";
import { use, useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppListContext, AppListProvider } from "@/context/app-list";
import { DrawerMetadataProvider } from "@/context/drawer-metadata";
import { LauncherConfigProvider } from "@/context/launcher-config";
import { SettingsContext, SettingsProvider } from "@/context/settings";
import { ThemeOverridesProvider } from "@/context/theme-overrides";
import { WidgetConfigProvider } from "@/context/widget-config";

/** Bridges AppListContext into DrawerMetadataProvider as a prop */
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const appList = use(AppListContext);
  const installedPackages = useMemo(
    () => appList.apps.map((a) => a.packageName),
    [appList.apps]
  );
  return (
    <DrawerMetadataProvider installedPackages={installedPackages}>
      {children}
    </DrawerMetadataProvider>
  );
};

/** Applies screen orientation lock from settings. Rendered inside SettingsProvider. */
const OrientationLock = () => {
  const settings = use(SettingsContext);
  const fixedRotation = settings?.state.homescreen.fixedRotation ?? false;

  useEffect(() => {
    if (fixedRotation) {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    }
  }, [fixedRotation]);

  return null;
};

const config: HeroUINativeConfig = {
  devInfo: {
    stylingPrinciples: false,
  },
};

const RootLayout = () => {
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={config}>
        <SettingsProvider>
          <OrientationLock />
          <ThemeOverridesProvider>
            <LauncherConfigProvider>
              <AppListProvider>
                <AppProviders>
                  <WidgetConfigProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen
                        name="settings"
                        options={{
                          headerShown: false,
                          presentation: "card",
                        }}
                      />
                      <Stack.Screen
                        name="widgets/edit"
                        options={{
                          headerShown: true,
                          presentation: "card",
                          title: "Edit Widgets",
                        }}
                      />
                    </Stack>
                  </WidgetConfigProvider>
                </AppProviders>
              </AppListProvider>
            </LauncherConfigProvider>
          </ThemeOverridesProvider>
        </SettingsProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
