import { useState } from "react"

import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import { post } from "../request"
import { useTranslation } from "react-i18next"
import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"

export const AccountCreator = ({ close }: { close: (value?: { username: string, password: string }) => void }) => {
    const [error, setError] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [email, setEmail] = useState("")
    const { t } = useTranslation()

    const submit = async () => {
        try {
            const data = await post("/users/create", { username, password, email })
            if (data.state !== 0) {
                esconsole("Error creating user: " + data.description, "error")
                if (data.description === "useralreadyexists") {
                    setError(t("messages:createaccount.useralreadyexists"))
                }
            } else {
                setError("")
                userNotification.show(t("accountCreator.success"), "success")
                close({ username, password })
            }
        } catch (error) {
            esconsole(error, "error")
            userNotification.show(t("messages:createaccount.commerror"), "failure1")
        }
    }

    return <>
        <ModalHeader>{t("accountCreator.prompt")}</ModalHeader>

        <form onSubmit={e => { e.preventDefault(); submit() }}>
            <ModalBody>
                <Alert message={error}></Alert>
                <div>
                    <label>
                        {t("formfieldPlaceholder.username")}
                        <input type="text" className="form-input w-full mb-2 dark:bg-transparent"
                            name="username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required maxLength={25}
                            pattern="[a-zA-Z_][0-9a-zA-Z_]*"
                            title={t("messages:createaccount.usernameconstraint")}
                        />
                    </label>
                </div>

                <div className="flex">
                    <label className="w-full mr-2">
                        {t("formfieldPlaceholder.password")}
                        <input type="password" className="form-input mb-2 w-full dark:bg-transparent"
                            name="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required minLength={5} />
                    </label>

                    <label className="w-full ml-2">
                        {t("formfieldPlaceholder.confirmPassword")}
                        <input type="password" className="form-input mb-2 w-full dark:bg-transparent" name="passwordconfirm" onChange={e => {
                            e.target.setCustomValidity(e.target.value === password ? "" : t("messages:createaccount.pwdfail"))
                            setConfirmPassword(e.target.value)
                        }} value={confirmPassword} required />
                    </label>
                </div>

                <div>
                    <label>{t("formFieldPlaceholder.emailOptional")}
                        <p className="text-sm">{t("formFieldPlaceholder.emailOptional.usedFor")}</p>
                        <input type="email" className="form-input w-full dark:bg-transparent" name="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </label>
                </div>

            </ModalBody>
            <ModalFooter submit="accountCreator.submit" close={close} />
        </form>
    </>
}
