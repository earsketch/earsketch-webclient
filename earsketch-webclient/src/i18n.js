import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en/common.json"
import es from "./locales/es/common.json"
import fr from "./locales/fr/common.json"
import iu from "./locales/iu/common.json"
import oj from "./locales/oj/common.json"

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        fallbackLng: "en",
        ns: ["common", "messages", "api", "bubble"],
        defaultNS: "common",
        debug: false,

        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        resources: {
            en: en,
            es: es,
            fr: fr,
            iu: iu,
            oj: oj,
        },
    })

export default i18n
