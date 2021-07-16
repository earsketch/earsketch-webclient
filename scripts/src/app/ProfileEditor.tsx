import React, { useState } from "react"
import { useTranslation } from "react-i18next"

import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import * as userProject from "./userProject"

export const ProfileEditor = ({ username, email, role, firstName, lastName, close }:
    { username: string, email: string, role: string, firstName: string, lastName: string, close: (info?: any) => void }) => {
    const [mode, setMode] = useState("details")
    if (mode === "details") {
        return <DetailEditor {...{ username, email, role, firstName, lastName, close }} changePassword={() => setMode("password")} />
    } else {
        return <PasswordEditor close={close} />
    }
}

export const DetailEditor = ({ username, email: _email, role, firstName: _firstName, lastName: _lastName, changePassword, close }:
    { username: string, email: string, role: string, firstName: string, lastName: string, changePassword: () => void, close: (info?: any) => void }) => {
    const [error, setError] = useState("")
    const [firstName, setFirstName] = useState(_firstName)
    const [lastName, setLastName] = useState(_lastName)
    const [email, setEmail] = useState(_email)
    const { t } = useTranslation()

    const submit = async () => {
        const _firstName = firstName.trim()
        const _lastName = lastName.trim()
        const _email = email.trim()
        setError("")

        // Maybe this should go in userProject.
        try {
            await userProject.postAuthForm("/services/scripts/editprofile", { firstname: _firstName, lastname: _lastName, email: _email })
        } catch {
            esconsole("Error updating profile", ["editProfile", "error"])
            setError(t("profileEditor.error"))
            // TODO: Check response, set error to messages:user.emailConflict if warranted.
            setError(t("messages:user.emailConflict"))
            return
        }
        userNotification.show(t("profileEditor.success"), "success")
        close({ firstName: _firstName, lastName: _lastName, email: _email })
    }

    return <>
        <div className="modal-header">
            <h3>{t("profileEditor.prompt", { username })} ({role})</h3>
        </div>

        <form onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="modal-body">
                {error && <div className="alert alert-danger">
                    {error}
                </div>}

                {role !== "student" && <>
                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <input type="text" className="form-control" name="firstname" placeholder={t("formFieldPlaceholder.firstName")}
                                    value={firstName} onChange={e => setFirstName(e.target.value)} />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <input type="text" className="form-control" name="lastname" placeholder={t("formFieldPlaceholder.lastName")}
                                    value={lastName} onChange={e => setLastName(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </>}

                <div className="row">
                    <div className="col-md-12">
                        <div className="form-group">
                            <input type="email" className="form-control" name="email" placeholder={t("formFieldPlaceholder.emailOptional")}
                                value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal-footer">
                <input type="button" className="btn btn-warning" onClick={changePassword} style={{ float: "left" }} value={t("changePassword.prompt").toLocaleUpperCase()} />
                <input type="button" className="btn btn-default" onClick={close} value={t("cancel").toLocaleUpperCase()} />
                <input type="submit" className="btn btn-primary" value={t("update").toLocaleUpperCase()} />
            </div>
        </form>
    </>
}

const PasswordEditor = ({ close }: { close: () => void }) => {
    const [error, setError] = useState("")
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const { t } = useTranslation()

    const submit = () => {
        // TODO: This should not be a GET request, and these should not be URL parameters...
        const params = { username: userProject.getUsername(), password: btoa(oldPassword), newpassword: btoa(newPassword) }
        fetch(URL_DOMAIN + "/services/scripts/modifypwd?" + new URLSearchParams(params)).then(response => {
            if (response.status === 200) {
                userNotification.show(t("changePassword.success"), "success")
                close()
            } else if (response.status === 401) {
                setError(t("messages:changepassword.pwdauth"))
            } else {
                esconsole(`Error changing password: ${response.status} ${response.statusText}`, "error")
                setError(t("messages:changepassword.commerror"))
            }
        }).catch(error => {
            esconsole(error, "error")
            setError(t("messages:changepassword.commerror2"))
        })
    }

    // jscpd:ignore-start
    return <div>
        <div className="modal-header"><h3>{t("changePassword.prompt")}</h3></div>

        <form onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <input type="password" className="form-control" name="oldpassword" placeholder={t("formFieldPlaceholder.oldPassword")}
                                value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <input type="password" className="form-control" name="newpassword1" placeholder="New password"
                                value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={5} />
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <input type="password" className="form-control" name="newpassword2" placeholder={t("formFieldPlaceholder.confirmNewPassword")} onChange={e => {
                                e.target.setCustomValidity(e.target.value === newPassword ? "" : t("messages:changepassword.pwdfail"))
                                setConfirmPassword(e.target.value)
                            }} value={confirmPassword} required />
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal-footer">
                <input type="button" className="btn btn-default" onClick={close} value={t("cancel").toLocaleUpperCase()} />
                <input type="submit" className="btn btn-danger" value={t("changePassword.prompt").toLocaleUpperCase()} />
            </div>
        </form>
    </div>
    // jscpd:ignore-end
}
