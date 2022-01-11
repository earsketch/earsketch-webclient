interface locale {
    displayText: string;
    localeCode: string;
    direction: "ltr" | "rtl"
}

export const AVAILABLE_LOCALES: locale[] = [
    { displayText: "العربية", localeCode: "ar", direction: "rtl" },
    { displayText: "English", localeCode: "en", direction: "ltr" },
    { displayText: "Español", localeCode: "es", direction: "ltr" },
    { displayText: "Français", localeCode: "fr", direction: "ltr" },
    { displayText: "עִברִית", localeCode: "he", direction: "rtl" },
]
