import React, { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Menu } from "@headlessui/react"

import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import * as curriculumState from "../browser/curriculumState"
import { AVAILABLE_LOCALES, ENGLISH_LOCALE } from "../locales/AvailableLocales"

export const LocaleSelector = () => {
    const dispatch = useDispatch()
    const { i18n } = useTranslation()
    const currentLocale = useSelector(appState.selectLocaleCode)
    const { t } = useTranslation()
    const changeLanguage = (lng: string) => {
        dispatch(appState.setLocaleCode(lng))
        dispatch(curriculumState.fetchLocale({ }))
    }

    useEffect(() => {
        if (Object.keys(AVAILABLE_LOCALES).includes(currentLocale)) {
            i18n.changeLanguage(currentLocale)
        } else {
            changeLanguage(ENGLISH_LOCALE.localeCode)
        }
    }, [currentLocale])

    return (
        <div className="">
            <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="text-gray-400 hover:text-gray-300 text-4xl" title={t("ariaDescriptors:header.selectLanguage")} aria-label={t("ariaDescriptors:header.selectLanguage")}>
                    <div className="flex flex-row items-center">
                        <div><i className="icon icon-earth"></i></div>
                        <div className="ml-1"><span className="caret"></span></div>
                    </div>
                </Menu.Button>
                <Menu.Items className="absolute z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {Object.entries(AVAILABLE_LOCALES).map(([, locale]) =>
                        <Menu.Item key={locale.localeCode}>
                            {({ active }) => (
                                <button
                                    className={`${
                                        active ? "bg-gray-500 text-white" : "text-gray-900"
                                    } inline-grid grid-flow-col justify-items-start items-center pl-3 pr-1 py-2 w-full`}
                                    onClick={() => changeLanguage(locale.localeCode)}
                                    style={{ gridTemplateColumns: "18px 1fr" }}
                                    aria-selected={locale.localeCode === currentLocale}
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
