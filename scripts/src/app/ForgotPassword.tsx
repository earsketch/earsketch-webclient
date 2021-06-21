import React, { useState } from "react"

import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import { useTranslation } from "react-i18next"

export const ForgotPassword = ({ close }: { close: () => void }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState("")

    const resetPassword = () => {
        const url = URL_DOMAIN + '/services/scripts/resetpwd?email=' + encodeURIComponent(email)
        fetch(url).then(response => {
            if (response.ok) {
                esconsole("Forgot Password succeeded", "info")
                userNotification.show(t('messages:forgotpassword.success'), "success", 3.5)
            } else {
                esconsole("Forgot Password failed", "info")
                userNotification.show(t('messages:forgotpassword.fail'), "failure1", 3.5)
            }
        })
        close()
    }

    return <>
        <div className="modal-header">
            <h3>Forgot your password?</h3>
        </div>
        <form onSubmit={e => { e.preventDefault(); resetPassword() }}>
            <div className="modal-body">
                <label className="w-full">
                    Please enter the email associated with your account
                    <input type="email" className="form-control" name="email" placeholder="Email" required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
                </label>
            </div>
            <div className="modal-footer">
                <input type="submit" value="Recover" className="btn btn-primary" />
            </div>
        </form>
    </>
}
