import React, { useState } from "react"

import esconsole from "../esconsole"
import * as userNotification from "./userNotification"
import * as userProject from "./userProject"
import { useTranslation } from "react-i18next"

export const ChangePassword = ({ close }: { close: () => void }) => {
    const [error, setError] = useState("")
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const { t } = useTranslation();

    const submitPassword = () => {
        // TODO: This should not be a GET request, and these should not be URL parameters...
        const params = { username: userProject.getUsername(), password: btoa(oldPassword), newpassword: btoa(newPassword) }
        fetch(URL_DOMAIN + "/services/scripts/modifypwd?" + new URLSearchParams(params)).then(response => {
            if (response.status === 200) {
                userProject.setPassword(newPassword)
                userNotification.show("Password changed successfully!", "success")
                close()
            } else if (response.status === 401) {
                setError(t('messages:changepassword.pwdauth'))
            } else {
                esconsole(`Error changing password: ${response.status} ${response.statusText}`, "error")
                setError(t('messages:changepassword.commerror'))
            }
        }).catch(error => {
            esconsole(error, "error")
            setError(t('messages:changepassword.commerror2'))
        })
    }

    return <div>
        <div className="modal-header"><h3>Change Password</h3></div>

        <form onSubmit={e => { e.preventDefault(); submitPassword() }}>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <input type="password" className="form-control" name="oldpassword" placeholder="Old password"
                                   value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <input type="password" className="form-control" name="newpassword1" placeholder="New password"
                                   value={newPassword} onChange={e => {
                                       e.target.setCustomValidity(e.target.validity.valid ? "" : t('messages:changepassword.pwdlength'))
                                       setNewPassword(e.target.value)
                                   }} required minLength={5} />
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group">
                            <input type="password" className="form-control" name="newpassword2" placeholder="Confirm new password" onChange={e => {
                                    e.target.setCustomValidity(e.target.value === newPassword ? "" : t('messages:changepassword.pwdfail'))
                                    setConfirmPassword(e.target.value)
                                }} value={confirmPassword} required />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <input type="button" className="btn btn-warning" onClick={close} value="Cancel" />
                    <input type="submit" className="btn btn-primary" value="Change Password" />
                </div>
            </div>
        </form>
    </div>
}
