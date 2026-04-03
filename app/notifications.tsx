import { Radii } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { fetchNotifications } from "@/services/notifications";
import type { NotificationInboxItem } from "@/types/api";
import { router } from "expo-router";
import { ArrowLeft, Bell } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_LIMIT = 20;

function formatNotificationTitle(
  item: NotificationInboxItem,
  sourceFallback: string,
) {
  if (typeof item.title === "string" && item.title.trim()) {
    return item.title.trim();
  }

  const source =
    (typeof item.type === "string" && item.type.trim()) ||
    (typeof item.channel === "string" && item.channel.trim()) ||
    sourceFallback;

  return source
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatNotificationBody(
  item: NotificationInboxItem,
  emptyBodyFallback: string,
) {
  const messageCandidates = [item.message, item.body];

  for (const candidate of messageCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return emptyBodyFallback;
}

function formatNotificationMeta(item: NotificationInboxItem, locale: string) {
  const parts: string[] = [];

  if (typeof item.type === "string" && item.type.trim()) {
    parts.push(
      item.type
        .trim()
        .split("_")
        .join(" "),
    );
  }

  if (typeof item.channel === "string" && item.channel.trim()) {
    parts.push(item.channel.trim().toUpperCase());
  }

  if (typeof item.createdAt === "string" && item.createdAt.trim()) {
    const date = new Date(item.createdAt);

    if (!Number.isNaN(date.getTime())) {
      parts.push(
        new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date),
      );
    }
  }

  return parts.join(" · ");
}

export default function NotificationsScreen() {
  const { colors, isDark } = useAppTheme();
  const { locale, t } = useI18n();
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = useMemo(() => items.length < total, [items.length, total]);

  const loadPage = useCallback(async (nextPage: number, mode: "replace" | "append") => {
    if (mode === "replace") {
      setIsInitialLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await fetchNotifications({
        page: nextPage,
        limit: PAGE_LIMIT,
      });

      setItems((current) =>
        mode === "replace" ? response.items : [...current, ...response.items],
      );
      setPage(response.page);
      setTotal(response.total);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : t("service.notifications.loadNotifications"),
      );
    } finally {
      if (mode === "replace") {
        setIsInitialLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadPage(1, "replace");
  }, [loadPage]);

  const handleRetry = useCallback(() => {
    void loadPage(1, "replace");
  }, [loadPage]);

  const handleLoadMore = useCallback(() => {
    if (isInitialLoading || isLoadingMore || !hasMore) {
      return;
    }

    void loadPage(page + 1, "append");
  }, [hasMore, isInitialLoading, isLoadingMore, loadPage, page]);

  const renderEmpty = () => {
    if (isInitialLoading) {
      return null;
    }

    if (error) {
      return (
        <StateCard colors={colors} isDark={isDark}>
          <TitleText colors={colors}>{t("notifications.errorTitle")}</TitleText>
          <BodyText colors={colors}>{error}</BodyText>
          <ActionButton colors={colors} label={t("common.retry")} onPress={handleRetry} />
        </StateCard>
      );
    }

    return (
      <StateCard colors={colors} isDark={isDark}>
        <TitleText colors={colors}>{t("notifications.emptyTitle")}</TitleText>
        <BodyText colors={colors}>{t("notifications.emptyBody")}</BodyText>
      </StateCard>
    );
  };

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
            {t("notifications.title")}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {total > 0
              ? t("notifications.subtitleLoaded", {
                  items: items.length,
                  total,
                })
              : t("notifications.subtitleDefault")}
          </Text>
        </View>
      </View>

      {isInitialLoading ? (
        <View style={{ flex: 1, paddingHorizontal: 16, justifyContent: "center" }}>
          <StateCard colors={colors} isDark={isDark}>
            <ActivityIndicator size="small" color={colors.accent} />
            <BodyText colors={colors}>{t("common.loading")}</BodyText>
          </StateCard>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 14 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => {
            const title = formatNotificationTitle(item, t("notifications.sourceFallback"));
            const body = formatNotificationBody(item, t("notifications.emptyBodyFallback"));
            const meta = formatNotificationMeta(item, locale);

            return (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: Radii.card,
                  padding: 18,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.22 : 0.05,
                  shadowRadius: 12,
                  elevation: 3,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.surfaceMuted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Bell size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontWeight: "700",
                        fontSize: 16,
                        color: colors.heading,
                        lineHeight: 20,
                      }}
                    >
                      {title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 14,
                        color: colors.text,
                        lineHeight: 21,
                      }}
                    >
                      {body}
                    </Text>
                    {meta ? (
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontSize: 12,
                          color: colors.textMuted,
                          lineHeight: 18,
                        }}
                      >
                        {meta}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : null
          }
        />
      )}
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
        fontSize: 18,
        color: colors.heading,
        textAlign: "center",
      }}
    >
      {children}
    </Text>
  );
}

function BodyText({
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
        textAlign: "center",
        lineHeight: 21,
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
        marginTop: 4,
        backgroundColor: colors.accent,
        borderRadius: 999,
        paddingHorizontal: 20,
        paddingVertical: 12,
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
