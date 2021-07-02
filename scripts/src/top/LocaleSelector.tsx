import React from "react"
import { useDispatch, useSelector } from "react-redux"
import { Menu } from "@headlessui/react"

import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import * as curriculumState from "../browser/curriculumState"

interface locale {
    displayText: string;
    localeCode: string;
}

const AVAILABLE_LOCALES: locale[] = [
    { displayText: "English", localeCode: "en" },
    { displayText: "Español", localeCode: "es" },
]

export const LocaleSelector = () => {
    const dispatch = useDispatch()
    const { i18n } = useTranslation()
    const curriculumLocation = useSelector(curriculumState.selectCurrentLocation)

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng)
        dispatch(appState.setLocale(lng))
        dispatch(curriculumState.fetchLocale({ location: curriculumLocation }))
    }

    return (
        <div className="">
            <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="text-gray-400 text-4xl">
                    <div className="flex flex-row items-center">
                        <div><i className="icon icon-earth"></i></div>
                        <div className="ml-1"><span className="caret"></span></div>
                    </div>
                </Menu.Button>
                <Menu.Items className="absolute z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {
                        AVAILABLE_LOCALES.map((locale) =>
                            <Menu.Item key={locale.localeCode}>
                                {({ active }) => (
                                    <button
                                        className={`${
                                            active ? "bg-gray-500 text-white" : "text-gray-900"
                                        } group flex items-center w-full px-2 py-2`}
                                        onClick={() => changeLanguage(locale.localeCode)}
                                    >
                                        {locale.displayText}
                                    </button>
                                )}
                            </Menu.Item>,
                        )
                    }
                </Menu.Items>
            </Menu>
        </div>
    )
}
