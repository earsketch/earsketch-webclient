import React, { useState } from "react"
import { useTranslation } from "react-i18next"

import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import * as userProject from "./userProject"

export const ProfileEditor = ({ username, email: _email, close }: { username: string, email: string, close: (email?: string) => void }) => {
    const { t } = useTranslation()
    const [error, setError] = useState("")
    const [password, setPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [email, setEmail] = useState(_email)

    const submitPassword = async () => {
        try {
            await userProject.postAuth("/users/modifypwd", { password: btoa(password), newpassword: btoa(newPassword) })
        } catch (error) {
            esconsole(error, "error")
            setError(t("messages:changepassword.pwdauth"))
            return false
        }

        userNotification.show(t("changePassword.success"), "success")
        return true
    }

    const submitEmail = async () => {
        setError("")

        // Maybe this should go in userProject.
        try {
            await userProject.postAuth("/users/edit", { email, password: btoa(password) })
        } catch {
            esconsole("Error updating profile", ["editProfile", "error"])
            setError(t("profileEditor.error"))
            // TODO: Check response, set error to messages:user.emailConflict if warranted.
            setError(t("messages:user.emailConflict"))
            return false
        }
        userNotification.show(t("profileEditor.success"), "success")
        return true
    }

    const submit = async () => {
        let emailSuccess = true
        let passwordSuccess = true
        if (email !== _email) {
            emailSuccess = await submitEmail()
        }
        if (emailSuccess) {
            if (newPassword) {
                passwordSuccess = await submitPassword()
            }
            if (passwordSuccess) {
                close(email)
            }
        }
    }

    return <>
        <div className="modal-header">
            <h3>{t("profileEditor.prompt", { username })}</h3>
        </div>
        <form onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <input type="email" className="form-control mb-4" placeholder={t("formFieldPlaceholder.emailOptional")}
                    value={email} onChange={e => setEmail(e.target.value.trim())} />

                <input type="password" className="form-control mb-4" placeholder={t("formFieldPlaceholder.currentPassword")}
                    value={password} onChange={e => setPassword(e.target.value)} required id="current-password" autoComplete="current-password" />

                <input type="password" className="form-control mb-4" placeholder="New password (Optional)"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={5} />

                {newPassword &&
                <input type="password" className="form-control" placeholder={t("formFieldPlaceholder.confirmNewPassword")} onChange={e => {
                    e.target.setCustomValidity(e.target.value === newPassword ? "" : t("messages:changepassword.pwdfail"))
                    setConfirmPassword(e.target.value)
                }} value={confirmPassword} required />}
            </div>

            <div className="modal-footer">
                <input type="button" className="btn btn-default" onClick={() => close()} value={t("cancel").toLocaleUpperCase()} />
                <input type="submit" className="btn btn-primary" value={t("update").toLocaleUpperCase()} disabled={!newPassword && email === _email} />
            </div>
        </form>
    </>
}
