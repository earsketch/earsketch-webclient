import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"

import * as app from "../app/appState"
import * as scriptsState from "../browser/scriptsState"
import store from "../reducers"
import { ModalFooter, ModalHeader, ModalBody, Alert } from "../Utils"

export function validateScriptName(name: string, extension: string) {
    const fullname = name + extension
    const scripts = scriptsState.selectRegularScripts(store.getState())

    if (name.length < 3) {
        throw new Error("messages:general.shortname")
    } else if (/[$-/:-?{-~!"^#`[\]\\]/g.test(name)) {
        // Why are hyphens banned from script names?
        throw new Error("messages:idecontroller.illegalname")
    } else if (Object.values(scripts).some(script => !script.soft_delete && script.name === fullname)) {
        // Conflict with existing script.
        throw new Error("messages:idecontroller.overwrite")
    } else if (![".py", ".js"].includes(extension)) {
        throw new Error("messages:idecontroller.illegalname")
    } else {
        // Valid name.
        return name + extension
    }
}

export const ScriptCreator = ({ close }: { close: (value?: any) => void }) => {
    const language = useSelector(app.selectScriptLanguage)
    const [name, setName] = useState("")
    const [error, setError] = useState("")
    const [extension, setExtension] = useState(language === "python" ? ".py" : ".js")
    const { t } = useTranslation()

    const confirm = () => {
        try {
            close(validateScriptName(name, extension))
        } catch (error) {
            setError(error.message)
        }
    }

    return <>
        <ModalHeader>{t("scriptCreator.title")}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); confirm() }}>
            <ModalBody>
                <Alert message={t(error)}></Alert>
                <div className="flex mb-2">
                    <div className="form-group w-1/2 mx-6">
                        <label>{t("scriptCreator.scriptName")}</label>
                        <p className="text-sm">{t("scriptCreator.scriptName.subtext")}</p>
                    </div>
                    <div className="form-group w-1/2 mx-6">
                        <label>{t("scriptCreator.scriptLang")}</label>
                        <p className="text-sm">{t("scriptCreator.scriptLang.subtext")}</p>
                    </div>
                </div>
                <div className="flex">
                    <div className="w-1/2 mx-6 relative">
                        <input className="form-input w-full dark:bg-transparent placeholder:text-gray-300" autoFocus autoComplete="off"
                            name={t("scriptCreator.scriptName")} id="scriptName" placeholder={t("scriptCreator.scriptName")}
                            title={t("scriptCreator.scriptName")} aria-label={t("scriptCreator.scriptName")}
                            value={name} onChange={e => setName(e.target.value)} />
                        <div className="absolute inset-y-0 right-0 flex items-center mr-2 text-gray-500 dark:text-gray-300">{extension}</div>
                    </div>

                    <select className="form-select w-1/2 mx-6 dark:bg-transparent placeholder:text-gray-300" value={extension} onChange={e => setExtension(e.target.value)} title={t("curriculum.switchScriptLanguage")} aria-label={t("curriculum.switchScriptLanguage")}>
                        <option value=".py">Python</option>
                        <option value=".js">JavaScript</option>
                    </select>
                </div>
            </ModalBody>
            <ModalFooter submit="create" close={close} />
        </form>
    </>
}
