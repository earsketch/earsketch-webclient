import React, { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import * as collaboration from "./collaboration"
import { Script, SoundEntity } from "common"
import { parseName, parseExt } from "../esutils"
import reporter from "./reporter"
import { validateScriptName } from "./ScriptCreator"
import * as sounds from "../browser/soundsState"
import * as userNotification from "../user/notification"
import * as userProject from "./userProject"
import { useTranslation } from "react-i18next"
import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"

export const RenameScript = ({ script, conflict, close }: { script: Script, conflict?: boolean, close: (value?: string) => void }) => {
    const [name, setName] = useState(parseName(script.name))
    const extension = parseExt(script.name)
    const [error, setError] = useState("")
    const { t } = useTranslation()

    const confirm = () => {
        try {
            const fullname = validateScriptName(name, extension)
            if (script.collaborative) {
                collaboration.renameScript(script.shareid, fullname, userProject.getUsername())
                reporter.renameSharedScript()
            }
            close(fullname)
        } catch (error) {
            setError(error.message)
        }
    }

    return <>
        <ModalHeader>{t("renameScript.title")}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); confirm() }}>
            <ModalBody>
                <Alert message={t(error)}></Alert>
                {conflict && t("renameScript.alreadyExists", { scriptName: script.name })}
                <span className="text-sm">{t("renameScript.prompt")}</span>
                <div className="relative">
                    <input type="text" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" value={name} onChange={e => setName(e.target.value)} autoFocus />
                    <span className="absolute inset-y-0 right-0 flex items-center mr-2 text-gray-500 dark:text-gray-300">{extension}</span>
                </div>
            </ModalBody>
            <ModalFooter submit="rename.submit" cancel={conflict ? "renameScript.appendSuffix" : "cancel"}
                close={() => close(conflict ? userProject.nextName(script.name) : undefined)} />
        </form>
    </>
}

export const RenameSound = ({ sound, close }: { sound: SoundEntity, close: () => void }) => {
    const dispatch = useDispatch()
    const soundNames = useSelector(sounds.selectAllNames)
    const username = userProject.getUsername().toUpperCase()
    // Remove <username>_ prefix, which is present in all user sounds.
    const prefix = username + "_"
    const [name, setName] = useState(sound.name.slice(prefix.length))
    const { t } = useTranslation()

    const confirm = () => {
        const specialCharReplaced = /[^\w\s]/g.test(name)
        const cleanName = name
            .replace(/\W/g, "_") // replace white spaces and special characters
            .replace(/_+/g, "_") // consolidate underscores
            .replace(/^_/, "") // remove leading underscore
            .replace(/_$/, "") // remove trailing underscore
            .toUpperCase()

        if (cleanName === "") {
            userNotification.show(t("messages:general.renameSoundEmpty"), "failure1")
            close()
        } else if (soundNames.includes(prefix + cleanName)) {
            userNotification.show(t("messages:general.renameSoundConflict"), "failure1")
            close()
        } else {
            if (specialCharReplaced) {
                userNotification.show(t("messages:general.renameSoundSpecialChar"), "normal")
            }
            userProject.renameSound(sound.name, prefix + cleanName).then(() => {
                dispatch(sounds.renameLocalUserSound({ oldName: sound.name, newName: prefix + cleanName }))
                userNotification.show(t("messages:general.soundrenamed"), "normal")
                close()
            })
        }
    }

    return <>
        <ModalHeader>{t("renameSound.title")}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); confirm() }}>
            <ModalBody>
                <div className="text-sm">{t("renameSound.prompt")}</div>
                <div className="flex items-center mt-3">
                    <span>{username}_</span>
                    <input type="text" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
            </ModalBody>
            <ModalFooter submit="rename.submit" close={close} />
        </form>
    </>
}
