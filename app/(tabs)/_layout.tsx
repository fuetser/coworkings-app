import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarStyle: {
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 16,
          height: 68,
          paddingTop: 0,
          paddingBottom: Platform.OS === "ios" ? 10 : 12,
          marginHorizontal: 16,
          borderTopWidth: 0,
          borderRadius: 36,
          backgroundColor: colors.tabBar,
          elevation: 10,
          shadowColor: colors.tabBarShadow,
          shadowOpacity: isDark ? 0.42 : 0.28,
          shadowRadius: 22,
          shadowOffset: {
            width: 0,
            height: 8,
          },
        },
      }}
    >
      <Tabs.Screen
        name="book"
        options={{
          title: t("tabs.book"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t("tabs.bookings"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
