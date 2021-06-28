import React, { useState } from "react"

import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import { postForm } from "./userProject"
import { useTranslation } from "react-i18next"

export const AccountCreator = ({ close }: { close: (value?: any) => void }) => {
    const [error, setError] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [email, setEmail] = useState("")
    const { t } = useTranslation()

    const submit = async () => {
        setError("Please wait...")
        try {
            // TODO: This endpoint is poorly named - it creates new accounts.
            const data = await postForm("/services/scripts/signin", {
                username: username,
                email: email,
                // TODO: The endpoint should not expect this to be URL-encoded.
                password: encodeURIComponent(btoa(password)),
                // TODO: The endpoint should fill these in.
                first_name: "",
                last_name: "",
                // TODO: These appear to be unused, by the server returns 500 if they are omitted...
                image_url: "http://earsketch.gatech.edu/media/img/profileImg/1.png",
                description: "EarSketch User",
                favorite_artists: "Richard Devine Young Guru",
            })
            if (data.state !== 0) {
                esconsole("Error creating user: " + data.description, "error")
                if (data.description === "useralreadyexists") {
                    setError(t('messages:createaccount.useralreadyexists'))
                }
            } else {
                setError("")
                userNotification.show(t('accountCreator.success'), "success")
                close({ username, password })
            }
        } catch (error) {
            esconsole(error, "error")
            userNotification.show(t('messages:createaccount.commerror'), "failure1")
        }
    }

    return <>
        <div className="modal-header"><h3>{t('accountCreator.prompt')}</h3></div>
        
        <form onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="row">
                    <div className="col-md-12">
                        <div className="form-group">
                            <input type="text" className="form-control" name="username" placeholder={t('formfieldPlaceholder.username')} value={username} onChange={e => setUsername(e.target.value)} required maxLength={25} pattern="[a-zA-Z_][0-9a-zA-Z_]*" title={t('messages:createaccount.usernameconstraint')} />
                        </div>
                    </div>
                </div>
            
                <div className="row">
                    <div className="col-md-6">
                    <div className="form-group">
                        <input type="password" className="form-control" name="password" placeholder={t('formfieldPlaceholder.password')} value={password} onChange={e => setPassword(e.target.value)} required minLength={5} />
                    </div>
                    </div>
            
                    <div className="col-md-6">
                    <div className="form-group">
                        <input type="password" className="form-control" name="passwordconfirm" placeholder={t('formfieldPlaceholder.confirmPassword')} onChange={e => {
                                e.target.setCustomValidity(e.target.value === password ? "" : t('messages:createaccount.pwdfail'))
                                setConfirmPassword(e.target.value)
                            }} value={confirmPassword} required  />
                    </div>
                    </div>
                </div>
            
                <div className="row">
                    <div className="col-md-12">
                    <div className="form-group">
                        <input type="email" className="form-control" name="email" placeholder={t('formFieldPlaceholder.emailOptional')} value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    </div>
                </div>
            </div>
            
            <div className="modal-footer">
                <input type="button" className="btn btn-default" onClick={() => close()} value={t('cancel') as string} />
                <input type="submit" className="btn btn-primary" value={t('accountCreator.submit') as string} />
            </div>
        </form>
    </>
}
