import { Radii } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { router } from "expo-router";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIVACY_SECTIONS = {
  en: [
    {
      title: "Information We Collect",
      body:
        "We may collect account details such as your name, email address, phone number, booking activity, saved venues, and basic technical information needed to operate the Coworkings App.",
    },
    {
      title: "How We Use Information",
      body:
        "Your information is used to provide booking functionality, personalize your experience, maintain your account, send service-related notifications, and improve the reliability of the platform.",
    },
    {
      title: "Booking and Venue Data",
      body:
        "When you search, save, or book coworking spaces, the app may process related venue, room, date, and preference data so that reservations and availability can be shown correctly.",
    },
    {
      title: "Notifications",
      body:
        "If notifications are enabled, we may use your contact and device information to deliver booking reminders, operational updates, and other account-related messages through supported channels.",
    },
    {
      title: "Security",
      body:
        "We apply reasonable administrative and technical safeguards to protect your information. However, no system can guarantee absolute security, and you remain responsible for protecting your account credentials.",
    },
  ],
  ru: [
    {
      title: "Какие данные мы собираем",
      body:
        "Мы можем собирать данные аккаунта, такие как ваше имя, email, номер телефона, активность бронирований, сохраненные площадки и базовую техническую информацию, необходимую для работы приложения Coworkings App.",
    },
    {
      title: "Как мы используем данные",
      body:
        "Ваши данные используются для работы бронирований, персонализации опыта, поддержки аккаунта, отправки сервисных уведомлений и повышения надежности платформы.",
    },
    {
      title: "Данные о площадках и бронированиях",
      body:
        "Когда вы ищете, сохраняете или бронируете коворкинги, приложение может обрабатывать связанные данные о площадке, комнате, дате и предпочтениях, чтобы корректно показывать доступность и резервы.",
    },
    {
      title: "Уведомления",
      body:
        "Если уведомления включены, мы можем использовать ваши контактные данные и данные устройства для отправки напоминаний о бронированиях, операционных обновлений и других сообщений, связанных с аккаунтом, через поддерживаемые каналы.",
    },
    {
      title: "Безопасность",
      body:
        "Мы применяем разумные административные и технические меры защиты ваших данных. Однако ни одна система не может гарантировать абсолютную безопасность, и вы по-прежнему отвечаете за сохранность данных для входа в аккаунт.",
    },
  ],
} as const;

export default function PrivacyPolicyScreen() {
  const { colors, isDark } = useAppTheme();
  const { language, t } = useI18n();
  const sections = PRIVACY_SECTIONS[language];

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
            {t("legal.privacyTitle")}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {t("legal.privacySubtitle")}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: Radii.card,
            padding: 20,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.22 : 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.surfaceMuted,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <ShieldCheck size={24} color={colors.accent} />
          </View>

          <Text
            style={{
              fontFamily: "Inter",
              fontWeight: "700",
              fontSize: 24,
              color: colors.heading,
              lineHeight: 30,
              marginBottom: 10,
            }}
          >
            {t("legal.privacyHeading")}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 14,
              color: colors.textMuted,
              lineHeight: 22,
              marginBottom: 22,
            }}
          >
            {t("legal.privacyIntro")}
          </Text>

          <View style={{ gap: 18 }}>
            {sections.map((section, index) => (
              <View key={`${language}-privacy-${index}`}>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontWeight: "700",
                    fontSize: 16,
                    color: colors.heading,
                    lineHeight: 22,
                    marginBottom: 6,
                  }}
                >
                  {section.title}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 14,
                    color: colors.text,
                    lineHeight: 22,
                  }}
                >
                  {section.body}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
