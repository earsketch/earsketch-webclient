import { useState } from "react"
import { useTranslation } from "react-i18next"
import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import { post } from "../request"
import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"

export type AccountMenuMode = "login" | "register" | "recover"

export const AccountMenu = ({
    close,
    loggedIn,
    isAdmin,
    username: initialUsername,
    password: initialPassword,
    onLogin,
    onEditProfile,
    onLogout,
    onAdminWindow,
    setUsername,
    setPassword,
}: {
    close: () => void
    loggedIn: boolean
    isAdmin?: boolean
    username?: string
    password?: string
    email?: string
    onLogin: (username: string, password: string) => void
    onEditProfile: () => void
    onLogout: () => void
    onAdminWindow?: () => void
    setUsername: (u: string) => void
    setPassword: (p: string) => void
}) => {
    const { t } = useTranslation()
    const [mode, setMode] = useState<AccountMenuMode>("login")
    const [username, setUsernameLocal] = useState(initialUsername || "")
    const [password, setPasswordLocal] = useState(initialPassword || "")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [emailLocal, setEmailLocal] = useState("")
    const [recoverEmail, setRecoverEmail] = useState("")
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        if (!username || !password) {
            setError("Please enter both username and password")
            return
        }
        setUsername(username)
        setPassword(password)
        await onLogin(username, password)
        close()
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        try {
            const data = await post("/users/create", { username, password, email: emailLocal })
            if (data.state !== 0) {
                esconsole("Error creating user: " + data.description, "error")
                if (data.description === "useralreadyexists") {
                    setError(t("messages:createaccount.useralreadyexists"))
                }
            } else {
                setError("")
                userNotification.show(t("accountCreator.success"), "success")
                setUsername(username)
                setPassword(password)
                await onLogin(username, password)
                close()
            }
        } catch (error) {
            esconsole(error, "error")
            userNotification.show(t("messages:createaccount.commerror"), "failure1")
        }
    }

    const handleRecoverPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        post("/users/resetpwd", { email: recoverEmail }).then(() => {
            esconsole("Forgot Password succeeded", "info")
            userNotification.show(t("messages:forgotpassword.success"), "success", 3.5)
            close()
        }).catch(() => {
            esconsole("Forgot Password failed", "info")
            userNotification.show(t("messages:forgotpassword.fail"), "failure1", 3.5)
        })
    }

    const handleEditProfile = () => {
        onEditProfile()
        close()
    }

    const handleLogout = () => {
        onLogout()
        close()
    }

    if (loggedIn) {
        return <>
            <ModalHeader>{t("accountMenu.title")}</ModalHeader>
            <ModalBody>
                <div className="space-y-2">
                    <button
                        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        onClick={handleEditProfile}
                    >
                        {t("editProfile")}
                    </button>
                    {isAdmin && onAdminWindow && (
                        <button
                            className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                            onClick={() => {
                                onAdminWindow()
                                close()
                            }}
                        >
                            Admin Window
                        </button>
                    )}
                    <button
                        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        onClick={handleLogout}
                    >
                        {t("logout")}
                    </button>
                </div>
            </ModalBody>
            <ModalFooter close={close} />
        </>
    }

    return <>
        <ModalHeader>
            {mode === "login" && t("accountMenu.login")}
            {mode === "register" && t("accountCreator.prompt")}
            {mode === "recover" && t("forgotPassword.title")}
        </ModalHeader>

        {mode === "login" && (
            <form onSubmit={handleLogin}>
                <ModalBody>
                    <Alert message={error}></Alert>
                    <div>
                        <label>
                            {t("formfieldPlaceholder.username")}
                            <input
                                type="text"
                                className="form-input w-full mb-2 dark:bg-transparent"
                                name="username"
                                value={username}
                                onChange={e => setUsernameLocal(e.target.value)}
                                required
                                maxLength={25}
                                autoComplete="username"
                            />
                        </label>
                    </div>
                    <div>
                        <label>
                            {t("formfieldPlaceholder.password")}
                            <input
                                type="password"
                                className="form-input w-full mb-2 dark:bg-transparent"
                                name="password"
                                value={password}
                                onChange={e => setPasswordLocal(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </label>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            type="button"
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                            onClick={() => setMode("register")}
                        >
                            {t("registerAccount")}
                        </button>
                        <button
                            type="button"
                            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                            onClick={() => setMode("recover")}
                        >
                            {t("forgotPassword.title")}
                        </button>
                    </div>
                </ModalBody>
                <ModalFooter submit="accountMenu.login" close={close} />
            </form>
        )}

        {mode === "register" && (
            <form onSubmit={handleRegister}>
                <ModalBody>
                    <div className="mb-4">
                        <button
                            type="button"
                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            onClick={() => setMode("login")}
                        >
                            ← {t("accountMenu.backToLogin")}
                        </button>
                    </div>
                    <Alert message={error}></Alert>
                    <div>
                        <label>
                            {t("formfieldPlaceholder.username")}
                            <input
                                type="text"
                                className="form-input w-full mb-2 dark:bg-transparent"
                                name="username"
                                value={username}
                                onChange={e => setUsernameLocal(e.target.value)}
                                required
                                maxLength={25}
                                pattern="[a-zA-Z_][0-9a-zA-Z_]*"
                                title={t("messages:createaccount.usernameconstraint")}
                            />
                        </label>
                    </div>
                    <div className="flex">
                        <label className="w-full mr-2">
                            {t("formfieldPlaceholder.password")}
                            <input
                                type="password"
                                className="form-input mb-2 w-full dark:bg-transparent"
                                name="password"
                                value={password}
                                onChange={e => setPasswordLocal(e.target.value)}
                                required
                                minLength={5}
                            />
                        </label>
                        <label className="w-full ml-2">
                            {t("formfieldPlaceholder.confirmPassword")}
                            <input
                                type="password"
                                className="form-input mb-2 w-full dark:bg-transparent"
                                name="passwordconfirm"
                                onChange={e => {
                                    e.target.setCustomValidity(e.target.value === password ? "" : t("messages:createaccount.pwdfail"))
                                    setConfirmPassword(e.target.value)
                                }}
                                value={confirmPassword}
                                required
                            />
                        </label>
                    </div>
                    <div>
                        <label>{t("formFieldPlaceholder.emailOptional")}
                            <p className="text-sm">{t("formFieldPlaceholder.emailOptional.usedFor")}</p>
                            <input type="email" className="form-input w-full dark:bg-transparent" name="email" value={emailLocal} onChange={e => setEmailLocal(e.target.value)} />
                        </label>
                    </div>
                </ModalBody>
                <ModalFooter submit="accountCreator.submit" close={close} />
            </form>
        )}

        {mode === "recover" && (
            <form onSubmit={handleRecoverPassword}>
                <ModalBody>
                    <div className="mb-4">
                        <button
                            type="button"
                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            onClick={() => setMode("login")}
                        >
                            ← {t("accountMenu.backToLogin")}
                        </button>
                    </div>
                    <label className="w-full text-sm">
                        {t("forgotPassword.prompt")}
                        <input
                            type="email"
                            className="form-input w-full dark:bg-transparent placeholder:text-gray-300"
                            name="email"
                            placeholder={t("forgotPassword.email")}
                            required
                            autoComplete="off"
                            value={recoverEmail}
                            onChange={e => setRecoverEmail(e.target.value)}
                        />
                    </label>
                </ModalBody>
                <ModalFooter submit="forgotPassword.submit" close={close} />
            </form>
        )}
    </>
}
