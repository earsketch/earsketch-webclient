import React, { useState } from "react"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { REPORT_LOG } from "../esconsole"

import * as app from "../app/appState"
import * as user from "../user/userState"
import * as editor from "../ide/Editor"
import * as ESUtils from "../esutils"
import * as userNotification from "../user/notification"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"
import store from "../reducers"

async function postJSON(endpoint: string, data: any) {
    const url = URL_DOMAIN + endpoint
    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            Authorization: "Bearer " + user.selectToken(store.getState()),
            "Content-Type": "application/json",
        },
    })
    if (!response.ok) {
        throw new Error(`error code: ${response.status}`)
    }
}

export const ErrorForm = ({ email: storedEmail, close }: { email: string, close: () => void }) => {
    const { t } = useTranslation()
    const language = useSelector(app.selectScriptLanguage)
    const username = useSelector(user.selectUserName)
    const [name, setName] = useState("")
    const [email, setEmail] = useState(storedEmail)
    const [description, setDescription] = useState("")

    const submit = () => {
        let body = ["@xfreeman", "@heerman", "@manodrum"].join(" ") + "\r\n"
        if (name || email) {
            body += "\r\n**Reported by:** " + (name ? name + " " : "") + (email ? `[${email}]` : "") + "\r\n"
            body += username ? "\r\n**Logged in username:** " + username + "\r\n" : ""
        }

        let localStorageDump = ""
        for (const [key, value] of Object.entries(localStorage)) {
            if (key === "persist:user") {
                try {
                    const state = JSON.parse(value)
                    delete state.token
                    localStorageDump += `${key}: ${JSON.stringify(state)}\r\n`
                } catch (error) {
                    localStorageDump += `exception parsing userstate (${value}): ${error.message}`
                }
            } else {
                localStorageDump += `${key}: ${value}\r\n`
            }
        }

        body += `\r\n**OS:** ${ESUtils.whichOS()}\t **Browser:** ${ESUtils.whichBrowser()}\r\n`

        if (description) {
            body += `\r\n**Error Description:** ${description}\r\n`
        }

        body += "\r\n**SOURCE CODE:** \r\n```" + language + "\r\n" + editor.getValue() + "\r\n```"
        body += "\r\n**TRACE LOG:** \r\n```\r\n" + REPORT_LOG.join("\r\n") + "\r\n```"
        body += "\r\n**LOCAL STORAGE:** \r\n```\r\n" + localStorageDump + "\r\n```"

        postJSON("/thirdparty/reportissue", { title: "User reported bug", labels: ["report"], body })
            .then(() => userNotification.show("Thank you for your submission! Your error has been reported.", "success"))
            .catch(() => userNotification.show("Error submitting report.", "failure1"))

        close()
    }

    return <div>
        <ModalHeader>{t("errorReport.header")}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); submit() }}>
            <ModalBody>
                <label htmlFor="name" className="text-sm">Name (optional)</label>
                <div className="mt-1 mb-3">
                    <input id="name" type="text" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <label htmlFor="email" className="text-sm">Email (optional)</label>
                <div className="mt-1 mb-3">
                    <input id="email" type="email" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <label htmlFor="description" className="text-sm">Description</label>
                <div className="mt-1 mb-3">
                    <textarea id="description" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" rows={4} cols={54} value={description} onChange={e => setDescription(e.target.value)} autoFocus required />
                </div>
            </ModalBody>
            <ModalFooter submit="submit" ready={description !== ""} close={close} />
        </form>
    </div>
}
