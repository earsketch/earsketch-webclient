import React, { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Menu } from "@headlessui/react"

import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import * as curriculumState from "../browser/curriculumState"

interface locale {
    displayText: string;
    localeCode: string;
}

export const AVAILABLE_LOCALES: locale[] = [
    { displayText: "English", localeCode: "en" },
    { displayText: "Español", localeCode: "es" },
]

export const LocaleSelector = () => {
    const dispatch = useDispatch()
    const { i18n } = useTranslation()
    const currentLocale = useSelector(appState.selectLocale)

    const changeLanguage = (lng: string) => {
        dispatch(appState.setLocale(lng))
        dispatch(curriculumState.fetchLocale({ }))
    }

    useEffect(() => {
        i18n.changeLanguage(currentLocale)
    }, [currentLocale])

    return (
        <div className="">
            <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="text-gray-400 text-4xl">
                    <div className="flex flex-row items-center">
                        <div><i className="icon icon-earth"></i></div>
                        <div className="ml-1"><span className="caret"></span></div>
                    </div>
                </Menu.Button>
                <Menu.Items className="absolute w-32 z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {AVAILABLE_LOCALES.map((locale) =>
                        <Menu.Item key={locale.localeCode}>
                            {({ active }) => (
                                <button
                                    className={`${
                                        active ? "bg-gray-500 text-white" : "text-gray-900"
                                    } inline-grid grid-flow-col justify-items-start items-center pl-3 py-2 w-full`}
                                    onClick={() => changeLanguage(locale.localeCode)}
                                    style={{ gridTemplateColumns: "18px 1fr" }}
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
