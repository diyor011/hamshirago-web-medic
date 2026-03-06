import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./ru.json";
import uz from "./uz.json";

export type Language = "ru" | "uz";
export const DEFAULT_LANGUAGE: Language = "ru";

i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, uz: { translation: uz } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

export default i18n;
