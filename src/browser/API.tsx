import React, { useState, ChangeEvent } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"

import { BrowserTabType } from "./BrowserTab"
import * as api from "./apiState"
import { APIItem, APIParameter } from "../data/api_doc"
import { selectScriptLanguage } from "../app/appState"

import { SearchBar } from "./Utils"
import * as editor from "../ide/Editor"
import * as tabs from "../ide/tabState"
import { addUIClick } from "../cai/student"
import { highlight } from "../ide/highlight"

const Code = ({ source, language }: { source: string, language: "python" | "javascript" }) => {
    const { light, dark } = highlight(source, language)
    return <>
        <code className={language + " whitespace-pre overflow-x-auto block dark:hidden"}>
            {light}
        </code>
        <code className={language + " whitespace-pre overflow-x-auto hidden dark:block"}>
            {dark}
        </code>
    </>
}

// Hack from https://stackoverflow.com/questions/46240647/react-how-to-force-a-function-component-to-render
// TODO: Get rid of this by moving obj.details into Redux state.
function useForceUpdate() {
    const [_, setValue] = useState(0) // integer state
    return () => setValue(value => ++value) // update the state to force render
}

const paste = (name: string, obj: APIItem) => {
    const args: string[] = []
    for (const param in obj.parameters) {
        args.push(param)
    }

    editor.pasteCode(`${name}(${args.join(", ")})`)
}

const fixValue = (language: string, value: string) => language !== "python" && ["True", "False"].includes(value) ? value.toLowerCase() : value

// Main point of this module.
const Entry = ({ name, obj }: { name: string, obj: APIItem & { details?: boolean } }) => {
    // TODO don't mutate obj.details
    const { t } = useTranslation()
    const forceUpdate = useForceUpdate()
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length
    const language = useSelector(selectScriptLanguage)

    const returnText = "Returns: " + (obj.returns ? `(${t(obj.returns.typeKey)}) - ${t(obj.returns.descriptionKey)}` : "undefined")
    return (
        <div className="p-3 border-b border-r border-black border-gray-500 dark:border-gray-700">
            <div className="flex justify-between mb-2">
                <span
                    className="font-bold cursor-pointer truncate" title={returnText}
                    onClick={() => { obj.details = !obj.details; forceUpdate(); addUIClick("api - read - " + obj.signature) }}
                >
                    {name}
                </span>
                <div className="flex">
                    <button
                        className={`hover:bg-gray-200 active:bg-gray-300 h-full pt-1 mr-2 text-xs rounded-full px-2.5 border border-gray-600 ${tabsOpen ? "" : "hidden"}`}
                        onClick={() => { paste(name, obj); addUIClick("api - copy - " + name) }}
                        title={t("api:pasteToCodeEditor", { name })}
                        aria-label={t("api:pasteToCodeEditor", { name })}>
                        <i className="icon icon-paste2" />
                    </button>
                    <button className="hover:bg-gray-200 active:bg-gray-300 h-full text-sm rounded-full pl-1.5 border border-gray-600 whitespace-nowrap"
                        onClick={() => { obj.details = !obj.details; forceUpdate(); addUIClick("api - read - " + obj) }}
                        title={obj.details ? t("ariaDescriptors:api.closeFunctionDetails", { functionName: name }) : t("ariaDescriptors:api.openFunctionDetails", { functionName: name })}
                        aria-label={`${obj.details ? t("ariaDescriptors:api.closeFunctionDetails", { functionName: name }) : t("ariaDescriptors:api.openFunctionDetails", { functionName: name })}`}>
                        <div className="inline-block w-10">{obj.details ? t("api:close") : t("api:open")}</div>
                        <i className={`inline-block align-middle mb-px mx-1 icon icon-${obj.details ? "arrow-down" : "arrow-right"}`} />
                    </button>
                </div>
            </div>
            {obj.parameters
                ? (<div className="text-xs font-light break-word">
                    <span className="px-1">(</span>
                    {Object.entries(obj.parameters).map(([param, paramVal]: [string, APIParameter]) => (
                        <span key={param}>
                            <span title={`${param} (${t(paramVal.typeKey)}) - ${t(paramVal.descriptionKey)}`}>{param}</span>
                            {paramVal.default !== undefined &&
                            <span>
                                <span className="text-gray-600 px-1">=</span>
                                <span className="text-blue-600">{fixValue(language, paramVal.default)}</span>
                            </span>}
                        </span>
                    )).reduce((prev: any, curr: any): any => [prev, <span key={prev.key + "-comma"}> , </span>, curr])}
                    <span className="px-1">)</span>
                </div>)
                : (<div className="text-xs font-light">{t("api:noparams")}</div>)}
            {obj.details && <Details obj={obj} />}
        </div>
    )
}

const Details = ({ obj }: { obj: APIItem }) => {
    const language = useSelector(selectScriptLanguage)
    const { t } = useTranslation()

    return (
        <div className="border-t border-gray-500 mt-2 pt-1 text-sm">
            <span dangerouslySetInnerHTML={{ __html: t(obj.descriptionKey) }} />
            {obj.parameters &&
            <div className="mt-4">
                <div className="font-bold">{t("api:parameters")}</div>
                {Object.entries(obj.parameters).map(([param, paramVal]) => (
                    <div key={param}>
                        <div className="ml-3 mt-2">
                            <span className="font-bold text-sm">{param}</span>:&nbsp;
                            <span className="text-gray-600 text-sm">{t(paramVal.typeKey)}</span>

                            {/* rhythmEffects parameter description has a link to curriculum */}
                            <div className="text-xs"><span dangerouslySetInnerHTML={{ __html: t(paramVal.descriptionKey) }} /></div>

                            {paramVal.default &&
                            <div>
                                <span className="text-black dark:text-white">{t("api:defaultValue")}</span>:&nbsp;
                                <span className="text-blue-600">{fixValue(language, paramVal.default)}</span>
                            </div>}
                        </div>
                    </div>
                ))}
            </div>}
            {obj.returns &&
            <div className="mt-4">
                <span className="font-bold">{t("api:returnValue")}</span>: <span className="text-gray-600">{t(obj.returns.typeKey)}</span>
                <div className="ml-6">{t(obj.returns.descriptionKey)}</div>
            </div>}
            <div className="mt-4">
                <div className="font-bold mb-1">{t("api:example")}</div>
                <div>
                    {/* note: don't indent the tags inside pre's! it will affect the styling */}
                    {language === "python"
                        ? <pre className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 rounded-md"><Code source={t(obj.example.pythonKey)} language="python" /></pre>
                        : <pre className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 rounded-md"><Code source={t(obj.example.javascriptKey)} language="javascript" /></pre>}
                </div>
            </div>
        </div>
    )
}

const EntryList = () => {
    const entries = useSelector(api.selectFilteredEntries)
    return (<>
        {entries.map(([name, variants]) => {
            return variants.map((o: APIItem, index: number) => <Entry key={name + index} name={name} obj={o} />)
        })}
    </>)
}

const APISearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(api.selectSearchText)
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(api.setSearchText(event.target.value))
    const dispatchReset = () => dispatch(api.setSearchText(""))
    const props = { searchText, dispatchSearch, dispatchReset }

    return <SearchBar {...props} />
}

export const APIBrowser = () => {
    return (
        <>
            <div className="grow-0 pb-3">
                <APISearchBar />
            </div>

            <div className="flex-auto overflow-y-scroll overflow-x-none" role="tabpanel" id={"panel-" + BrowserTabType.API}>
                <EntryList />
            </div>
        </>
    )
}
