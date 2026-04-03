import { Radii } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/providers/auth-provider";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileEditScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useI18n();
  const { updateProfile, user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.name, user?.phone]);

  const hasProfileChanges = useMemo(() => {
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();

    return (
      normalizedName !== (user?.name ?? "") ||
      normalizedPhone !== (user?.phone ?? "")
    );
  }, [name, phone, user?.name, user?.phone]);

  const handleSaveProfile = async () => {
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();

    if (!normalizedName) {
      setProfileMessage(t("profile.nameRequired"));
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        name: normalizedName,
        phone: normalizedPhone || null,
      });
      setProfileMessage(t("profile.updated"));
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : t("profile.updateError"),
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 16,
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
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.divider,
            }}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: "Inter",
              fontWeight: "700",
              fontSize: 22,
              color: colors.heading,
              lineHeight: 28,
              letterSpacing: -0.5,
            }}
          >
            {t("profile.editTitle")}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: Radii.card,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.22 : 0.05,
              shadowRadius: 12,
              elevation: 3,
              overflow: "visible",
            }}
          >
            <View style={{ padding: 16, gap: 14 }}>
              <FieldLabel colors={colors}>{t("profile.field.name")}</FieldLabel>
              <ProfileInput
                colors={colors}
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setProfileMessage(null);
                }}
                placeholder={t("profile.placeholder.name")}
              />
              <FieldLabel colors={colors}>{t("profile.field.email")}</FieldLabel>
              <ProfileInput
                colors={colors}
                value={user?.email ?? ""}
                editable={false}
                placeholder={t("profile.placeholder.email")}
                keyboardType="email-address"
              />
              <FieldLabel colors={colors}>{t("profile.field.phone")}</FieldLabel>
              <ProfileInput
                colors={colors}
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setProfileMessage(null);
                }}
                placeholder={t("profile.placeholder.phone")}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                onPress={() => {
                  void handleSaveProfile();
                }}
                disabled={!user || isSavingProfile || !hasProfileChanges}
                style={{
                  marginTop: 4,
                  backgroundColor:
                    !user || isSavingProfile || !hasProfileChanges
                      ? colors.buttonDisabled
                      : colors.accent,
                  borderRadius: 999,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
              >
                {isSavingProfile ? (
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
                    {t("profile.saveProfile")}
                  </Text>
                )}
              </TouchableOpacity>
              {profileMessage ? (
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 13,
                    lineHeight: 19,
                    color: colors.textMuted,
                    textAlign: "center",
                  }}
                >
                  {profileMessage}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldLabel({
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
        fontSize: 13,
        fontWeight: "600",
        color: colors.textMuted,
      }}
    >
      {children}
    </Text>
  );
}

function ProfileInput({
  colors,
  editable = true,
  keyboardType,
  onChangeText,
  placeholder,
  value,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  editable?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  onChangeText?: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      autoCapitalize="none"
      style={{
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontFamily: "Inter",
        fontSize: 15,
        color: editable ? colors.text : colors.textMuted,
        backgroundColor: editable ? colors.background : colors.chip,
      }}
    />
  );
}
