import { Radii } from "@/constants/theme";
import type { AppLanguage } from "@/constants/i18n";
import { useFavoriteVenues } from "@/hooks/use-favorite-venues";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/services/notifications";
import type { NotificationPreferences } from "@/types/api";
import { router } from "expo-router";
import {
  Bell,
  ChevronRight,
  Globe,
  Heart,
  HelpCircle,
  LogOut,
  Moon,
  ShieldCheck,
  User,
} from "lucide-react-native";
import { ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SETTINGS_ROW_HEIGHT = 56;
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailNotifications: false,
  pushNotifications: true,
  reminderBeforeBooking: true,
  promotionalEmails: false,
};

type MenuButtonProps = {
  icon: typeof Bell;
  label: string;
  onPress?: () => void;
  showBorder?: boolean;
  showChevron?: boolean;
  value?: string;
  rightSlot?: ReactNode;
};

export default function Profile() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { language, setLanguage, t } = useI18n();
  const { favoriteVenuesCount } = useFavoriteVenues();
  const { logout, user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      setIsLoadingPreferences(true);
      try {
        const nextPreferences = await fetchNotificationPreferences();
        if (!isMounted) {
          return;
        }
        setPreferences(nextPreferences);
        setPreferencesMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setPreferencesMessage(
          error instanceof Error
            ? `${error.message} ${t("profile.notificationsFallbackSuffix")}`
            : t("profile.notificationsFallbackSuffix"),
        );
      } finally {
        if (isMounted) {
          setIsLoadingPreferences(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const handleLogout = () => {
    Alert.alert(
      t("profile.logoutTitle"),
      t("profile.logoutBody"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("profile.logout"),
          onPress: () => {
            void logout();
          },
          style: "destructive",
        },
      ],
      { cancelable: true },
    );
  };

  const updatePreference = (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
    setPreferencesMessage(null);
  };

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      await updateNotificationPreferences(preferences);
      setPreferencesMessage(t("profile.notificationsSaved"));
    } catch (error) {
      setPreferencesMessage(
        error instanceof Error
          ? error.message
          : t("profile.notificationsError"),
      );
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const languageOptions: { label: string; value: AppLanguage }[] = [
    { label: t("profile.language.en"), value: "en" },
    { label: t("profile.language.ru"), value: "ru" },
  ];

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
  };

  const MenuButton = ({
    icon: Icon,
    label,
    value,
    onPress,
    showBorder = true,
    showChevron = true,
    rightSlot,
  }: MenuButtonProps) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={getSettingsRowStyle(colors, showBorder)}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon size={20} color={colors.icon} />
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 16,
            color: colors.text,
          }}
        >
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {rightSlot}
        {value ? (
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              color: colors.textMuted,
            }}
          >
            {value}
          </Text>
        ) : null}
        {showChevron ? <ChevronRight size={20} color={colors.icon} /> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
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
            {t("profile.title")}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: Radii.card,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.22 : 0.05,
              shadowRadius: 12,
              elevation: 3,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={30} color={colors.accentContrast} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 18,
                  color: colors.heading,
                  lineHeight: 22.5,
                  marginBottom: 4,
                }}
              >
                {user?.name ?? t("profile.fallbackName")}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  color: colors.textMuted,
                  lineHeight: 21,
                }}
              >
                {user?.email ?? t("profile.fallbackEmail")}
              </Text>
            </View>
          </View>
        </View>

        <Section title={t("profile.section.profile")} colors={colors} isDark={isDark}>
          <MenuButton
            icon={User}
            label={t("profile.editProfile")}
            onPress={() => router.push("/profile-edit")}
            showBorder={false}
          />
        </Section>

        <Section title={t("profile.section.notifications")} colors={colors} isDark={isDark}>
          {isLoadingPreferences ? (
            <View style={{ padding: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : (
            <>
              <SettingRow
                colors={colors}
                icon={Bell}
                label={t("profile.notifications.push")}
                value={preferences.pushNotifications}
                onValueChange={(value) => updatePreference("pushNotifications", value)}
              />
              <SettingRow
                colors={colors}
                icon={Bell}
                label={t("profile.notifications.email")}
                value={preferences.emailNotifications}
                onValueChange={(value) => updatePreference("emailNotifications", value)}
              />
              <SettingRow
                colors={colors}
                icon={Bell}
                label={t("profile.notifications.reminders")}
                value={preferences.reminderBeforeBooking}
                onValueChange={(value) => updatePreference("reminderBeforeBooking", value)}
              />
              <SettingRow
                colors={colors}
                icon={Bell}
                label={t("profile.notifications.promotions")}
                value={preferences.promotionalEmails}
                onValueChange={(value) => updatePreference("promotionalEmails", value)}
                showBorder={false}
              />
            </>
          )}
        </Section>

        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <TouchableOpacity
            onPress={() => {
              void handleSavePreferences();
            }}
            disabled={isLoadingPreferences || isSavingPreferences}
            style={{
              backgroundColor:
                isLoadingPreferences || isSavingPreferences ? colors.buttonDisabled : colors.accent,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            {isSavingPreferences ? (
              <ActivityIndicator size="small" color={colors.accentContrast} />
            ) : (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "700",
                  fontSize: 16,
                  color: colors.accentContrast,
                }}
              >
                {t("profile.saveNotifications")}
              </Text>
            )}
          </TouchableOpacity>
          {preferencesMessage ? (
            <Text
              style={{
                marginTop: 10,
                fontFamily: "Inter",
                fontSize: 13,
                lineHeight: 19,
                color: colors.textMuted,
                textAlign: "center",
              }}
            >
              {preferencesMessage}
            </Text>
          ) : null}
        </View>

        <Section title={t("profile.section.inbox")} colors={colors} isDark={isDark}>
          <MenuButton
            icon={Bell}
            label={t("profile.inbox")}
            onPress={() => router.push("/notifications")}
            showChevron
            showBorder={false}
          />
        </Section>

        <Section title={t("profile.section.preferences")} colors={colors} isDark={isDark}>
          <View style={getSettingsRowStyle(colors, true)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <Globe size={20} color={colors.icon} />
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 16,
                  color: colors.text,
                  flexShrink: 1,
                }}
              >
                {t("profile.language")}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.chip,
                borderRadius: 999,
                padding: 4,
                marginLeft: 16,
              }}
            >
              {languageOptions.map((option) => {
                const isSelected = option.value === language;

                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleLanguageChange(option.value)}
                    style={{
                      minWidth: 56,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? colors.surface : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 14,
                        fontWeight: isSelected ? "700" : "600",
                        color: isSelected ? colors.text : colors.textMuted,
                      }}
                    >
                      {option.value.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <MenuButton
            icon={Moon}
            label={t("profile.darkMode")}
            showChevron={false}
            rightSlot={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{
                  false: colors.switchTrackOff,
                  true: colors.switchTrackOn,
                }}
                thumbColor={colors.accentContrast}
                ios_backgroundColor={colors.switchTrackOff}
              />
            }
          />
          <MenuButton
            icon={Heart}
            label={t("profile.favorites")}
            value={String(favoriteVenuesCount)}
            onPress={() => router.push("/favorites")}
            showBorder={false}
          />
        </Section>

        <Section title="" colors={colors} isDark={isDark}>
          <MenuButton
            icon={HelpCircle}
            label={t("profile.terms")}
            onPress={() => router.push("/terms-of-service")}
          />
          <MenuButton
            icon={ShieldCheck}
            label={t("profile.privacy")}
            onPress={() => router.push("/privacy-policy")}
            showChevron
            showBorder={false}
          />
        </Section>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              width: "100%",
              backgroundColor: colors.buttonSecondaryBackground,
              borderWidth: 1,
              borderColor: colors.buttonSecondaryBorder,
              paddingVertical: 16,
              borderRadius: 999,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <LogOut size={20} color={colors.accent} />
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: 16,
                color: colors.accent,
              }}
            >
              {t("profile.logout")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  children,
  colors,
  isDark,
  title,
}: {
  children: ReactNode;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isDark: boolean;
  title: string;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
      {title ? (
        <Text
          style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: 16,
            color: colors.heading,
            marginBottom: 12,
            paddingHorizontal: 8,
          }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 24,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.22 : 0.05,
          shadowRadius: 12,
          elevation: 3,
          overflow: "visible",
        }}
      >
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  colors,
  icon: Icon,
  label,
  onValueChange,
  showBorder = true,
  value,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  icon: typeof Bell;
  label: string;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
  value: boolean;
}) {
  return (
    <View style={getSettingsRowStyle(colors, showBorder)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon size={20} color={colors.icon} />
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 16,
            color: colors.text,
          }}
        >
          {label}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.switchTrackOff,
          true: colors.switchTrackOn,
        }}
        thumbColor={colors.accentContrast}
        ios_backgroundColor={colors.switchTrackOff}
      />
    </View>
  );
}

function getSettingsRowStyle(
  colors: ReturnType<typeof useAppTheme>["colors"],
  showBorder: boolean,
) {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    minHeight: SETTINGS_ROW_HEIGHT,
    width: "100%" as const,
    paddingHorizontal: 16,
    borderBottomWidth: showBorder ? 1 : 0,
    borderBottomColor: colors.divider,
  };
}

