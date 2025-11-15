import i18n from "i18next"

import { Script } from "common"
import { CompetitionSubmission } from "./CompetitionSubmission"
import { Download } from "./Download"
import esconsole from "../esconsole"
import { openModal } from "./modal"
import { RenameScript } from "./Rename"
import reporter from "./reporter"
import { ScriptAnalysis } from "./ScriptAnalysis"
import { ScriptHistory } from "./ScriptHistory"
import { ScriptShare } from "./ScriptShare"
import * as scriptsState from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"

import store from "../reducers"
import * as tabs from "../ide/tabState"
import * as tabThunks from "../ide/tabThunks"
import * as user from "../user/userState"
import * as userNotification from "../user/notification"
import * as request from "../request"
import { confirm } from "../Utils"


export async function renameScript(script: Script) {
    const name = await openModal(RenameScript, { script })
    if (!name) return
    try {
        // exception occurs below if api call fails
        await scriptsThunks.renameScript(script, name)
    } catch {
        userNotification.show(i18n.t("messages:createaccount.commerror"), "failure1")
        return
    }
    reporter.renameScript()
}

export function downloadScript(script: Script) {
    openModal(Download, { script })
}

export async function openScriptHistory(script: Script, allowRevert: boolean) {
    if (!script.isShared) {
        // saveScript() saves regular scripts - if called for shared scripts, it will create a local copy (#2663).
        await store.dispatch(scriptsThunks.saveScript({ name: script.name, source: script.source_code })).unwrap()
    }
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    openModal(ScriptHistory, { script, allowRevert })
    reporter.openHistory()
}

export function openCodeIndicator(script: Script) {
    openModal(ScriptAnalysis, { script })
}

async function deleteScriptHelper(scriptid: string) {
    if (user.selectLoggedIn(store.getState())) {
        // User is logged in so make a call to the web service
        try {
            const script = await request.postAuth("/scripts/delete", { scriptid })
            esconsole("Deleted script: " + scriptid, "debug")

            const scripts = scriptsState.selectRegularScripts(store.getState())
            if (scripts[scriptid]) {
                script.modified = Date.now()
                store.dispatch(scriptsState.setRegularScripts({ ...scripts, [scriptid]: script }))
            } else {
                // script doesn't exist
            }
        } catch (err) {
            esconsole("Could not delete script: " + scriptid, "debug")
            esconsole(err, ["user", "error"])
        }
    } else {
        // User is not logged in so alter local storage
        const scripts = scriptsState.selectRegularScripts(store.getState())
        const script = { ...scripts[scriptid], soft_delete: true }
        store.dispatch(scriptsState.setRegularScripts({ ...scripts, [scriptid]: script }))
    }
}

export async function deleteScript(script: Script) {
    if (await confirm({ textKey: "messages:confirm.deletescript", okKey: "script.delete", type: "danger" })) {
        await store.dispatch(scriptsThunks.saveScript({ name: script.name, source: script.source_code })).unwrap()
        await deleteScriptHelper(script.shareid)
        reporter.deleteScript()

        store.dispatch(tabThunks.closeDeletedScript(script.shareid))
        store.dispatch(tabs.removeModifiedScript(script.shareid))
    }
}

export async function deleteSharedScript(script: Script) {
    if (await confirm({ textKey: "messages:confirm.deleteSharedScript", textReplacements: { scriptName: script.name }, okKey: "script.delete", type: "danger" })) {
        if (user.selectLoggedIn(store.getState())) {
            await request.postAuth("/scripts/deleteshared", { scriptid: script.shareid })
            esconsole("Deleted shared script: " + script.shareid, "debug")
        }
        const { [script.shareid]: _, ...sharedScripts } = scriptsState.selectSharedScripts(store.getState())
        store.dispatch(scriptsState.setSharedScripts(sharedScripts))
        store.dispatch(tabThunks.closeDeletedScript(script.shareid))
        store.dispatch(tabs.removeModifiedScript(script.shareid))
    }
}

export async function submitToCompetition(script: Script) {
    await store.dispatch(scriptsThunks.saveScript({ name: script.name, source: script.source_code })).unwrap()
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    const shareID = await scriptsThunks.getLockedSharedScriptId(script.shareid)
    openModal(CompetitionSubmission, { name: script.name, shareID })
}

export async function shareScript(script: Script) {
    script = Object.assign({}, script) // copy to avoid mutating original
    await store.dispatch(scriptsThunks.saveScript({ name: script.name, source: script.source_code })).unwrap()
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    openModal(ScriptShare, { script })
}
