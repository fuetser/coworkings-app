import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { forgotPassword } from "@/services/auth";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type FormErrors = {
  email?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = t("auth.validation.emailRequired");
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = t("auth.validation.emailInvalid");
    }

    setErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      trimmedEmail,
    };
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setAuthError("");
    const { isValid, trimmedEmail } = validateForm();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await forgotPassword({
        email: trimmedEmail,
      });

      setSuccessMessage(
        response.message ||
          t("auth.forgot.success"),
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : t("auth.networkError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetTokenOpen = () => {
    router.push({
      pathname: "/(auth)/reset-password",
      params: {
        email: email.trim(),
      },
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeTitle}>{t("auth.forgot.title")}</Text>
        <Text style={styles.welcomeSubtitle}>
          {t("auth.forgot.subtitle")}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("auth.login.email")}</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setAuthError("");
              setSuccessMessage("");
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder={t("auth.login.emailPlaceholder")}
            placeholderTextColor={colors.inputPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}
        </View>

        {successMessage ? (
          <Text style={styles.successText}>{successMessage}</Text>
        ) : null}

        {authError ? (
          <Text style={styles.authErrorText}>{authError}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isSubmitting ? styles.buttonDisabled : null,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="small" color={colors.accentContrast} />
              <Text style={styles.primaryButtonText}>{t("auth.forgot.submitting")}</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>{t("auth.forgot.submit")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleResetTokenOpen}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>{t("auth.forgot.continueReset")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          {t("auth.forgot.remembered")}{" "}
          <Text
            style={styles.footerLink}
            onPress={() => router.replace("/(auth)/login")}
          >
            {t("auth.login.submit")}
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 60 : 40,
      paddingBottom: 24,
      backgroundColor: colors.background,
    },
    welcomeContainer: {
      alignItems: "center",
      width: "100%",
      marginBottom: 32,
    },
    welcomeTitle: {
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Bold",
      fontWeight: "700",
      fontSize: 24,
      lineHeight: 30,
      color: colors.heading,
      marginBottom: 8,
      textAlign: "center",
    },
    welcomeSubtitle: {
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Regular",
      fontSize: 14,
      lineHeight: 21,
      color: colors.textMuted,
      textAlign: "center",
    },
    formContainer: {
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Medium",
      fontWeight: "500",
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
      marginBottom: 4,
    },
    input: {
      width: "100%",
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === "ios" ? 16 : 12,
      backgroundColor: colors.inputBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Regular",
      fontSize: 16,
      color: colors.inputText,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      marginTop: 6,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Regular",
      fontSize: 12,
      color: colors.error,
    },
    successText: {
      marginBottom: 12,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Regular",
      fontSize: 14,
      lineHeight: 20,
      color: colors.accent,
      textAlign: "center",
    },
    authErrorText: {
      marginBottom: 12,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Regular",
      fontSize: 14,
      lineHeight: 20,
      color: colors.error,
      textAlign: "center",
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: 28,
      paddingVertical: 16,
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    loadingContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    primaryButtonText: {
      color: colors.accentContrast,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Bold",
      fontWeight: "700",
      fontSize: 16,
      lineHeight: 24,
      textAlign: "center",
    },
    secondaryButton: {
      marginTop: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.accent,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: colors.accent,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Bold",
      fontWeight: "700",
      fontSize: 14,
      lineHeight: 20,
    },
    footerContainer: {
      alignItems: "center",
    },
    footerText: {
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Regular",
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
    },
    footerLink: {
      color: colors.accent,
      fontWeight: "500",
    },
  });
