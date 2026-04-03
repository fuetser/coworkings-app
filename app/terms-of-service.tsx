import { Radii } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { router } from "expo-router";
import { ArrowLeft, FileText } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TERMS_SECTIONS = {
  en: [
    {
      title: "Acceptance of Terms",
      body:
        "By accessing or using the Coworkings App, you agree to be bound by these Terms of Service. If you do not agree, you must stop using the app immediately.",
    },
    {
      title: "Service Description",
      body:
        "The app helps users browse coworking venues, review availability, save favorite locations, and manage bookings. Features may change, improve, or be removed without prior notice.",
    },
    {
      title: "User Responsibilities",
      body:
        "You agree to provide accurate account information, keep your login credentials secure, and use the app only for lawful purposes.",
    },
    {
      title: "Bookings and Availability",
      body:
        "Venue details, room availability, and booking information are presented for convenience and may change over time.",
    },
    {
      title: "Payments and Cancellations",
      body:
        "If payment features are enabled, you are responsible for any charges associated with your bookings. Cancellation rules and refunds may depend on the selected venue.",
    },
  ],
  ru: [
    {
      title: "Принятие условий",
      body:
        "Получая доступ к приложению Coworkings App или используя его, вы соглашаетесь соблюдать настоящие Условия использования. Если вы не согласны, необходимо немедленно прекратить использование приложения.",
    },
    {
      title: "Описание сервиса",
      body:
        "Приложение помогает пользователям просматривать коворкинги, проверять доступность, сохранять избранные места и управлять бронированиями. Функции могут изменяться, улучшаться или удаляться без предварительного уведомления.",
    },
    {
      title: "Обязанности пользователя",
      body:
        "Вы обязуетесь указывать точную информацию об аккаунте, хранить данные для входа в безопасности и использовать приложение только в законных целях.",
    },
    {
      title: "Бронирования и доступность",
      body:
        "Информация о площадках, доступности комнат и бронированиях предоставляется для удобства и может со временем изменяться.",
    },
    {
      title: "Платежи и отмены",
      body:
        "Если в приложении доступны платежи, вы несете ответственность за любые списания, связанные с вашими бронированиями. Правила отмены и возврата средств могут зависеть от выбранной площадки.",
    },
  ],
} as const;

export default function TermsOfServiceScreen() {
  const { colors, isDark } = useAppTheme();
  const { language, t } = useI18n();
  const sections = TERMS_SECTIONS[language];

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
            {t("legal.termsTitle")}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {t("legal.termsSubtitle")}
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
            <FileText size={24} color={colors.accent} />
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
            {t("legal.termsHeading")}
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
            {t("legal.termsIntro")}
          </Text>

          <View style={{ gap: 18 }}>
            {sections.map((section, index) => (
              <View key={`${language}-terms-${index}`}>
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
