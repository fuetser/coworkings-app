import { FavoriteVenueButton } from "@/components/favorite-venue-button";
import { getAdaptiveTabBarMetrics } from "@/constants/tab-bar";
import { Radii } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useFavoriteVenues } from "@/hooks/use-favorite-venues";
import { useI18n } from "@/hooks/use-i18n";
import { fetchVenues } from "@/services/venues";
import type { VenueListFilters, VenueListItem } from "@/types/venues";
import { router } from "expo-router";
import { MapPin, Search, SlidersHorizontal } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function BookScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isFavoriteVenueId, pendingVenueIds, toggleFavoriteVenueId } =
    useFavoriteVenues();
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const filters = useMemo<VenueListFilters>(
    () => ({
      q: searchQuery.trim() || undefined,
      location: location.trim() || undefined,
      date: date.trim() || undefined,
      capacity: capacity.trim() ? Number(capacity) : undefined,
      features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
    }),
    [capacity, date, location, searchQuery, selectedFeatures],
  );

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const nextVenues = await fetchVenues(filters);
          if (!isMounted) {
            return;
          }
          setVenues(nextVenues);
        } catch (nextError) {
          if (!isMounted) {
            return;
          }
          setVenues([]);
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to load coworking locations.",
          );
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [filters]);

  const allFeatures = useMemo(
    () =>
      [
        ...new Set(
          venues.flatMap((venue) => venue.features).concat(selectedFeatures),
        ),
      ].sort(),
    [selectedFeatures, venues],
  );

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature],
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setLocation("");
    setDate("");
    setCapacity("");
    setSelectedFeatures([]);
  };

  const openVenue = (venue: VenueListItem) => {
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
          t("book.errorTitle"),
          nextError instanceof Error
            ? nextError.message
            : t("book.errorBody"),
        );
      }
    },
    [t, toggleFavoriteVenueId],
  );

  const tabBarMetrics = getAdaptiveTabBarMetrics({
    bottomInset: insets.bottom,
    platform: Platform.OS,
    screenWidth: width,
  });

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
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: 24,
            color: colors.heading,
            lineHeight: 30,
            letterSpacing: -0.6,
            marginBottom: 6,
          }}
        >
          {t("book.title")}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.inputBackground,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              paddingHorizontal: 14,
            }}
          >
            <Search size={18} color={colors.inputPlaceholder} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("book.searchPlaceholder")}
              placeholderTextColor={colors.inputPlaceholder}
              style={{
                flex: 1,
                paddingVertical: 12,
                fontFamily: "Inter",
                fontSize: 14,
                color: colors.inputText,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={() => setShowFilters((current) => !current)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: colors.buttonSecondaryBackground,
              borderWidth: 1,
              borderColor: colors.buttonSecondaryBorder,
            }}
          >
            <SlidersHorizontal size={16} color={colors.text} />
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "500",
                fontSize: 14,
                color: colors.text,
              }}
            >
              {t("book.filters")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: colors.textMuted,
          }}
        >
          {isLoading
            ? t("book.loadingVenues")
            : t("book.venuesCount", { count: venues.length })}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: tabBarMetrics.contentPaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {showFilters ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 28,
              padding: 16,
              marginBottom: 16,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.22 : 0.05,
              shadowRadius: 12,
              elevation: 3,
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 16,
                  color: colors.heading,
                }}
              >
                {t("book.filter.backend")}
              </Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontWeight: "600",
                    fontSize: 14,
                    color: colors.accent,
                  }}
                >
                  {t("book.filter.clearAll")}
                </Text>
              </TouchableOpacity>
            </View>

            <FilterInput
              colors={colors}
              label={t("book.filter.location")}
              value={location}
              onChangeText={setLocation}
              placeholder={t("book.filter.locationExample")}
            />
            <FilterInput
              colors={colors}
              label={t("book.filter.date")}
              value={date}
              onChangeText={setDate}
              placeholder={t("book.filter.datePlaceholder")}
            />
            <FilterInput
              colors={colors}
              keyboardType="numeric"
              label={t("book.filter.capacity")}
              value={capacity}
              onChangeText={setCapacity}
              placeholder={t("book.filter.capacityExample")}
            />

            <View>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 16,
                  color: colors.heading,
                  marginBottom: 10,
                }}
              >
                {t("book.filter.features")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {allFeatures.map((feature) => {
                  const isSelected = selectedFeatures.includes(feature);
                  return (
                    <TouchableOpacity
                      key={feature}
                      onPress={() => toggleFeature(feature)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: isSelected
                          ? colors.chipActive
                          : colors.surface,
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontSize: 13,
                          fontWeight: "500",
                          color: isSelected
                            ? colors.chipTextActive
                            : colors.chipText,
                        }}
                      >
                        {feature}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ gap: 16 }}>
          {isLoading ? (
            <StateCard colors={colors} isDark={isDark}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: colors.textMuted,
                }}
              >
                {t("book.loadingVenues")}
              </Text>
            </StateCard>
          ) : error ? (
            <StateCard colors={colors} isDark={isDark}>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 20,
                  color: colors.heading,
                  lineHeight: 26,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {t("book.errorLoadTitle")}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: colors.textMuted,
                  lineHeight: 21,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {error}
              </Text>
              <TouchableOpacity
                onPress={clearFilters}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
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
                  {t("book.errorResetFilters")}
                </Text>
              </TouchableOpacity>
            </StateCard>
          ) : venues.length === 0 ? (
            <StateCard colors={colors} isDark={isDark}>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 20,
                  color: colors.heading,
                  lineHeight: 26,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {t("book.noMatchesTitle")}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: colors.textMuted,
                  lineHeight: 21,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {t("book.noMatchesBody")}
              </Text>
              <TouchableOpacity
                onPress={clearFilters}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: colors.accentSoft,
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
                  {t("book.errorResetFilters")}
                </Text>
              </TouchableOpacity>
            </StateCard>
          ) : (
            venues.map((venue) => {
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
                      isFavorite={isFavoriteVenueId(venue.id)}
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
                    {t("book.workplacesAvailable", {
                      count: venue.availableWorkplaces,
                    })}
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
                      {t("book.cta.viewRooms")}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterInput({
  colors,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  keyboardType?: "default" | "numeric";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View>
      <Text
        style={{
          fontFamily: "Inter",
          fontWeight: "600",
          fontSize: 13,
          color: colors.text,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        style={{
          backgroundColor: colors.inputBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: "Inter",
          fontSize: 14,
          color: colors.inputText,
        }}
      />
    </View>
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
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.22 : 0.05,
        shadowRadius: 12,
        elevation: 3,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}
