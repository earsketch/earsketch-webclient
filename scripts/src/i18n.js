import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from './locales/en/common.json';
import es from './locales/es/common.json';

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        fallbackLng: 'en',
        defaultNS: 'common',
        debug: false,

        keySeparator: false, // we do not use keys in form messages.welcome

        interpolation: {
            escapeValue: false // react already safes from xss
        },
        resources: {
            en,
            es
        }
    });

export default i18n;