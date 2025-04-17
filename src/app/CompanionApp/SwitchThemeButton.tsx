import {useTranslation} from "react-i18next";
import {useAppSelector as useSelector} from "../../hooks";
import * as appState from "../appState";
import React from "react";
import store from "../../reducers";
import reporter from "./../reporter";

function toggleColorTheme() {
    store.dispatch(appState.setColorTheme(store.getState().app.colorTheme === "light" ? "dark" : "light"))
    reporter.toggleColorTheme()
}

export const SwitchThemeButton = () => {
    const { t } = useTranslation()
    const colorTheme = useSelector(appState.selectColorTheme)
    const titleKey = colorTheme === "light" ? "switchThemeLight" : "switchThemeDark"

    return <div className="flex justify-center text-8xl relative inline-block text-left bg-blue mx-3">
        <button className="text-gray-400 hover:text-gray-300 text-8xl pt-9" onClick={toggleColorTheme} title={t(titleKey)} aria-label={t(titleKey)}>
            <div className="flex flex-row items-center">
                <div><i className="icon icon-brightness-contrast" /></div>
            </div>
        </button>
    </div>
}