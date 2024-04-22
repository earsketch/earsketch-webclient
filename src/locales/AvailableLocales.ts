export interface Locale {
    displayText: string;
    localeCode: string;
    direction: "ltr" | "rtl"
}

export const ENGLISH_LOCALE: Locale = { displayText: "English", localeCode: "en", direction: "ltr" }

const availableLocales: Locale[] = [
    { displayText: "العربية", localeCode: "ar", direction: "rtl" },
    ENGLISH_LOCALE,
    { displayText: "Español", localeCode: "es", direction: "ltr" },
    { displayText: "Français", localeCode: "fr", direction: "ltr" },
    { displayText: "עִברִית", localeCode: "he", direction: "rtl" },
    { displayText: "ᐃᓄᒃᑎᑐᑦ", localeCode: "iu", direction: "ltr" },
    { displayText: "Ojibwe", localeCode: "oj", direction: "ltr" },
]

export const AVAILABLE_LOCALES: { [key: string]: Locale } = Object.assign({}, ...availableLocales.map((l) => ({ [l.localeCode]: l })))
