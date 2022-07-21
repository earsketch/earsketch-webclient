import React, { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Menu } from "@headlessui/react"

import { useTranslation, getI18n } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import * as appState from "../app/appState"
import { AVAILABLE_LOCALES, ENGLISH_LOCALE } from "../locales/AvailableLocales"
import reporter from "../app/reporter"

export const chooseDetectedLanguage = (detected: string | string[] | undefined) => {
    if (!detected) {
        reporter.localeMiss([])
        return ENGLISH_LOCALE.localeCode
    }
    if (!Array.isArray(detected)) detected = [detected]
    for (const locale of detected) {
        const supportedLocale = getSupportedLocale(locale)
        if (supportedLocale) {
            reporter.localeSelection(supportedLocale, true)
            return supportedLocale
        }
    }

    reporter.localeMiss(detected)
    return ENGLISH_LOCALE.localeCode
}

const getSupportedLocale = (localeCode: string) => {
    localeCode = localeCode.toLowerCase()
    if (Object.keys(AVAILABLE_LOCALES).includes(localeCode)) {
        return localeCode
    }
    // we may support the main locale without the regional dialect, try searching for that before giving up
    const nonRegionalCode = localeCode.split("-")[0]
    if (Object.keys(AVAILABLE_LOCALES).includes(nonRegionalCode)) {
        return nonRegionalCode
    }

    return undefined
}

export const LocaleSelector = () => {
    const dispatch = useDispatch()
    const { i18n } = useTranslation()
    const currentLocale = useSelector(appState.selectLocaleCode)
    const { t } = useTranslation()

    const selectLanguage = (lng: string) => {
        reporter.localeSelection(lng, false)
        changeLanguage(lng)
    }

    const changeLanguage = (lng: string) => {
        dispatch(appState.setLocaleCode(lng))
    }

    useEffect(() => {
        if (currentLocale === "") {
            // locale hasn't been set yet, attempt to detect language
            const languageDetector = new LanguageDetector(getI18n().services, { order: ["navigator"] })
            const language = languageDetector.detect()
            console.log("languages detected: ", language)
            changeLanguage(chooseDetectedLanguage(language))
        } else if (Object.keys(AVAILABLE_LOCALES).includes(currentLocale)) {
            i18n.changeLanguage(currentLocale)
        } else {
            changeLanguage(ENGLISH_LOCALE.localeCode)
        }
    }, [currentLocale])

    return (
        <div className="">
            <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="text-gray-400 hover:text-gray-300 text-2xl" title={t("ariaDescriptors:header.selectLanguage")} aria-label={t("ariaDescriptors:header.selectLanguage")}>
                    <div className="flex flex-row items-center">
                        <div ><i className="icon icon-earth"></i></div>
                        <div className="ml-1"><span className="caret"></span></div>
                    </div>
                </Menu.Button>
                <Menu.Items className="absolute z-50 right-0 mt-1 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {Object.entries(AVAILABLE_LOCALES).map(([, locale]) =>
                        <Menu.Item key={locale.localeCode}>
                            {({ active }) => (
                                <button
                                    className={`${
                                        active ? "bg-gray-500 text-white" : "text-gray-900"
                                    } inline-grid grid-flow-col justify-items-start items-center text-sm pl-1.5 pr-0.5 py-1 w-full`}
                                    onClick={() => selectLanguage(locale.localeCode)}
                                    style={{ gridTemplateColumns: "18px 1fr" }}
                                    aria-selected={locale.localeCode === currentLocale}
                                    title={locale.localeCode === currentLocale ? t("ariaDescriptors:general.selected") : t("ariaDescriptors:general.notSelected")}
                                    aria-label={locale.localeCode === currentLocale ? t("ariaDescriptors:general.selected") : t("ariaDescriptors:general.notSelected")}
                                >
                                    {locale.localeCode === currentLocale && <i className="icon icon-checkmark4" />}
                                    {locale.localeCode !== currentLocale && <span></span>}
                                    {locale.displayText}
                                </button>
                            )}
                        </Menu.Item>
                    )}
                </Menu.Items>
            </Menu>
        </div>
    )
}
