import { useState } from "react"
import { useTranslation } from "react-i18next"
import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import { post } from "../request"
import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"
import { DialogTitle } from "@headlessui/react"
import esLogo from "./ES_logo_extract.svg"

export type AccountMenuMode = "login" | "register" | "recover"

interface LoginViewProps {
    username: string
    setUsernameLocal: (v: string) => void
    password: string
    setPasswordLocal: (v: string) => void
    error: string
    handleLogin: (e: React.FormEvent) => void
    setMode: (mode: AccountMenuMode) => void
    close: () => void
}

const LoginView = ({ username, setUsernameLocal, password, setPasswordLocal, error, handleLogin, setMode, close }: LoginViewProps) => {
    const { t } = useTranslation()
    return <div className="animate-slide-in-from-left">
        <div className="flex justify-end">
            <button className="m-2" onClick={close} title={t("cancel")}><i className="icon icon-cross2 text-2xl"></i></button>
        </div>

        <div className="mx-32 mt-2 mb-10">
            <div className="flex justify-center"><img className="h-11" src={esLogo} alt="EarSketch Logo" /></div>

            <DialogTitle className="mt-10 text-center text-2xl">{t("accountMenu.loginCallToAction")}</DialogTitle>
            <form onSubmit={handleLogin}>
                <ModalBody>
                    <Alert message={error} />
                    <div className="text-white">
                        <label>
                            {t("formfieldPlaceholder.username")}
                            <input
                                type="text"
                                className="text-black form-input w-full mt-1 mb-2 dark:bg-transparent"
                                name="username"
                                value={username}
                                onChange={e => setUsernameLocal(e.target.value)}
                                required
                                maxLength={25}
                                autoComplete="username"
                            />
                        </label>
                    </div>
                    <div className="text-white">
                        <label>
                            {t("formfieldPlaceholder.password")}
                            <input
                                type="password"
                                className="text-black form-input w-full mt-1 mb-2 dark:bg-transparent"
                                name="password"
                                value={password}
                                onChange={e => setPasswordLocal(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </label>
                    </div>
                    <div className="flex gap-2 mt-1">

                        <button
                            type="button"
                            className="text-amber hover:text-amber-300 font-bold"
                            onClick={() => setMode("recover")}
                        >
                            {t("forgotPassword.title")}
                        </button>
                    </div>
                </ModalBody>
                <div className="p-3.5">
                    <button className="bg-sky-700 hover:bg-sky-500 p-3.5 rounded w-full" type="submit">{t("accountMenu.login")}</button>
                </div>
            </form>
            <div className="text-center">New to EarSketch? <button className="text-amber hover:text-amber-300 font-bold" onClick={() => setMode("register")}>Join now</button></div>

        </div>
    </div>
}

interface RegisterViewProps {
    username: string
    setUsernameLocal: (v: string) => void
    password: string
    setPasswordLocal: (v: string) => void
    confirmPassword: string
    setConfirmPassword: (v: string) => void
    emailLocal: string
    setEmailLocal: (v: string) => void
    error: string
    handleRegister: (e: React.FormEvent) => void
    setMode: (mode: AccountMenuMode) => void
    close: () => void
}

const RegisterView = ({ username, setUsernameLocal, password, setPasswordLocal, confirmPassword, setConfirmPassword, emailLocal, setEmailLocal, error, handleRegister, setMode, close }: RegisterViewProps) => {
    const { t } = useTranslation()
    return <div className="animate-slide-in-from-right">
        <DialogTitle className="p-3.5 text-2xl text-gray-900 dark:text-white">{t("accountCreator.prompt")}</DialogTitle>

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
                <Alert message={error} />
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
    </div>
}

interface RecoverViewProps {
    recoverEmail: string
    setRecoverEmail: (v: string) => void
    handleRecoverPassword: (e: React.FormEvent) => void
    setMode: (mode: AccountMenuMode) => void
    close: () => void
}

const RecoverView = ({ recoverEmail, setRecoverEmail, handleRecoverPassword, setMode, close }: RecoverViewProps) => {
    const { t } = useTranslation()
    return <>
        <div className="mb-4">
            <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                onClick={() => setMode("login")}
            >
                ← {t("accountMenu.backToLogin")}
            </button>
        </div>
        <DialogTitle className="p-3.5 text-2xl text-gray-900 dark:text-white">{t("forgotPassword.title")}</DialogTitle>
        <form onSubmit={handleRecoverPassword}>
            <ModalBody>
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
    </>
}

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

    const view = mode === "register"
        ? <RegisterView
            username={username}
            setUsernameLocal={setUsernameLocal}
            password={password}
            setPasswordLocal={setPasswordLocal}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            emailLocal={emailLocal}
            setEmailLocal={setEmailLocal}
            error={error}
            handleRegister={handleRegister}
            setMode={setMode}
            close={close}
        />
        : mode === "recover"
            ? <RecoverView
                recoverEmail={recoverEmail}
                setRecoverEmail={setRecoverEmail}
                handleRecoverPassword={handleRecoverPassword}
                setMode={setMode}
                close={close}
            />
            : <LoginView
                username={username}
                setUsernameLocal={setUsernameLocal}
                password={password}
                setPasswordLocal={setPasswordLocal}
                error={error}
                handleLogin={handleLogin}
                setMode={setMode}
                close={close}
            />

    return (
        <div className="bg-blue text-white overflow-x-hidden ring-2 ring-gray-700/50 ring-inset">
            {view}
        </div>
    )
}
