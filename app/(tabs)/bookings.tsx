import { getAdaptiveTabBarMetrics } from "@/constants/tab-bar";
import { Radii } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import {
  cancelBooking,
  fetchBookingHistory,
  fetchMyBookings,
  type BookingListStatus,
} from "@/services/bookings";
import type { BookingListItem } from "@/types/api";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const tabs: BookingListStatus[] = ["active", "past"];

const formatDateTimeRange = (startTime: string, endTime: string, locale: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startTime} - ${endTime}`;
  }

  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${day} · ${time.format(start)} - ${time.format(end)}`;
};

const getEmptyStateMessage = (
  activeTab: BookingListStatus,
  t: ReturnType<typeof useI18n>["t"],
) => {
  if (activeTab === "active") {
    return t("bookings.empty.active");
  }

  return t("bookings.empty.past");
};

export default function BookingsScreen() {
  const { colors, isDark } = useAppTheme();
  const { locale, t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<BookingListStatus>("active");
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = activeTab === "active"
        ? await fetchMyBookings("active")
        : await fetchBookingHistory();
      setBookings(response);
    } catch (nextError) {
      const message = nextError instanceof Error
        ? nextError.message
        : "Unable to load your bookings.";
      setBookings([]);
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const openBookingDetails = (bookingId: string) => {
    router.push({
      pathname: "/booking/[id]",
      params: { id: bookingId },
    });
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(t("bookings.cancelTitle"), t("bookings.cancelBody"), [
      {
        text: t("bookings.keep"),
        style: "cancel",
      },
      {
        text: t("bookings.cancelAction"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await cancelBooking(bookingId);
              await loadBookings(true);
              Alert.alert(
                t("bookings.cancelSuccessTitle"),
                t("bookings.cancelSuccessBody"),
              );
            } catch (error) {
              Alert.alert(
                t("bookings.cancelErrorTitle"),
                error instanceof Error ? error.message : t("bookings.cancelErrorBody"),
              );
            }
          })();
        },
      },
    ]);
  };

  const tabBarMetrics = getAdaptiveTabBarMetrics({
    bottomInset: insets.bottom,
    platform: Platform.OS,
    screenWidth: width,
  });

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.background,
          paddingTop: 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: 20,
            color: colors.heading,
            lineHeight: 25,
            letterSpacing: -0.5,
            textAlign: "center",
          }}
        >
          {t("bookings.title")}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
        <View
          style={{
            backgroundColor: colors.chip,
            borderRadius: 999,
            padding: 6,
            flexDirection: "row",
          }}
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: isSelected ? colors.surface : "transparent",
                  shadowColor: isSelected ? colors.shadow : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: isSelected ? 3 : 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontWeight: "500",
                    fontSize: 16,
                    color: isSelected ? colors.text : colors.textMuted,
                    textAlign: "center",
                    textTransform: "capitalize",
                  }}
                >
                  {t(`bookings.tab.${tab}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: tabBarMetrics.contentPaddingBottom,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadBookings(true);
            }}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <StateCard colors={colors} isDark={isDark}>
            <ActivityIndicator size="small" color={colors.accent} />
            <StateText colors={colors}>{t("bookings.loading")}</StateText>
          </StateCard>
        ) : error ? (
          <StateCard colors={colors} isDark={isDark}>
            <TitleText colors={colors}>
              {t("bookings.errorTitle")}
            </TitleText>
            <StateText colors={colors}>{error}</StateText>
            <TouchableOpacity
              onPress={() => {
                void loadBookings();
              }}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: colors.accent,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 14,
                  color: colors.accentContrast,
                }}
              >
                {t("common.retry")}
              </Text>
            </TouchableOpacity>
          </StateCard>
        ) : bookings.length === 0 ? (
          <StateCard colors={colors} isDark={isDark}>
            <TitleText colors={colors}>{t("bookings.emptyTitle")}</TitleText>
            <StateText colors={colors}>{getEmptyStateMessage(activeTab, t)}</StateText>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/book")}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: colors.accent,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 14,
                  color: colors.accentContrast,
                }}
              >
                {t("bookings.bookWorkspace")}
              </Text>
            </TouchableOpacity>
          </StateCard>
        ) : (
          <View style={{ gap: 16 }}>
            {bookings.map((booking) => {
              const canCancel = ["pending", "confirmed"].includes(booking.status);

              return (
                <View
                  key={booking.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: Radii.card,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.22 : 0.05,
                    shadowRadius: 12,
                    elevation: 3,
                    padding: 16,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontWeight: "700",
                      fontSize: 18,
                      color: colors.heading,
                      marginBottom: 8,
                    }}
                  >
                    {`${booking.level.toUpperCase()} ${t("bookings.typeSuffix")}`}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 14,
                      color: colors.textMuted,
                      marginBottom: 6,
                    }}
                  >
                    {formatDateTimeRange(booking.startTime, booking.endTime, locale)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 13,
                      color: colors.textMuted,
                      marginBottom: 4,
                    }}
                  >
                    {t("bookings.label.venue", { value: booking.venueId })}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 13,
                      color: colors.textMuted,
                      marginBottom: 12,
                    }}
                  >
                    {t("bookings.label.status", { value: booking.status })}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontWeight: "700",
                      fontSize: 16,
                      color: colors.text,
                      marginBottom: 16,
                    }}
                  >
                    {booking.priceAmountCents} {booking.priceCurrency}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: colors.buttonSecondaryBackground,
                        borderWidth: 1,
                        borderColor: colors.buttonSecondaryBorder,
                        paddingVertical: 12,
                        borderRadius: 999,
                        alignItems: "center",
                      }}
                      onPress={() => openBookingDetails(booking.id)}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontWeight: "700",
                          fontSize: 14,
                          color: colors.text,
                        }}
                      >
                        {t("bookings.viewDetails")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={!canCancel}
                      style={{
                        flex: 1,
                        backgroundColor: canCancel ? colors.accent : colors.buttonDisabled,
                        paddingVertical: 12,
                        borderRadius: 999,
                        alignItems: "center",
                      }}
                      onPress={() => handleCancelBooking(booking.id)}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontWeight: "700",
                          fontSize: 14,
                          color: colors.accentContrast,
                        }}
                      >
                        {t("bookings.cancelAction")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StateCard({
  children,
  colors,
  isDark,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isDark: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: Radii.card,
        padding: 24,
        alignItems: "center",
        gap: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.22 : 0.05,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function TitleText({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Text
      style={{
        fontFamily: "Inter",
        fontWeight: "700",
        fontSize: 20,
        color: colors.heading,
        textAlign: "center",
      }}
    >
      {children}
    </Text>
  );
}

function StateText({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Text
      style={{
        fontFamily: "Inter",
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 21,
        textAlign: "center",
      }}
    >
      {children}
    </Text>
  );
}
