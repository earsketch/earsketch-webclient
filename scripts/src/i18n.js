import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from './locales/en/common.json';
import es from './locales/es/common.json';

// the translations
// (tip move them in a JSON file and import them)
// const resources = {
//     en: {
//         translation: {
//             "Welcome to React": "Welcome to React and react-i18next"
//         }
//     },
//     fr: {
//         translation: {
//             "Welcome to React": "Bienvenue à React et react-i18next"
//         }
//     }
// };

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        fallbackLng: 'en',
        defaultNS: 'common',
        debug: true,

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