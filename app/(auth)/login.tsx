import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/providers/auth-provider";
import { router, useLocalSearchParams } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
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
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ message?: string }>();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const successMessage =
    typeof params.message === "string" ? params.message : "";

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setAuthError("");
    setErrors((current) => ({ ...current, email: undefined }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setAuthError("");
    setErrors((current) => ({ ...current, password: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = t("auth.validation.emailRequired");
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = t("auth.validation.emailInvalid");
    }

    if (!password) {
      nextErrors.password = t("auth.validation.passwordRequired");
    } else if (password.length < 6) {
      nextErrors.password = t("auth.validation.passwordShort");
    }

    setErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      trimmedEmail,
    };
  };

  const handleLogin = async () => {
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
      await login({
        email: trimmedEmail,
        password,
      });
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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.welcomeContainer}>
        <Text
          style={styles.welcomeTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {t("auth.login.title")}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          {t("auth.login.subtitle")}
        </Text>
      </View>
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("auth.login.email")}</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
            onChangeText={handleEmailChange}
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

        <View style={styles.inputGroup}>
          <View style={styles.passwordHeader}>
            <Text style={styles.label}>{t("auth.login.password")}</Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLink}>{t("auth.login.forgotPassword")}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                errors.password ? styles.inputError : null,
              ]}
              value={password}
              onChangeText={handlePasswordChange}
              placeholder={t("auth.login.passwordPlaceholder")}
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? t("auth.hidePassword") : t("auth.showPassword")
              }
              hitSlop={8}
            >
              {showPassword ? (
                <EyeOff size={20} color={colors.inputPlaceholder} />
              ) : (
                <Eye size={20} color={colors.inputPlaceholder} />
              )}
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
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
            styles.loginButton,
            isSubmitting ? styles.buttonDisabled : null,
          ]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="small" color={colors.accentContrast} />
              <Text style={styles.loginButtonText}>{t("auth.login.submitting")}</Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>{t("auth.login.submit")}</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>
          {t("auth.login.noAccount")}{" "}
          <Text
            style={styles.registerLink}
            onPress={() => router.push("/(auth)/register")}
          >
            {t("auth.login.signUp")}
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
    passwordHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 4,
    },
    label: {
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Medium",
      fontWeight: "500",
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
      marginBottom: 4,
    },
    secondaryLink: {
      color: colors.accent,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Medium",
      fontWeight: "500",
      fontSize: 13,
      lineHeight: 20,
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
    passwordContainer: {
      position: "relative",
    },
    passwordInput: {
      paddingRight: 50,
    },
    eyeIcon: {
      position: "absolute",
      right: 16,
      top: "50%",
      transform: [{ translateY: -10 }],
    },
    loginButton: {
      backgroundColor: colors.accent,
      borderRadius: 28,
      paddingVertical: 16,
      marginTop: 8,
    },
    loadingContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    loginButtonText: {
      color: colors.accentContrast,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Bold",
      fontWeight: "700",
      fontSize: 16,
      lineHeight: 24,
      textAlign: "center",
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
    buttonDisabled: {
      opacity: 0.7,
    },
    registerContainer: {
      alignItems: "center",
    },
    registerText: {
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Regular",
      fontSize: 14,
      color: colors.textMuted,
    },
    registerLink: {
      color: colors.accent,
      fontWeight: "500",
    },
  });
