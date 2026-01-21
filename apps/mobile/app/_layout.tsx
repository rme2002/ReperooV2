import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { BudgetProvider } from "@/components/budget/BudgetProvider";
import { ExperienceProvider } from "@/components/home/ExperienceProvider";
import { InsightsProvider } from "@/components/insights/InsightsProvider";
import { UserPreferencesProvider } from "@/components/profile/UserPreferencesProvider";
import { useSupabaseAuthSync } from "@/hooks/useSupabaseAuthSync";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, initializing } = useSupabaseAuthSync();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [initializing, router, segments, session]);

  if (initializing) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <UserPreferencesProvider session={session}>
        <BudgetProvider>
          <ExperienceProvider>
            <InsightsProvider>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen name="modal" options={{ presentation: "modal" }} />
              </Stack>
            </InsightsProvider>
          </ExperienceProvider>
        </BudgetProvider>
      </UserPreferencesProvider>
    </ThemeProvider>
  );
}
