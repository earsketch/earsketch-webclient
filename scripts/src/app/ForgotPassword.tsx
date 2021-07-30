import React, { useState } from "react"

import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import { useTranslation } from "react-i18next"
import { post } from "./userProject"
import { ModalFooter } from "../Utils"

export const ForgotPassword = ({ close }: { close: () => void }) => {
    const { t } = useTranslation()
    const [email, setEmail] = useState("")

    const resetPassword = () => {
        post("/users/resetpwd", { email }).then(() => {
            esconsole("Forgot Password succeeded", "info")
            userNotification.show(t("messages:forgotpassword.success"), "success", 3.5)
        }).catch(() => {
            esconsole("Forgot Password failed", "info")
            userNotification.show(t("messages:forgotpassword.fail"), "failure1", 3.5)
        })
        close()
    }

    return <>
        <div className="modal-header">
            <h3>{t("forgotPassword.title")}</h3>
        </div>
        <form onSubmit={e => { e.preventDefault(); resetPassword() }}>
            <div className="modal-body">
                <label className="w-full">
                    {t("forgotPassword.prompt")}
                    <input type="email" className="form-control" name="email" placeholder={t("forgotPassword.email")} required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
                </label>
            </div>
            <ModalFooter submit="forgotPassword.submit" close={close} />
        </form>
    </>
}
