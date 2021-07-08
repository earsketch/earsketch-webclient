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
            setError(t(error))
        }
    }

    return <>
        <div className="modal-header">{t('renameScript.title')}</div>
        <form onSubmit={e => { e.preventDefault(); confirm() }}>
            <div className="modal-body">
                {error && <div className="alert alert-danger">
                    {error}
                </div>}
                {conflict && t('renameScript.alreadyExists', { scriptName: script.name })}
                {t('renameScript.prompt')}
                <div className="input-group">
                    <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} autoFocus />
                    <span className="input-group-addon">{extension}</span>
                </div>
            </div>
            <div className="modal-footer">
                <input type="submit" className="btn btn-primary" value={t('rename.submit') as string} />
                <input type="button" className="btn btn-default" onClick={() => close()} value={conflict ? t('renameScript.appendSuffix') as string : t('cancel') as string} />
            </div>
        </form>
    </>
}

export const RenameSound = ({ sound, close }: { sound: SoundEntity, close: () => void }) => {
    const dispatch = useDispatch()
    const soundNames = useSelector(sounds.selectAllFileKeys)
    const username = userProject.getUsername().toUpperCase()
    // Remove <username>_ prefix, which is present in all user sounds.
    const prefix = username + "_"
    const [name, setName] = useState(sound.file_key.slice(prefix.length))
    const { t } = useTranslation()

    const confirm = () => {
        const specialCharReplaced = /[^\w\s]/g.test(name)
        const cleanName = name
            .replace(/\W/g, "_")  // replace white spaces and special characters
            .replace(/\_+/g, "_")  // consolidate underscores
            .replace(/^_/, "")  // remove leading underscore
            .replace(/_$/, "")  // remove trailing underscore
            .toUpperCase()

        if (cleanName === "") {
            userNotification.show(t('messages:general.renameSoundEmpty'), "failure1")
            close()
        } else if (soundNames.includes(prefix + cleanName)) {
            userNotification.show(t('messages:general.renameSoundConflict'), "failure1")
            close()
        } else {
            if (specialCharReplaced) {
                userNotification.show(t('messages:general.renameSoundSpecialChar'), "normal")
            }
            userProject.renameAudio(sound.file_key, prefix + cleanName).then(() => {
                dispatch(sounds.renameLocalUserSound({ oldName: sound.file_key, newName: prefix + cleanName }))
                userNotification.show(t('messages:general.soundrenamed'), "normal")
                close()
            })
        }
    }

    return <>
        <div className="modal-header">{t('renameSound.title')}</div>
        <form onSubmit={e => { e.preventDefault(); confirm() }}>
            <div className="modal-body">
                <div>{t('renameSound.prompt')}</div>
                <div className="flex items-center mt-3">
                    <span>{username}_</span>
                    <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>
            </div>
            <div className="modal-footer">
                <input type="submit" className="btn btn-primary" value={t('rename.submit') as string} />
                <input type="button" className="btn btn-default" onClick={close} value={t('cancel') as string} />
            </div>
        </form>
    </>
}
