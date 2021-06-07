import React, { useState } from "react"

import esconsole from "../esconsole"
import ESMessages from "../data/messages"
import * as userNotification from "./userNotification"

export const ForgotPassword = ({ close }: { close: () => void }) => {
    const [email, setEmail] = useState("")

    const resetPassword = () => {
        const url = URL_DOMAIN + '/services/scripts/resetpwd?email=' + encodeURIComponent(email)
        fetch(url).then(response => {
            if (response.ok) {
                esconsole(ESMessages.forgotpassword.success, "info")
                userNotification.show("Please check your e-mail for a message from EarSketch to reset your password.", "success", 3.5)
            } else {
                esconsole(ESMessages.forgotpassword.fail, "info")
                userNotification.show("The email address you entered is not valid or is not associated with an EarSketch account.", "failure1", 3.5)
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
