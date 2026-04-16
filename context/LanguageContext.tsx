"use client";

import { createContext, useContext, useEffect, useState } from "react";
import i18n, { DEFAULT_LANGUAGE, Language } from "@/i18n";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Синхронно сбрасываем i18n.language к DEFAULT перед hydration render.
    // changeLanguage() — async (сначала ставит undefined), поэтому используем
    // прямое присваивание. useEffect применит сохранённый язык после hydration.
    if (typeof window !== "undefined" && i18n.language !== DEFAULT_LANGUAGE) {
      i18n.language = DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Language | null;
    if (stored === "ru" || stored === "uz") {
      setLanguageState(stored);
      i18n.changeLanguage(stored);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
