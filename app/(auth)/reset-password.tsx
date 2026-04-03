import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { resetPassword } from "@/services/auth";
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
  resetToken?: string;
  password?: string;
  confirmPassword?: string;
};

export default function ResetPassword() {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ email?: string; resetToken?: string }>();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [resetToken, setResetToken] = useState(
    typeof params.resetToken === "string" ? params.resetToken : "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = typeof params.email === "string" ? params.email : "";

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const trimmedResetToken = resetToken.trim();

    if (!trimmedResetToken) {
      nextErrors.resetToken = t("auth.validation.resetTokenRequired");
    }

    if (!password) {
      nextErrors.password = t("auth.validation.passwordRequired");
    } else if (password.length < 6) {
      nextErrors.password = t("auth.validation.passwordShort");
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = t("auth.validation.confirmPasswordRequired");
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = t("auth.validation.passwordMismatch");
    }

    setErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      trimmedResetToken,
    };
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setAuthError("");
    const { isValid, trimmedResetToken } = validateForm();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        token: trimmedResetToken,
        newPassword: password,
      });

      router.replace({
        pathname: "/(auth)/login",
        params: {
          message: t("auth.reset.success"),
        },
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
        <Text style={styles.welcomeTitle}>{t("auth.reset.title")}</Text>
        <Text style={styles.welcomeSubtitle}>
          {email
            ? t("auth.reset.subtitleWithEmail", { email })
            : t("auth.reset.subtitle")}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("auth.reset.token")}</Text>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              errors.resetToken ? styles.inputError : null,
            ]}
            value={resetToken}
            onChangeText={(value) => {
              setResetToken(value);
              setAuthError("");
              setErrors((current) => ({ ...current, resetToken: undefined }));
            }}
            placeholder={t("auth.reset.tokenPlaceholder")}
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            multiline
          />
          {errors.resetToken ? (
            <Text style={styles.errorText}>{errors.resetToken}</Text>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("auth.reset.newPassword")}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                errors.password ? styles.inputError : null,
              ]}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setAuthError("");
                setErrors((current) => ({
                  ...current,
                  password: undefined,
                  confirmPassword: undefined,
                }));
              }}
              placeholder={t("auth.reset.newPasswordPlaceholder")}
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("auth.reset.confirmPassword")}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                errors.confirmPassword ? styles.inputError : null,
              ]}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setAuthError("");
                setErrors((current) => ({
                  ...current,
                  confirmPassword: undefined,
                }));
              }}
              placeholder={t("auth.reset.confirmPasswordPlaceholder")}
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")
              }
              hitSlop={8}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={colors.inputPlaceholder} />
              ) : (
                <Eye size={20} color={colors.inputPlaceholder} />
              )}
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}
        </View>

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
              <Text style={styles.primaryButtonText}>{t("auth.reset.submitting")}</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>{t("auth.reset.submit")}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          {t("auth.backToLogin")}{" "}
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
    multilineInput: {
      minHeight: 104,
      textAlignVertical: "top",
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
    errorText: {
      marginTop: 6,
      fontFamily: Platform.OS === "ios" ? "Inter" : "Inter-Regular",
      fontSize: 12,
      color: colors.error,
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

