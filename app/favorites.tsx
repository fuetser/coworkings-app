import { FavoriteVenueButton } from "@/components/favorite-venue-button";
import { Radii } from "@/constants/theme";
import { useFavoriteVenues } from "@/hooks/use-favorite-venues";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import type { FavoriteVenue } from "@/types/api";
import { router } from "expo-router";
import { ArrowLeft, MapPin } from "lucide-react-native";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoritesScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useI18n();
  const {
    error,
    favoriteVenues,
    favoriteVenuesCount,
    isLoading,
    isReady,
    pendingVenueIds,
    reloadFavorites,
    toggleFavoriteVenueId,
  } = useFavoriteVenues();

  const openVenue = (venue: FavoriteVenue) => {
    router.push({
      pathname: "/venue/[id]",
      params: { id: venue.id },
    });
  };

  const handleToggleFavorite = useCallback(
    async (venueId: string) => {
      try {
        await toggleFavoriteVenueId(venueId);
      } catch (nextError) {
        Alert.alert(
          t("favorites.updateErrorTitle"),
          nextError instanceof Error
            ? nextError.message
            : t("favorites.updateErrorBody"),
        );
      }
    },
    [t, toggleFavoriteVenueId],
  );

  const handleRetry = useCallback(() => {
    void reloadFavorites().catch(() => {
      // Error state is handled by the hook.
    });
  }, [reloadFavorites]);

  const isBusy = isLoading || !isReady;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Inter",
              fontWeight: "700",
              fontSize: 20,
              color: colors.heading,
            }}
          >
            {t("favorites.title")}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {t("favorites.savedCount", { count: favoriteVenuesCount })}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {isBusy ? (
          <StateCard colors={colors} isDark={isDark}>
            <ActivityIndicator size="small" color={colors.accent} />
            <StateText colors={colors}>{t("favorites.loading")}</StateText>
          </StateCard>
        ) : error ? (
          <StateCard colors={colors} isDark={isDark}>
            <TitleText colors={colors}>{t("favorites.errorTitle")}</TitleText>
            <StateText colors={colors}>{error}</StateText>
            <ActionButton colors={colors} label={t("common.retry")} onPress={handleRetry} />
          </StateCard>
        ) : favoriteVenues.length === 0 ? (
          <StateCard colors={colors} isDark={isDark}>
            <TitleText colors={colors}>{t("favorites.emptyTitle")}</TitleText>
            <StateText colors={colors}>
              {t("favorites.emptyBody")}
            </StateText>
            <ActionButton
              colors={colors}
              label={t("favorites.browse")}
              onPress={() => router.push("/(tabs)/book")}
            />
          </StateCard>
        ) : (
          <View style={{ gap: 16 }}>
            {favoriteVenues.map((venue) => {
              const isPendingFavorite = pendingVenueIds.has(venue.id);

              return (
                <TouchableOpacity
                  key={venue.id}
                  activeOpacity={0.92}
                  onPress={() => openVenue(venue)}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: Radii.card,
                    padding: 18,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.22 : 0.05,
                    shadowRadius: 12,
                    elevation: 3,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: "Inter",
                        fontWeight: "700",
                        fontSize: 18,
                        color: colors.heading,
                        lineHeight: 22,
                      }}
                    >
                      {venue.name}
                    </Text>
                    <FavoriteVenueButton
                      disabled={isPendingFavorite}
                      isFavorite
                      isLoading={isPendingFavorite}
                      onPress={() => handleToggleFavorite(venue.id)}
                    />
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <MapPin size={14} color={colors.icon} />
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 14,
                        color: colors.textMuted,
                        lineHeight: 20,
                        flexShrink: 1,
                      }}
                    >
                      {venue.address}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontWeight: "700",
                      fontSize: 24,
                      color: colors.text,
                      marginBottom: 14,
                    }}
                  >
                    {venue.availableWorkplaces} workplaces available
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {venue.features.map((feature) => (
                      <View
                        key={feature}
                        style={{
                          backgroundColor: colors.chip,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter",
                            fontSize: 12,
                            color: colors.chipText,
                          }}
                        >
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View
                    style={{
                      minHeight: 44,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
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
                      View Rooms
                    </Text>
                  </View>
                </TouchableOpacity>
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

function ActionButton({
  colors,
  label,
  onPress,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 20,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
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
        {label}
      </Text>
    </TouchableOpacity>
  );
}
