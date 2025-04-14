import React, { useState, ChangeEvent } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"

import { BrowserTabType } from "../../browser/BrowserTab"
import * as api from "../../browser/apiState"
import type { APIItem, APIParameter } from "../../api/api"
import { selectScriptLanguage } from "../../app/appState"

import { SearchBar } from "../../browser/Utils"
import * as editor from "../../ide/Editor"
import * as tabs from "../../ide/tabState"
import * as cai from "../../cai/caiState"
import { addUIClick } from "../../cai/dialogue/student"
import { highlight } from "../../ide/highlight"
import { Language } from "common"





const Code = ({ source, language }: { source: string, language: Language }) => {
    const { light, dark } = highlight(source, language)
    return <>
        <code className={language + " whitespace-pre text-4xl overflow-x-auto block dark:hidden"}>
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

const fixValue = (language: Language, value: string) => language !== "python" && ["True", "False"].includes(value) ? value.toLowerCase() : value

// Main point of this module.
const Entry = ({ name, obj }: { name: string, obj: APIItem & { details?: boolean } }) => {
    // TODO don't mutate obj.details
    const { t } = useTranslation()
    const forceUpdate = useForceUpdate()
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length
    const language = useSelector(selectScriptLanguage)

    const returnText = "Returns: " + (obj.returns ? `(${t(obj.returns.typeKey)}) - ${t(obj.returns.descriptionKey)}` : "undefined")
    return (
        <div className="p-24 border-b border-r border-black border-gray-500 dark:border-gray-700">
            <div className="flex justify-center flex-grow mb-2">
                <span style={{ fontSize: "80px", fontWeight: "bold", lineHeight: "300px" }} 
                    className="font-bold text-6xl leading-loose cursor-pointer" title={returnText}
                    onClick={() => { obj.details = !obj.details; forceUpdate(); addUIClick("api read - " + name) }}
                >
                    {name}
                </span>
                <div className="flex">

                </div>
            </div>
            {obj.parameters
                ? (<div className="text-5xl  break-word flex justify-center">
                      {'(' + Object.entries(obj.parameters).map(([param]) => param).join(', ') + ')'}

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
        <div className="border-t leading-relaxed mt-16 border-gray-500 mt-2 pt-1 my-6 text-6xl">
            <span dangerouslySetInnerHTML={{ __html: t(obj.descriptionKey) }} />
            {obj.parameters &&
            <div className="mt-4" >
                <div className="font-bold my-20 text-6xl" >{t("api:parameters")}</div>
                {Object.entries(obj.parameters).map(([param, paramVal]) => (
                    <div key={param}>
                        <div className="ml-3 my-16 mt-2">
                            <span className="font-bold leading-relaxed my-10 text-6xl">{param}</span>:&nbsp;
                            <span className="text-gray-600 my-10 text-6xl">{t(paramVal.typeKey)}</span>

                            {/* rhythmEffects parameter description has a link to curriculum */}
                            <div className="text-6xl leading-relaxed"><span dangerouslySetInnerHTML={{ __html: t(paramVal.descriptionKey) }} /></div>

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
                <div className="leading-relaxed ml-6">{t(obj.returns.descriptionKey)}</div>
            </div>}
            <div className="mt-4">
                <div className="font-bold leading-relaxed my-20 mb-1">{t("api:example")}</div>
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
    const caiHighlight = useSelector(cai.selectHighlight)
    const props = { searchText,
         dispatchSearch, dispatchReset,
          id: "apiSearchBar", highlight: caiHighlight.zone === "apiSearchBar",
           }

    return <SearchBar {...props} />
}

export const APIBrowser = () => {
    return (
        <>
            <div className="text-xl pb-3">
                <APISearchBar />
            </div>  

            <div className="flex-grow overflow-y-scroll overflow-x-none" role="tabpanel" id={"panel-" + BrowserTabType.API}>
                <EntryList />
            </div>
        </>
    )
}






