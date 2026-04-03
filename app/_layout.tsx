import { ThemeProvider } from "@react-navigation/native";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getNavigationTheme } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { FavoriteVenuesProvider } from "@/hooks/use-favorite-venues";
import { usePushRegistration } from "@/hooks/use-push-registration";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { AppThemeProvider } from "@/providers/theme-provider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <FavoriteVenuesProvider>
              <RootNavigator />
            </FavoriteVenuesProvider>
          </AuthProvider>
        </LanguageProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { colors, theme } = useAppTheme();
  const { status } = useAuth();
  const navigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();

  usePushRegistration(status === "authenticated");

  useEffect(() => {
    if (!navigationState?.key || status === "loading") {
      return;
    }

    const isAuthRoute = segments[0] === "(auth)";

    if (status === "unauthenticated" && !isAuthRoute) {
      router.replace("/(auth)/login");
    }

    if (status === "authenticated" && isAuthRoute) {
      router.replace("/(tabs)/book");
    }
  }, [navigationState?.key, router, segments, status]);

  return (
    <ThemeProvider value={getNavigationTheme(theme)}>
      {status === "loading" ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
          }}
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
          <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="favorites" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
          <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
          <Stack.Screen name="venue/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="room/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="coworkings" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)/forgot-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(auth)/reset-password"
            options={{ headerShown: false }}
          />
        </Stack>
      )}
      <StatusBar style={colors.statusBar} backgroundColor={colors.background} />
    </ThemeProvider>
  );
}
