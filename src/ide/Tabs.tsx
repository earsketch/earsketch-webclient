import classNames from "classnames"
import React, { useEffect, useRef } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { useTranslation } from "react-i18next"
import { Menu } from "@headlessui/react"

import * as appState from "../app/appState"
import { DropdownContextMenuCaller } from "../browser/ScriptsMenus"
import * as scripts from "../browser/scriptsState"
import * as tabs from "./tabState"
import * as tabThunks from "./tabThunks"
import * as layout from "../ide/layoutState"

const CreateScriptButton = ({ create }: { create: () => void }) => {
    const { t } = useTranslation()

    return <button
        className={`
            bg-black text-white dark:bg-white dark:text-black
            text-xs w-5 h-5 mx-3 my-2
            flex items-center justify-center shrink-0
            cursor-pointer
        `}
        id="create-script-button"
        onClick={create}
        title={t("newScript")}
        aria-label={t("newScript")}
    >
        <i className="icon icon-plus2" />
    </button>
}

const Tab = ({ scriptID, scriptName, inMenu }: { scriptID: string, scriptName: string, inMenu: boolean }) => {
    const dispatch = useDispatch()
    const modified = useSelector(tabs.selectModifiedScripts).includes(scriptID)

    const allScripts = useSelector(scripts.selectAllScripts)
    const script = allScripts[scriptID]
    const scriptType = (script.isShared && "shared") || (script.readonly && "readonly") || "regular"
    const activeTabID = useSelector(tabs.selectActiveTabID)
    const active = activeTabID === scriptID
    const { t } = useTranslation()

    const tabDivClass = classNames("shrink-0 cursor-pointer border text-sm",
        {
            "w-32": !inMenu,
            "bg-blue border-blue": active,
            "bg-gray-200 hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800": !active, // background
            "border-gray-300 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-900": !active, // border
        },
        {
            // treating tab text color separately for code readability
            "text-white dark:text-gray-300": active && !modified,
            "text-red-500": active && modified,
            "text-red-600": !active && modified,
            "text-gray-600 hover:text-white dark:text-gray-400": !active && !modified,
        },
        "flex relative")

    const tabButtonClass = classNames(
        {
            "w-32": !inMenu,
        }
    )
    const closeButtonClass = classNames("flex items-center hover:text-gray-800",
        {
            "hover:bg-gray-400": !active,
            "hover:bg-gray-300": active,
        })

    return <div className={tabDivClass}>
        <button
            className={tabButtonClass}
            key={scriptID}
            onClick={() => {
                if (activeTabID !== scriptID) {
                    dispatch(tabThunks.setActiveTabAndEditor(scriptID))
                }
            }}
            title={script.name}
            aria-label={script.name}
        >
            <DropdownContextMenuCaller
                className="flex justify-between items-center truncate p-2 pr-6 w-full"
                script={script}
                type={scriptType}
            >
                <div className="flex items-center space-x-1.5 truncate">
                    {script.isShared && <i className="icon-copy3 align-middle" title={`Shared by ${script.creator}`}/>}
                    <div className="truncate select-none align-middle">{scriptName}</div>
                </div>
            </DropdownContextMenuCaller>
            {active && (<div className="w-full border-b-4 border-amber absolute bottom-0"/>)}
        </button>
        <div className="flex items-center absolute top-0 bottom-0 right-0 my-auto mr-2">
            <button
                className={closeButtonClass}
                onClick={(event) => {
                    dispatch(tabThunks.closeAndSwitchTab(scriptID))
                    // The tab is reselected otherwise.
                    event.preventDefault()
                    event.stopPropagation()
                }}
                title={t("ariaDescriptors:scriptBrowser.close", { scriptname: scriptName })}
                aria-label={t("ariaDescriptors:scriptBrowser.close", { scriptname: scriptName })}
            >
                <i className="icon-cross2 cursor-pointer"/>
            </button>
        </div>
    </div>
}

const CloseAllTab = ({ closeAll }: { closeAll: () => void }) => {
    const { t } = useTranslation()
    return <div
        className={`
            shrink-0 h-8 p-1.5 cursor-pointer
            flex items-center
            text-white bg-gray-800 border border-gray-800    
        `}
        onClick={closeAll}
    >
        {t("tabs.closeAll")}
    </div>
}

const MainTabGroup = ({ create }: { create: () => void }) => {
    const visibleTabs = useSelector(tabs.selectVisibleTabs)
    const allScripts = useSelector(scripts.selectAllScripts)

    return <div className="flex items-center truncate">
        {visibleTabs.map((ID: string) => allScripts[ID] &&
        <Tab key={ID} scriptID={ID} scriptName={allScripts[ID].name} inMenu={false} />
        )}
        <CreateScriptButton create={create} />
    </div>
}

const TabDropdown = ({ closeAll }: { closeAll: () => void }) => {
    const openTabs = useSelector(tabs.selectOpenTabs)
    const hiddenTabs = useSelector(tabs.selectHiddenTabs)
    const allScripts = useSelector(scripts.selectAllScripts)
    const { t } = useTranslation()

    const otherTabsHeight = useSelector(layout.selectOtherTabsHeight)
    const otherTabsStyle: React.CSSProperties = { maxHeight: otherTabsHeight, overflowY: "scroll" }

    return <div className="h-full">
        <Menu as="div" className="relative inline-block h-full pl-1.5 text-left bg-gray-200 dark:bg-gray-800
        hover:bg-gray-100 dark:hover:bg-gray-500">
            <Menu.Button className="h-full text-gray-800 dark:text-gray-200">
                <div className="flex flex-row items-center text-sm">
                    {openTabs.length === hiddenTabs.length ? "All Tabs" : t("tabs.otherTabs")}
                    <i className="icon icon-arrow-down2 text-xs p-2"/>
                </div>
            </Menu.Button>
            <Menu.Items style={otherTabsStyle} className={"absolute z-50 right-0 mt-1 origin-top-right " +
                "border border-black bg-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none " +
                "divide-y divide-gray-300 dark:divide-gray-800"}>
                {hiddenTabs.map((ID: string) => allScripts[ID] && (
                    <Menu.Item key={ID}>
                        <Tab scriptID={ID} scriptName={allScripts[ID].name} inMenu={true}/>
                    </Menu.Item>
                ))}
                <Menu.Item>
                    <CloseAllTab closeAll={closeAll} />
                </Menu.Item>
            </Menu.Items>
        </Menu>
    </div>
}

export const Tabs = ({ create, closeAll }: { create: () => void, closeAll: () => void }) => {
    const dispatch = useDispatch()
    const openTabs = useSelector(tabs.selectOpenTabs)
    const truncated = useSelector(tabs.selectTabsTruncated)
    const theme = useSelector(appState.selectColorTheme)
    const embedMode = useSelector(appState.selectEmbedMode)

    const tabWidth = 126
    const createButtonWidth = 35
    const dropdownWidth = 95
    const containerRef = useRef<HTMLDivElement>(null)

    // Note: Manually compute the visible tabs from the content width.
    // IntersectionObserver API would be more desirable but it is hard to accommodate the appended createButton and dropdown menu.
    // this work is done on the next animation frame to avoid triggering resize effects in the same frame the resize is observered,
    // which triggers the ResizeObserver loop limit (a silent error, but one which still pollutes new relic).
    // You can read more about the issue in these places: https://github.com/WICG/resize-observer/issues/38,
    // https://github.com/cerner/terra-clinical/pull/551, https://github.com/cerner/terra-core/pull/1647
    useEffect(() => {
        let tabResizeAnimationFrame: number | undefined
        const observer = new ResizeObserver(entries => {
            tabResizeAnimationFrame = window.requestAnimationFrame(() => {
                const containerWidth = entries[0].contentRect.width
                const cutoff = ~~((containerWidth - createButtonWidth - dropdownWidth * truncated) / tabWidth)
                dispatch(tabs.setNumVisibleTabs(cutoff))
            })
        })
        containerRef.current && observer.observe(containerRef.current)

        return () => {
            containerRef.current && observer.unobserve(containerRef.current)
            // clean up an oustanding animation frame request if it exists
            if (tabResizeAnimationFrame) window.cancelAnimationFrame(tabResizeAnimationFrame)
        }
    }, [containerRef, openTabs, truncated])

    return <div
        className={`
            ${embedMode ? "hidden" : "flex"}
            justify-between items-center
            ${theme === "light" ? "bg-gray-200" : "dark bg-gray-900"}
        `}
        ref={containerRef}
    >
        <MainTabGroup create={create} />
        {truncated ? <TabDropdown closeAll={closeAll} /> : ""}
    </div>
}
