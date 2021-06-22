import React, { useState } from "react"

import { changePassword } from "./App"
import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import { useTranslation } from "react-i18next"
import { form } from "./userProject"

export const ProfileEditor = ({ username, password, email: _email, role, firstName: _firstName, lastName: _lastName, close }:
    { username: string, password: string, email: string, role: string, firstName: string, lastName: string, close: (info?: any) => void }) => {
    const [error, setError] = useState("")
    const [firstName, setFirstName] = useState(_firstName)
    const [lastName, setLastName] = useState(_lastName)
    const [email, setEmail] = useState(_email)
    const { t } = useTranslation()

    const updateProfile = () => {
        const _firstName = firstName.trim()
        const _lastName = lastName.trim()
        const _email = email.trim()
        setError("")

        // Maybe this should go in userProject.
        fetch(URL_DOMAIN + "/services/scripts/editprofile", {
            method: "POST",
            body: form({
                username,
                // Why is `encodeURIComponent` here? This is form data, AND base64.
                password: encodeURIComponent(btoa(password)),
                firstname: _firstName,
                lastname: _lastName,
                email: _email,
            })
        }).then(response => {
            if (response.status !== 200) {
                esconsole("Error updating profile", ["editProfile", "error"])
                setError(t('messages:user.emailConflict'))
                return
            }

            if (role === "teacher" && _firstName === "" || _lastName === "" || _email === "") {
                userNotification.show(t('messages:user.teachersLink'), "editProfile")
            }
            userNotification.show(t('profileEditor.success'), "success")
            close({ firstName: _firstName, lastName:_lastName, email: _email })
        }).catch(() => {
            setError(t('profileEditor.error'))
        })
    }

    const openChangePasswordModal = () => {
        changePassword()
        close()
    }

    const enterSubmit = function (event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            updateProfile()
        }
    }

    return <>
        <div className="modal-header">
            <h3>{t('profileEditor.prompt', { username })} ({role})</h3>
        </div>

        <form name="userForm">
            <div className="modal-body">
                {error && <div className="alert alert-danger">
                    {error}
                </div>}

                {role !== "student" && <>
                    <div style={{display: "flex", justifyContent: "center", height: "2.5em"}}>{t('messages:user.infoRequired')}</div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <input type="text" className="form-control" name="firstname" placeholder={t('formFieldPlaceholder.firstName')}
                                    value={firstName} onChange={e => setFirstName(e.target.value)} onKeyDown={enterSubmit} />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="form-group">
                                <input type="text" className="form-control" name="lastname" placeholder={t('formFieldPlaceholder.lastName')}
                                    value={lastName} onChange={e => setLastName(e.target.value)} onKeyDown={enterSubmit} />
                            </div>
                        </div>
                    </div>
                </>}

                <div className="row">
                    <div className="col-md-12">
                        <div className="form-group">
                            <input type="email" className="form-control" name="email" placeholder={(role === "student" ? t('formFieldPlaceholder.emailOptional') : t('formFieldPlaceholder.email'))}
                                   value={email} onChange={e => setEmail(e.target.value)} onKeyDown={enterSubmit} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal-footer">
                <span onClick={openChangePasswordModal} style={{float: "left"}}><a href="#">{t('changePassword.prompt').toLocaleUpperCase()}</a></span>
                <span onClick={close}><a href="#" style={{color: "#d04f4d", marginRight: "14px"}}><i className="icon icon-cross2"></i>{t('cancel').toLocaleUpperCase()}</a></span>
                <span onClick={updateProfile} style={{color: "#337ab7"}}><a href="#"><i className="icon icon-checkmark"></i>{t('update').toLocaleUpperCase()}</a></span>
            </div>
        </form>
    </>
}