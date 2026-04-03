import {
  fetchBookingRules,
  fetchFeatures,
  fetchRoomById,
  fetchRoomHours,
  fetchRoomSeats,
  fetchTariffs,
} from "@/services/venues";
import type {
  BookingRules,
  FeatureItem,
  RoomDetails,
  RoomHours,
  SeatBrief,
  Tariff,
} from "@/types/venues";
import { Radii } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, Clock3, Grid2x2, MapPin, Ticket } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatWeekdayLabel(weekday: number, locale: string, fallback: string) {
  if (weekday < 1 || weekday > 7) {
    return fallback;
  }

  const monday = new Date(Date.UTC(2024, 0, 1));
  monday.setUTCDate(monday.getUTCDate() + weekday - 1);

  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(monday);
}

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseListParam = (value: string | string[] | undefined) => {
  const normalized = normalizeParam(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
};

function humanizeFeature(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFeatureLabel(feature: string, features: FeatureItem[]) {
  return features.find((item) => item.slug === feature || item.id === feature)?.name ?? humanizeFeature(feature);
}

function formatCurrency(amountCents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export default function RoomSeatsScreen() {
  const { colors, isDark } = useAppTheme();
  const { locale, t } = useI18n();
  const params = useLocalSearchParams<{
    id?: string | string[];
    roomName?: string | string[];
    roomFeatures?: string | string[];
    venueId?: string | string[];
    venueName?: string | string[];
    venueAddress?: string | string[];
    venueTimezone?: string | string[];
    allowFullRoomBooking?: string | string[];
  }>();

  const roomId = normalizeParam(params.id);
  const routeRoomName = normalizeParam(params.roomName) ?? t("booking.target.room");
  const routeVenueId = normalizeParam(params.venueId) ?? "";
  const routeVenueName = normalizeParam(params.venueName) ?? t("booking.target.venue");
  const routeVenueAddress = normalizeParam(params.venueAddress) ?? "";
  const routeVenueTimezone = normalizeParam(params.venueTimezone) ?? "";
  const routeRoomFeatures = parseListParam(params.roomFeatures);
  const routeAllowFullRoomBooking = normalizeParam(params.allowFullRoomBooking) === "true";

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [hours, setHours] = useState<RoomHours | null>(null);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [rules, setRules] = useState<BookingRules | null>(null);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [seats, setSeats] = useState<SeatBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoom = useCallback(async () => {
    if (!roomId) {
      setError(t("room.notFound"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [roomResult, hoursResult, tariffsResult, rulesResult, featuresResult, seatsResult] =
      await Promise.allSettled([
        fetchRoomById(roomId),
        fetchRoomHours(roomId),
        fetchTariffs(),
        fetchBookingRules("room", roomId),
        fetchFeatures(),
        fetchRoomSeats(roomId),
      ]);

    if (roomResult.status === "fulfilled") {
      const nextRoom = roomResult.value;
      setRoom(nextRoom);
      setSeats(nextRoom.seats?.length ? nextRoom.seats : seatsResult.status === "fulfilled" ? seatsResult.value : []);
    } else if (seatsResult.status === "fulfilled") {
      setRoom(null);
      setSeats(seatsResult.value);
    } else {
      setRoom(null);
      setSeats([]);
      setError(roomResult.reason instanceof Error ? roomResult.reason.message : t("service.venues.loadRoomDetails"));
    }

    setHours(hoursResult.status === "fulfilled" ? hoursResult.value : null);
    setTariffs(tariffsResult.status === "fulfilled" ? tariffsResult.value : []);
    setRules(rulesResult.status === "fulfilled" ? rulesResult.value : null);
    setFeatures(featuresResult.status === "fulfilled" ? featuresResult.value : []);
    setIsLoading(false);
  }, [roomId, t]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  const resolvedRoomName = room?.name ?? routeRoomName;
  const resolvedVenueId = room?.venueId ?? routeVenueId;
  const resolvedVenueName = room?.venueName ?? routeVenueName;
  const resolvedVenueAddress = routeVenueAddress;
  const resolvedTimezone = room?.timezone ?? hours?.timezone ?? routeVenueTimezone;
  const resolvedFeatures = room?.features?.length ? room.features : routeRoomFeatures;
  const allowFullRoomBooking = room?.allowFullRoomBooking ?? routeAllowFullRoomBooking;

  const sortedSeats = useMemo(
    () =>
      [...seats].sort(
        (left, right) =>
          left.gridY - right.gridY || left.gridX - right.gridX || left.label.localeCompare(right.label),
      ),
    [seats],
  );

  const relevantTariffs = useMemo(() => {
    return tariffs.filter((tariff) => {
      if (!tariff.active && tariff.active !== undefined) {
        return false;
      }

      if (!tariff.scopeId) {
        return tariff.scope === "global";
      }

      return tariff.scopeId === roomId || tariff.scopeId === resolvedVenueId;
    });
  }, [resolvedVenueId, roomId, tariffs]);

  const schedule = hours?.schedule ?? [];

  const openSeat = (seat: SeatBrief) => {
    if (!seat.active) {
      return;
    }

    router.push({
      pathname: "/booking/[id]",
      params: {
        id: seat.id,
        mode: "book",
        level: "seat",
        seatId: seat.id,
        seatLabel: seat.label,
        seatType: seat.seatType,
        roomId,
        roomName: resolvedRoomName,
        roomFeatures: resolvedFeatures.join("|"),
        venueId: resolvedVenueId,
        venueName: resolvedVenueName,
        venueAddress: resolvedVenueAddress,
        venueTimezone: resolvedTimezone,
      },
    });
  };

  const bookRoom = () => {
    if (!roomId || !allowFullRoomBooking) {
      return;
    }

    router.push({
      pathname: "/booking/[id]",
      params: {
        id: roomId,
        mode: "book",
        level: "room",
        roomId,
        roomName: resolvedRoomName,
        roomFeatures: resolvedFeatures.join("|"),
        venueId: resolvedVenueId,
        venueName: resolvedVenueName,
        venueAddress: resolvedVenueAddress,
        venueTimezone: resolvedTimezone,
      },
    });
  };

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
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "Inter",
              fontWeight: "700",
              fontSize: 20,
              color: colors.heading,
            }}
          >
            {resolvedRoomName}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              color: colors.textMuted,
            }}
          >
            {resolvedVenueName}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {isLoading ? (
          <StateCard colors={colors} isDark={isDark}>
            <ActivityIndicator size="small" color={colors.accent} />
            <StateText colors={colors}>{t("room.loading")}</StateText>
          </StateCard>
        ) : error ? (
          <StateCard colors={colors} isDark={isDark}>
            <TitleText colors={colors}>{t("room.errorTitle")}</TitleText>
            <StateText colors={colors}>{error}</StateText>
            <ActionButton colors={colors} label={t("common.retry")} onPress={() => void loadRoom()} />
          </StateCard>
        ) : (
          <>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: Radii.card,
                padding: 18,
                marginBottom: 16,
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
                  fontSize: 22,
                  color: colors.heading,
                  marginBottom: 8,
                }}
              >
                {resolvedRoomName}
              </Text>
              {room?.description ? (
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 14,
                    lineHeight: 21,
                    color: colors.textMuted,
                    marginBottom: 12,
                  }}
                >
                  {room.description}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <MapPin size={15} color={colors.icon} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: "Inter",
                    fontSize: 14,
                    color: colors.textMuted,
                  }}
                >
                  {resolvedVenueAddress || t("room.addressUnavailable")}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Clock3 size={15} color={colors.icon} />
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 14,
                    color: colors.textMuted,
                  }}
                >
                  {t("room.timezoneLabel", { value: resolvedTimezone || t("room.unknownTimezone") })}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                {allowFullRoomBooking
                  ? t("room.bookingModeFullAndSeat")
                  : t("room.bookingModeSeatOnly")}
              </Text>
              {allowFullRoomBooking ? (
                <View style={{ marginBottom: 14 }}>
                  <ActionButton colors={colors} label={t("room.bookEntireRoom")} onPress={bookRoom} />
                </View>
              ) : null}
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: colors.textMuted,
                  marginBottom: 14,
                }}
              >
                {t("room.capacitySummary", { count: room?.capacity ?? sortedSeats.length })}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {resolvedFeatures.map((feature) => (
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
                      {formatFeatureLabel(feature, features)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <SectionTitle colors={colors}>{t("room.section.rules")}</SectionTitle>
            <Card colors={colors} isDark={isDark}>
              <SummaryRow colors={colors} label={t("room.minimumDuration")} value={rules?.minDurationMinutes ? t("booking.minutes", { count: rules.minDurationMinutes }) : t("room.notSpecified")} />
              <SummaryRow colors={colors} label={t("room.maximumDuration")} value={rules?.maxDurationMinutes ? t("booking.minutes", { count: rules.maxDurationMinutes }) : t("room.notSpecified")} />
              <SummaryRow colors={colors} label={t("room.holdTtl")} value={rules?.holdTtlSeconds ? t("booking.minutes", { count: Math.round(rules.holdTtlSeconds / 60) }) : t("room.notSpecified")} />
              <SummaryRow colors={colors} label={t("room.advanceBooking")} value={rules?.advanceBookingDays ? t("room.days", { count: rules.advanceBookingDays }) : t("room.notSpecified")} />
              <SummaryRow colors={colors} label={t("room.paymentRequired")} value={rules?.paymentRequired ? t("room.yes") : t("room.no")} />
            </Card>

            <SectionTitle colors={colors}>{t("room.section.hours")}</SectionTitle>
            <Card colors={colors} isDark={isDark}>
              {schedule.length === 0 ? (
                <StateText colors={colors}>{t("room.hoursUnavailable")}</StateText>
              ) : (
                schedule.map((slot) => (
                  <View
                    key={`${slot.weekday}-${slot.opensAt}-${slot.closesAt}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontFamily: "Inter", fontSize: 14, color: colors.text }}>
                      {slot.dayLabel ?? formatWeekdayLabel(slot.weekday, locale, t("room.dayNumber", { count: slot.weekday }))}
                    </Text>
                    <Text style={{ fontFamily: "Inter", fontSize: 14, color: colors.textMuted }}>
                      {slot.closed ? t("room.closed") : `${slot.opensAt ?? "--:--"} - ${slot.closesAt ?? "--:--"}`}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <SectionTitle colors={colors}>{t("room.section.tariffs")}</SectionTitle>
            {relevantTariffs.length === 0 ? (
              <StateCard colors={colors} isDark={isDark}>
                <StateText colors={colors}>{t("room.noTariffs")}</StateText>
              </StateCard>
            ) : (
              <View style={{ gap: 12, marginBottom: 16 }}>
                {relevantTariffs.map((tariff) => (
                  <Card key={tariff.id} colors={colors} isDark={isDark}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <Ticket size={16} color={colors.accentStrong} />
                      <Text style={{ fontFamily: "Inter", fontWeight: "700", fontSize: 16, color: colors.heading }}>
                        {tariff.name}
                      </Text>
                    </View>
                    {tariff.description ? (
                      <Text style={{ fontFamily: "Inter", fontSize: 13, lineHeight: 20, color: colors.textMuted }}>
                        {tariff.description}
                      </Text>
                    ) : null}
                    <SummaryRow colors={colors} label={t("room.duration")} value={t("booking.minutes", { count: tariff.durationMinutes })} />
                    <SummaryRow colors={colors} label={t("room.price")} value={formatCurrency(tariff.priceAmountCents, tariff.currency, locale)} />
                    <SummaryRow colors={colors} label={t("room.scope")} value={tariff.scope} />
                  </Card>
                ))}
              </View>
            )}

            <SectionTitle colors={colors}>{allowFullRoomBooking ? t("room.section.orChooseSeat") : t("room.section.chooseSeat")}</SectionTitle>
            {sortedSeats.length === 0 ? (
              <StateCard colors={colors} isDark={isDark}>
                <TitleText colors={colors}>{t("room.noSeatsTitle")}</TitleText>
                <StateText colors={colors}>{t("room.noSeatsBody")}</StateText>
              </StateCard>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {sortedSeats.map((seat) => (
                  <TouchableOpacity
                    key={seat.id}
                    activeOpacity={seat.active ? 0.92 : 1}
                    disabled={!seat.active}
                    onPress={() => openSeat(seat)}
                    style={{
                      width: "47%",
                      backgroundColor: seat.active ? colors.surface : colors.disabledSurface,
                      borderRadius: 24,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: seat.active ? colors.cardBorder : colors.borderSoft,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: seat.active ? colors.surfaceMuted : colors.chip,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {seat.active ? (
                          <Check size={16} color={colors.accentStrong} />
                        ) : (
                          <Grid2x2 size={16} color={colors.textMuted} />
                        )}
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontSize: 12,
                          fontWeight: "600",
                          color: seat.active ? colors.success : colors.textMuted,
                        }}
                      >
                        {seat.active ? t("room.active") : t("room.inactive")}
                      </Text>
                    </View>

                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontWeight: "700",
                        fontSize: 18,
                        color: seat.active ? colors.heading : colors.disabledText,
                        marginBottom: 6,
                      }}
                    >
                      {seat.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 13,
                        color: seat.active ? colors.textMuted : colors.disabledText,
                        marginBottom: 6,
                      }}
                    >
                      {seat.seatType}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 12,
                        color: seat.active ? colors.textMuted : colors.disabledText,
                        marginBottom: 14,
                      }}
                    >
                      {t("room.gridPosition", { x: seat.gridX, y: seat.gridY })}
                    </Text>
                    <View
                      style={{
                        minHeight: 40,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: seat.active ? colors.accent : colors.disabledSurface,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontWeight: "700",
                          fontSize: 13,
                          color: seat.active ? colors.accentContrast : colors.disabledText,
                        }}
                      >
                        {seat.active ? t("room.selectSeat") : t("room.unavailable")}
                      </Text>
                    </View>
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

function Card({
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
        padding: 18,
        marginBottom: 16,
        gap: 10,
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
    <Card colors={colors} isDark={isDark}>
      <View style={{ alignItems: "center", gap: 12 }}>{children}</View>
    </Card>
  );
}

function SectionTitle({
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
        fontSize: 22,
        color: colors.heading,
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
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

function SummaryRow({
  colors,
  label,
  value,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  label: string;
  value: string;
}) {
  return (
    <Text
      style={{
        fontFamily: "Inter",
        fontSize: 14,
        color: colors.textMuted,
      }}
    >
      {label}: <Text style={{ color: colors.text, fontWeight: "600" }}>{value}</Text>
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







