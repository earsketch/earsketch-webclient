import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { useTranslation } from "react-i18next"
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "@headlessui/react"

import * as layout from "../ide/layoutState"
import * as appState from "../app/appState"
import { SoundBrowser } from "./Sounds"
import { ScriptBrowser } from "./Scripts"
import { APIBrowser } from "./API"
import type { RootState } from "../reducers"
import { Collapsed } from "./Utils"
import { BrowserTabType } from "./BrowserTab"

export const TitleBar = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div
            className="flex items-center p-2"
            style={{ minHeight: "fit-content" }} // Safari-specific issue
        >
            <div className="text-base pl-2 pr-4 font-semibold truncate">
                <h2>{t("contentManager.title").toLocaleUpperCase()}</h2>
            </div>
            <button
                id="westPaneToggle"
                className="flex justify-end w-7 h-4 p-0.5 rounded-full cursor-pointer bg-black dark:bg-gray-700"
                onClick={() => {
                    dispatch(layout.setWest({ open: false }))
                    window.requestAnimationFrame(() => {
                        document.getElementById("westPaneToggle")?.focus()
                    })
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

const BrowserTabButton = ({ name, type, icon }: { name: string, type: BrowserTabType, icon: string }) => {
    const isSelected = useSelector(layout.selectWestKind) === type
    const { t } = useTranslation()

    return (
        <Tab
            className={`px-1 py-2 w-1/3 cursor-pointer truncate ${
                isSelected
                    ? "text-amber border-amber border-b-4"
                    : "border-b-4 border-transparent"
            }`}
            style={isSelected ? { color: "#F5AE3C", borderColor: "#F5AE3C" } : {}}
            title={t("contentManager.openTab", { name })}
            aria-label={t("contentManager.openTab", { name })}
        >
            <h3 className="scale:text-sm truncate">
                <i className={`${icon} pr-2`} />
                {name}
            </h3>
        </Tab>
    )
}

export const Header = ({ title }: { title: string }) => (
    <div className="p-1 hidden">{title}</div>
)

export const Browser = () => {
    const open = useSelector((state: RootState) => state.layout.west.open)
    const scaledFontSize = useSelector(appState.selectScaledFontSize)
    const dispatch = useDispatch()
    const { t } = useTranslation()
    let kind: BrowserTabType = useSelector(layout.selectWestKind)

    if (!Object.values(BrowserTabType).includes(kind)) {
        kind = BrowserTabType.Sound
    }

    return (
        <div
            className="flex flex-col h-full w-full text-left font-sans bg-white text-black dark:bg-gray-900 dark:text-white"
            style={{ fontSize: `${scaledFontSize}px` }}
            id="content-manager">
            {open
                ? <TabGroup
                    as="div"
                    className="flex flex-col h-full"
                    selectedIndex={kind}
                    onChange={(i) => dispatch(layout.setWest({ open: true, kind: i as BrowserTabType }))}
                >
                    <TitleBar />
                    <TabList
                        className="flex justify-between text-center text-white bg-blue"
                        id="browser-tabs"
                        aria-label={t("ariaDescriptors:contentManager.tabs")}
                        style={{ minHeight: "fit-content" }}
                    >
                        <BrowserTabButton name={t("soundBrowser.title").toLocaleUpperCase()} type={BrowserTabType.Sound} icon="icon-headphones" />
                        <BrowserTabButton name={t("script", { count: 0 }).toLocaleUpperCase()} type={BrowserTabType.Script} icon="icon-embed2" />
                        <BrowserTabButton name="API" type={BrowserTabType.API} icon="icon-book" />
                    </TabList>
                    <TabPanels className="flex flex-col grow min-h-0">
                        <TabPanel unmount={false} id="panel-0" className={`flex flex-col grow min-h-0 ${kind !== BrowserTabType.Sound ? "hidden" : ""}`}><SoundBrowser /></TabPanel>
                        <TabPanel unmount={false} id="panel-1" className={`flex flex-col grow min-h-0 ${kind !== BrowserTabType.Script ? "hidden" : ""}`}><ScriptBrowser /></TabPanel>
                        <TabPanel unmount={false} id="panel-2" className={`flex flex-col grow min-h-0 ${kind !== BrowserTabType.API ? "hidden" : ""}`}><APIBrowser /></TabPanel>
                    </TabPanels>
                </TabGroup>
                : <Collapsed title={t("contentManager.title").toLocaleUpperCase()} position="west" />}
        </div>
    )
}
