import React, { useState } from "react"
import { useSelector } from "react-redux"
import { REPORT_LOG } from "../esconsole"

import * as app from "../app/appState"
import * as editor from "../ide/Editor"
import * as ESUtils from "../esutils"
import * as userNotification from "../user/notification"
import * as userProject from "./userProject"

export const ErrorForm = ({ email: storedEmail, close }: { email: string, close: () => void }) => {
    console.log("storedEmail is", storedEmail)
    const language = useSelector(app.selectScriptLanguage)
    const [name, setName] = useState("")
    const [email, setEmail] = useState(storedEmail)
    const [description, setDescription] = useState("")

    const submit = () => {
        let body = ["@xfreeman", "@heerman", "@manodrum"].join(" ") + "\r\n"
        if (name || email) {
            body += "\r\n**Reported by:** " + (name ? name + " " : "") + (email ? `[${email}]` : "") + "\r\n"
        }

        let localStorageDump = ""
        for (const [key, value] of Object.entries(localStorage)) {
            if (key === "userstate") {
                try {
                    const state = JSON.parse(value)
                    delete state.password
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

        const info = { title: "User reported bug", labels: ["report"], body }
        // TODO: This endpoint should not nest JSON inside form data.
        userProject.postForm("/services/files/reportissue", { jsreport: JSON.stringify(info) })
            .then(() => userNotification.show("Thank you for your submission! Your error has been reported.", "success"))
            .catch(() => userNotification.show("Error submitting report.", "failure1"))

        close()
    }

    return <div>
        <div className="modal-header"><h4 className="modal-title">Report an error</h4></div>
        <form onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="modal-body">
                <div className="form-group">
                    <label htmlFor="name">Name (optional)</label>
                    <input id="name" type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email (optional)</label>
                    <input id="email" type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea id="description" className="form-control" rows={4} cols={54} value={description} onChange={e => setDescription(e.target.value)} required />
                </div>
            </div>
            <div className="modal-footer">
                <input type="button" className="btn btn-default" style={{ color: "rgb(208, 79, 77)" }} onClick={close} value="CANCEL" />
                <input type="submit" className="btn btn-primary" value="SUBMIT" disabled={description === ""} />
            </div>
        </form>
    </div>
}