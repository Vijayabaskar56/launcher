import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

import { IconAccent, ICON_MAP } from "@/components/ui/icon";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center p-6">
        <View className="items-center">
          <IconAccent name={ICON_MAP.warning} size={64} className="mb-4" />
          <Text className="text-2xl font-bold text-foreground text-center mb-2">
            Page Not Found
          </Text>
          <Text className="text-base text-muted-foreground mb-8 max-w-[280] text-center">
            Sorry, the page you&apos;re looking for doesn&apos;t exist.
          </Text>
          <Link href="/" className="bg-primary/10 px-6 py-3 rounded-xl">
            <Text className="text-base font-medium text-primary">
              Go to Home
            </Text>
          </Link>
        </View>
      </View>
    </>
  );
}
