interface locale {
    displayText: string;
    localeCode: string;
    direction: "ltr" | "rtl"
}

export const ENGLISH_LOCALE: locale = { displayText: "English", localeCode: "en", direction: "ltr" }

export const AVAILABLE_LOCALES: locale[] = [
    { displayText: "العربية", localeCode: "ar", direction: "rtl" },
    ENGLISH_LOCALE,
    { displayText: "Español", localeCode: "es", direction: "ltr" },
    { displayText: "Français", localeCode: "fr", direction: "ltr" },
    { displayText: "עִברִית", localeCode: "he", direction: "rtl" },
]
