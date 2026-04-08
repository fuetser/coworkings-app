import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/providers/auth-provider";

export default function IndexRoute() {
  const { colors } = useAppTheme();
  const { status } = useAuth();

  if (status === "loading") {
    return (
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
    );
  }

  if (status === "authenticated") {
    return <Redirect href="/(tabs)/book" />;
  }

  return <Redirect href="/(auth)/login" />;
}
