import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from "@react-navigation/native";
import { Platform } from "react-native";

export type ThemeMode = "light" | "dark";
type StatusBarStyle = "light" | "dark";

const shared = {
  accent: "#F59156",
  accentSoft: "#FFC3A0",
  accentStrong: "#E87B40",
  accentContrast: "#FFFFFF",
  success: "#69A97E",
  successSoft: "#E6F5EC",
  warning: "#F5A623",
  error: "#DC2626",
};

export const Radii = {
  card: 32,
} as const;

export const Colors = {
  light: {
    ...shared,
    text: "#4A4A4A",
    textMuted: "#6B7280",
    textSoft: "#9CA3AF",
    heading: "#2F2A25",
    background: "#FEFBF6",
    surface: "#FFFFFF",
    surfaceMuted: "#FFF5ED",
    surfaceElevated: "#FFFFFF",
    border: "#D1D1D1",
    borderSoft: "#E7DED3",
    peachBorder: "#F2D5C2",
    divider: "#F1E6DA",
    icon: "#6B7280",
    tint: shared.accent,
    chip: "#F5F5F5",
    chipActive: shared.accentSoft,
    chipText: "#6B7280",
    chipTextActive: "#FFFFFF",
    tabBar: "#FFFFFF",
    tabBarShadow: "#D7C3AF",
    tabIconDefault: "#8E7566",
    tabIconSelected: "#F28C52",
    inputBackground: "#FFFFFF",
    inputBorder: "#D1D1D1",
    inputText: "#4A4A4A",
    inputPlaceholder: "#9CA3AF",
    switchTrackOff: "#D1D1D1",
    switchTrackOn: shared.accent,
    buttonDisabled: "#F3CDB8",
    buttonSecondaryBackground: "#FFFFFF",
    buttonSecondaryBorder: "#D1D1D1",
    badgeBackground: "#F0F0F0",
    badgeText: "#888888",
    heroBackground: "#FFD9C2",
    heroLabelBackground: "rgba(255,255,255,0.65)",
    heroLabelText: "#A85C34",
    screenGlow: "#FFF7EF",
    cardBorder: "#F3E6D9",
    disabledSurface: "#EFE7E1",
    disabledText: "#B8ABA0",
    availableDot: "#B8E0B2",
    freeNowDot: "#B9E4BA",
    reservedDot: "#E8DDD6",
    statusTextMuted: "#CDC3BC",
    warmShadow: "#E9D9CA",
    softCardShadow: "#E7D3C3",
    overlay: "rgba(53, 45, 39, 0.34)",
    sheetBackground: "#FDFBF8",
    selectedPill: shared.accent,
    selectedPillText: "#FFFFFF",
    selectedOutline: "#F3A06F",
    pillTextMuted: "#A29A92",
    subtleBorder: "#E8DED5",
    footerDivider: "#F0E5DA",
    statusBar: "dark" as StatusBarStyle,
    shadow: "#000000",
  },
  dark: {
    ...shared,
    text: "#F7F1EA",
    textMuted: "#B9ADA1",
    textSoft: "#8A7B6F",
    heading: "#FFF8F1",
    background: "#1B1612",
    surface: "#28211C",
    surfaceMuted: "#342A22",
    surfaceElevated: "#302720",
    border: "#4A3C32",
    borderSoft: "#5A493D",
    peachBorder: "#6B5447",
    divider: "#3C3028",
    icon: "#C2B4A9",
    tint: "#FFB388",
    chip: "#352B24",
    chipActive: "#F59156",
    chipText: "#D3C5BA",
    chipTextActive: "#FFF8F1",
    tabBar: "#241D18",
    tabBarShadow: "#000000",
    tabIconDefault: "#A99381",
    tabIconSelected: "#FFD0B3",
    inputBackground: "#2E2620",
    inputBorder: "#55463B",
    inputText: "#F7F1EA",
    inputPlaceholder: "#8E7C6F",
    switchTrackOff: "#55463B",
    switchTrackOn: "#F59156",
    buttonDisabled: "#8E5D44",
    buttonSecondaryBackground: "#2A221C",
    buttonSecondaryBorder: "#55463B",
    badgeBackground: "#3B312A",
    badgeText: "#D0C1B5",
    heroBackground: "#5B3D2E",
    heroLabelBackground: "rgba(27,22,18,0.45)",
    heroLabelText: "#FFE2D0",
    screenGlow: "#231C17",
    cardBorder: "#43362D",
    disabledSurface: "#3A3029",
    disabledText: "#8F8175",
    availableDot: "#86B883",
    freeNowDot: "#9CC997",
    reservedDot: "#7F6D63",
    statusTextMuted: "#8F8175",
    warmShadow: "#000000",
    softCardShadow: "#000000",
    overlay: "rgba(0, 0, 0, 0.55)",
    sheetBackground: "#241D18",
    selectedPill: "#F59156",
    selectedPillText: "#FFF8F1",
    selectedOutline: "#FFB88A",
    pillTextMuted: "#9E8F83",
    subtleBorder: "#45372D",
    footerDivider: "#3A2D24",
    statusBar: "light" as StatusBarStyle,
    shadow: "#000000",
  },
};

export type AppThemeColors = typeof Colors.light;

export function getTheme(mode: ThemeMode) {
  return Colors[mode];
}

export function getNavigationTheme(mode: ThemeMode): NavigationTheme {
  const palette = getTheme(mode);
  const base =
    mode === "dark" ? NavigationDarkTheme : NavigationDefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.tint,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.accent,
    },
  };
}

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
