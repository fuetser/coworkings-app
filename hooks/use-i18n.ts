import { useAppLanguage } from "@/providers/language-provider";

export function useI18n() {
  return useAppLanguage();
}
