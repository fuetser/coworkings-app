import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import {
  AppLanguage,
  getLocaleForLanguage,
  setI18nLanguage,
  translate,
  type TranslationKey,
} from "@/constants/i18n";

type TranslationParams = Record<string, string | number>;

type LanguageContextValue = {
  isReady: boolean;
  language: AppLanguage;
  locale: string;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const STORAGE_KEY = "app-language";
const STORAGE_URI = `${FileSystem.documentDirectory ?? ""}language-preference.json`;

const LanguageContext = createContext<LanguageContextValue | null>(null);

async function readStoredLanguage(): Promise<AppLanguage | null> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return null;
    }

    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "ru" || value === "en" ? value : null;
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
    const parsed = JSON.parse(raw) as { language?: AppLanguage };
    return parsed.language === "ru" || parsed.language === "en"
      ? parsed.language
      : null;
  } catch {
    return null;
  }
}

async function persistLanguage(language: AppLanguage) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
    return;
  }

  if (!FileSystem.documentDirectory) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(
      STORAGE_URI,
      JSON.stringify({ language }),
    );
  } catch {
    // Ignore persistence failures and keep the in-memory language.
  }
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const storedLanguage = await readStoredLanguage();

      if (!isMounted) {
        return;
      }

      const nextLanguage = storedLanguage ?? "en";
      setLanguageState(nextLanguage);
      setI18nLanguage(nextLanguage);
      setIsReady(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    setI18nLanguage(nextLanguage);
    void persistLanguage(nextLanguage);
  };

  const value = useMemo(
    () => ({
      isReady,
      language,
      locale: getLocaleForLanguage(language),
      setLanguage,
      t: (key: TranslationKey, params?: TranslationParams) =>
        translate(key, params, language),
    }),
    [isReady, language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useAppLanguage must be used within LanguageProvider");
  }

  return context;
}
