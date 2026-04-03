import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import { AppThemeColors, Colors, ThemeMode } from "@/constants/theme";

type ThemeContextValue = {
  colors: AppThemeColors;
  isDark: boolean;
  isReady: boolean;
  setTheme: (theme: ThemeMode) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
};

const STORAGE_KEY = "app-theme-mode";
const STORAGE_URI = `${FileSystem.documentDirectory ?? ""}theme-preference.json`;

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readStoredTheme(): Promise<ThemeMode | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return null;
    }

    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  }

  if (!FileSystem.documentDirectory) {
    return null;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(STORAGE_URI);
    if (!fileInfo.exists) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(STORAGE_URI);
    const parsed = JSON.parse(raw) as { theme?: ThemeMode };

    return parsed.theme === "dark" || parsed.theme === "light"
      ? parsed.theme
      : null;
  } catch {
    return null;
  }
}

async function persistTheme(theme: ThemeMode) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
    return;
  }

  if (!FileSystem.documentDirectory) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(
      STORAGE_URI,
      JSON.stringify({ theme }),
    );
  } catch {
    // Ignore persistence failures and keep the in-memory theme.
  }
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTheme = async () => {
      const storedTheme = await readStoredTheme();

      if (isMounted && storedTheme) {
        setThemeState(storedTheme);
      }

      if (isMounted) {
        setIsReady(true);
      }
    };

    loadTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    void persistTheme(nextTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({
      colors: Colors[theme],
      isDark: theme === "dark",
      isReady,
      setTheme,
      theme,
      toggleTheme,
    }),
    [isReady, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }

  return context;
}
