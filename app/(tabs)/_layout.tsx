import { Tabs } from "expo-router";
import React from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAdaptiveTabBarMetrics } from "@/constants/tab-bar";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarMetrics = getAdaptiveTabBarMetrics({
    bottomInset: insets.bottom,
    platform: Platform.OS,
    screenWidth: width,
  });

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: tabBarMetrics.labelFontSize,
          fontWeight: "500",
          marginTop: tabBarMetrics.labelMarginTop,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: tabBarMetrics.itemPaddingVertical,
        },
        tabBarStyle: {
          position: "absolute",
          left: tabBarMetrics.horizontalInset,
          right: tabBarMetrics.horizontalInset,
          marginHorizontal: tabBarMetrics.outerHorizontalMargin,
          bottom: tabBarMetrics.bottomOffset,
          height: tabBarMetrics.height,
          paddingTop: tabBarMetrics.paddingTop,
          paddingBottom: tabBarMetrics.paddingBottom,
          borderTopWidth: 0,
          borderRadius: tabBarMetrics.height / 2,
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
