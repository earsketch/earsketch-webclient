import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"

import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import * as request from "../request"

export const ProfileEditor = ({ username, email: _email, close }: { username: string, email: string, close: (email?: string) => void }) => {
    const { t } = useTranslation()
    const [error, setError] = useState("")
    const [password, setPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [email, setEmail] = useState(_email)

    const submitPassword = async () => {
        try {
            await request.postBasicAuth("/users/modifypwd", username, password, { password: newPassword })
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
            await request.postBasicAuth("/users/edit", username, password, { email })
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
        <ModalHeader>{t("profileEditor.prompt", { username })}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); submit() }}>
            <ModalBody>
                <Alert message={error}></Alert>
                <input type="email" className="form-input mb-4 w-full dark:bg-transparent placeholder:text-gray-300" placeholder={t("formFieldPlaceholder.emailOptional")}
                    value={email} onChange={e => setEmail(e.target.value.trim())} />

                <input type="password" className="form-input mb-4 w-full dark:bg-transparent placeholder:text-gray-300" placeholder={t("formFieldPlaceholder.currentPassword")}
                    value={password} onChange={e => setPassword(e.target.value)} required id="current-password" autoComplete="current-password" />

                <input type="password" className="form-input mb-4 w-full dark:bg-transparent placeholder:text-gray-300" placeholder="New password (Optional)"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={5} />

                {newPassword &&
                <input type="password" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" placeholder={t("formFieldPlaceholder.confirmNewPassword")} onChange={e => {
                    e.target.setCustomValidity(e.target.value === newPassword ? "" : t("messages:changepassword.pwdfail"))
                    setConfirmPassword(e.target.value)
                }} value={confirmPassword} required />}
            </ModalBody>

            <ModalFooter submit="update" ready={newPassword !== "" || email !== _email} close={close} />
        </form>
    </>
}
