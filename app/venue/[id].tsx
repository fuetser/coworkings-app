import { FavoriteVenueButton } from "@/components/favorite-venue-button";
import { fetchVenueById, fetchVenueRooms } from "@/services/venues";
import type { RoomBrief, VenueFull } from "@/types/venues";
import { Radii } from "@/constants/theme";
import { useFavoriteVenues } from "@/hooks/use-favorite-venues";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Clock3, MapPin } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function VenueDetailsScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useI18n();
  const { isFavoriteVenueId, pendingVenueIds, toggleFavoriteVenueId } = useFavoriteVenues();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const venueId = normalizeParam(params.id);
  const [venue, setVenue] = useState<VenueFull | null>(null);
  const [rooms, setRooms] = useState<RoomBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVenue = useCallback(async () => {
    if (!venueId) {
      setError(t("venue.notFound"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const venueDetails = await fetchVenueById(venueId);
      setVenue(venueDetails);

      try {
        const nextRooms = await fetchVenueRooms(venueId);
        setRooms(nextRooms);
      } catch {
        setRooms(venueDetails.rooms ?? []);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : t("service.venues.loadVenueDetails"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, venueId]);

  useEffect(() => {
    void loadVenue();
  }, [loadVenue]);

  const coordinatesLabel = useMemo(() => {
    const lat = venue?.location?.lat;
    const lon = venue?.location?.lon;

    if (typeof lat !== "number" || typeof lon !== "number") {
      return t("venue.coordinatesUnavailable");
    }

    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }, [t, venue]);

  const openRoom = (room: RoomBrief) => {
    if (!venue) {
      return;
    }

    router.push({
      pathname: "/room/[id]",
      params: {
        id: room.id,
        venueId: venue.id,
        venueName: venue.name,
        venueAddress: venue.address,
        venueTimezone: venue.timezone,
        roomName: room.name,
        roomFeatures: room.features.join("|"),
        allowFullRoomBooking: room.allowFullRoomBooking ? "true" : "false",
      },
    });
  };

  const handleToggleFavorite = useCallback(async () => {
    if (!venue) {
      return;
    }

    try {
      await toggleFavoriteVenueId(venue.id);
    } catch (nextError) {
      Alert.alert(
        t("venue.updateErrorTitle"),
        nextError instanceof Error
          ? nextError.message
          : t("venue.updateErrorBody"),
      );
    }
  }, [t, toggleFavoriteVenueId, venue]);

  const isFavorite = venue ? isFavoriteVenueId(venue.id) : false;
  const isFavoritePending = venue ? pendingVenueIds.has(venue.id) : false;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
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
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: 20,
            color: colors.heading,
          }}
        >
          {venue?.name ?? t("venue.detailsTitle")}
        </Text>
        {venue ? (
          <FavoriteVenueButton
            disabled={isFavoritePending}
            isFavorite={isFavorite}
            isLoading={isFavoritePending}
            onPress={handleToggleFavorite}
          />
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {isLoading ? (
          <StateCard colors={colors} isDark={isDark}>
            <ActivityIndicator size="small" color={colors.accent} />
            <StateText colors={colors}>{t("venue.loading")}</StateText>
          </StateCard>
        ) : error || !venue ? (
          <StateCard colors={colors} isDark={isDark}>
            <TitleText colors={colors}>{t("venue.errorTitle")}</TitleText>
            <StateText colors={colors}>{error ?? t("venue.notFound")}</StateText>
            <ActionButton colors={colors} label={t("common.retry")} onPress={() => void loadVenue()} />
          </StateCard>
        ) : (
          <>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: Radii.card,
                padding: 20,
                marginBottom: 16,
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
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontFamily: "Inter",
                    fontWeight: "700",
                    fontSize: 26,
                    color: colors.heading,
                    lineHeight: 32,
                  }}
                >
                  {venue.name}
                </Text>
                <FavoriteVenueButton
                  disabled={isFavoritePending}
                  isFavorite={isFavorite}
                  isLoading={isFavoritePending}
                  onPress={handleToggleFavorite}
                />
              </View>

              <MetaRow colors={colors} icon={<MapPin size={15} color={colors.icon} />}>
                {venue.address}
              </MetaRow>
              <MetaRow colors={colors} icon={<Clock3 size={15} color={colors.icon} />}>
                {venue.timezone}
              </MetaRow>

              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 13,
                  color: colors.textMuted,
                  marginTop: 12,
                  marginBottom: 16,
                }}
              >
                {t("venue.coordinates", { value: coordinatesLabel })}
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {venue.features.map((feature) => (
                  <View
                    key={feature}
                    style={{
                      backgroundColor: colors.chip,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
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
            </View>

            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: 22,
                color: colors.heading,
                marginBottom: 12,
              }}
            >
              {t("venue.rooms")}
            </Text>

            {rooms.length === 0 ? (
              <StateCard colors={colors} isDark={isDark}>
                <TitleText colors={colors}>{t("venue.noRoomsTitle")}</TitleText>
                <StateText colors={colors}>
                  {t("venue.noRoomsBody")}
                </StateText>
              </StateCard>
            ) : (
              <View style={{ gap: 16 }}>
                {rooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    activeOpacity={0.92}
                    onPress={() => openRoom(room)}
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
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontWeight: "700",
                        fontSize: 18,
                        color: colors.heading,
                        marginBottom: 10,
                      }}
                    >
                      {room.name}
                    </Text>

                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 14,
                        color: colors.textMuted,
                        marginBottom: 12,
                      }}
                      >
                      {room.allowFullRoomBooking
                        ? t("venue.roomWholeBooking")
                        : t("venue.roomSeatBooking")}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >
                      {room.features.map((feature) => (
                        <View
                          key={feature}
                          style={{
                            backgroundColor: colors.chip,
                            borderRadius: 999,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
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

                    <ActionButton
                      colors={colors}
                      label={room.allowFullRoomBooking ? t("venue.viewBookingOptions") : t("venue.browseSeats")}
                      onPress={() => openRoom(room)}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
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
  children: ReactNode;
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
  children: ReactNode;
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
  children: ReactNode;
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

function MetaRow({
  children,
  colors,
  icon,
}: {
  children: ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
  icon: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
      }}
    >
      {icon}
      <Text
        style={{
          flex: 1,
          fontFamily: "Inter",
          fontSize: 14,
          color: colors.textMuted,
          lineHeight: 20,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

