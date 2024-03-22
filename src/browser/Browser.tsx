import React from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as caiState from "../cai/caiState"
import * as caiThunks from "../cai/caiThunks"
import { SoundBrowser } from "./Sounds"
import { ScriptBrowser } from "./Scripts"
import { APIBrowser } from "./API"
import type { RootState } from "../reducers"
import { Collapsed } from "./Utils"
import { BrowserTabType } from "./BrowserTab"
import * as tabState from "../ide/tabState"
import { addUIClick } from "../cai/dialogue/student"

export const TitleBar = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div
            className="flex items-center p-2"
            style={{ minHeight: "fit-content" }} // Safari-specific issue
        >
            <div className="pl-2 pr-4 font-semibold truncate">
                <h2>{t("contentManager.title").toLocaleUpperCase()}</h2>
            </div>
            <button
                className="flex justify-end w-7 h-4 p-0.5 rounded-full cursor-pointer bg-black dark:bg-gray-700"
                onClick={() => {
                    dispatch(layout.setWest({ open: false }))
                }}
                aria-label={t("ariaDescriptors:contentManager.close")}
                title={t("ariaDescriptors:contentManager.close")}
                tabIndex={0}
            >
                <div className="w-3 h-3 bg-white rounded-full">&nbsp;</div>
            </button>
        </div>
    )
}

const BrowserTab = ({ name, type, children }: { name: string, type: BrowserTabType, children: React.ReactNode }) => {
    const dispatch = useDispatch()
    const isSelected = useSelector(layout.selectWestKind) === type
    const highlight = useSelector(caiState.selectHighlight).zone === name.toLowerCase()
    const activeProject = useSelector(tabState.selectActiveTabID)

    const { t } = useTranslation()

    return (
        <button
            id={name}
            className={`px-1 py-2 w-1/3 cursor-pointer ${isSelected ? "text-amber border-amber border-b-4" : (highlight ? "border-yellow-400 border-4" : "border-b-4 border-transparent")} truncate`}
            style={isSelected
                ? {
                    color: "#F5AE3C",
                    borderColor: "#F5AE3C",
                }
                : {}}
            onClick={() => {
                dispatch(layout.setWest({
                    open: true,
                    kind: type,
                }))
                if (!isSelected) { addUIClick(name + " tab") }
                if (highlight) {
                    if (type === 1) {
                        dispatch(caiThunks.highlight({ zone: "script", id: activeProject || undefined }))
                    } else {
                        dispatch(caiThunks.highlight({ zone: "apiSearchBar" }))
                    }
                }
            }}
            title={t("contentManager.openTab", { name })}
            aria-label={t("contentManager.openTab", { name })}
            role="tab"
            aria-selected={isSelected ? "true" : "false"}
            aria-controls={"panel-" + type}
        >
            <h3 className="text-sm truncate">
                {children}
                {name}
            </h3>
        </button>
    )
}

export const BrowserTabs = () => {
    const { t } = useTranslation()
    return (
        <div
            className="flex justify-between text-center text-white bg-blue"
            id="browser-tabs"
            role="tablist"
            aria-label="Content manager tabs"
            style={{
                minHeight: "fit-content", // Safari-specific issue
            }}
        >
            <BrowserTab name={t("soundBrowser.title").toLocaleUpperCase()} type={BrowserTabType.Sound}>
                <i className="icon-headphones pr-2" />
            </BrowserTab>
            <BrowserTab name={t("script", { count: 0 }).toLocaleUpperCase()} type={BrowserTabType.Script}>
                <i className="icon-embed2 pr-2" />
            </BrowserTab>
            <BrowserTab name="API" type={BrowserTabType.API}>
                <i className="icon-book pr-2" />
            </BrowserTab>
        </div>
    )
}

export const Header = ({ title }: { title: string }) => (
    <div className="p-1 hidden">{title}</div>
)

// Keys are weirdly all caps because of the shared usage in the layout reducer as well as component's title-bar prop.
const BrowserComponents: { [key in BrowserTabType]: React.FC } = {
    [BrowserTabType.Sound]: SoundBrowser,
    [BrowserTabType.Script]: ScriptBrowser,
    [BrowserTabType.API]: APIBrowser,
}

export const Browser = () => {
    const theme = useSelector(appState.selectColorTheme)
    const open = useSelector((state: RootState) => state.layout.west.open)
    const { t } = useTranslation()
    let kind: BrowserTabType = useSelector(layout.selectWestKind)

    if (!Object.values(BrowserTabType).includes(kind)) {
        kind = BrowserTabType.Sound
    }

    return <div
        className={`flex flex-col h-full w-full text-left font-sans ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}
        id="content-manager">
        <div className={"flex flex-col h-full" + (open ? "" : " hidden")}>
            <TitleBar />
            <BrowserTabs />
            {Object.entries(BrowserComponents).map(([type, TabBody]) =>
                <div key={type} className={"flex flex-col grow min-h-0" + (+type === kind ? "" : " hidden")}><TabBody /></div>)}
        </div>
        {!open && <Collapsed title={t("contentManager.title").toLocaleUpperCase()} position="west" />}
    </div>
}
