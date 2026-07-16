import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import esconsole from "../esconsole"
import * as userNotification from "../user/notification"
import { post } from "../request"
import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"
import { DialogTitle, Transition } from "@headlessui/react"
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
    return <div>
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
    const containerRef = useRef<HTMLDivElement>(null)
    // Move the screen-reader cursor into the view, but only after the slide-in
    // finishes — focusing mid-transition interrupts it (the entering view just
    // appears). preventScroll guards the case where the modal overflows the viewport.
    useEffect(() => {
        const id = window.setTimeout(() => containerRef.current?.focus({ preventScroll: true }), 250)
        return () => window.clearTimeout(id)
    }, [])
    return <div ref={containerRef} tabIndex={-1} className="p-3.5 outline-none">
        <DialogTitle className="text-2xl text-white">{t("accountCreator.prompt")}</DialogTitle>

        <form onSubmit={handleRegister}>
            <div className="mb-4">
                <button
                    type="button"
                    className="text-sm text-amber hover:text-amber-300 font-bold"
                    onClick={() => setMode("login")}
                >
                    ← {t("accountMenu.backToLogin")}
                </button>
            </div>
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
                        pattern="[a-zA-Z_][0-9a-zA-Z_]*"
                        title={t("messages:createaccount.usernameconstraint")}
                    />
                </label>
            </div>
            <div className="flex text-white">
                <label className="w-full mr-2">
                    {t("formfieldPlaceholder.password")}
                    <input
                        type="password"
                        className="text-black form-input w-full mt-1 mb-2 dark:bg-transparent"
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
                        className="text-black form-input w-full mt-1 mb-2 dark:bg-transparent"
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
            <div className="text-white">
                <label>{t("formFieldPlaceholder.emailOptional")}
                    <p className="text-sm">{t("formFieldPlaceholder.emailOptional.usedFor")}</p>
                    <input type="email" className="text-black form-input w-full mt-1 mb-2 dark:bg-transparent" name="email" value={emailLocal} onChange={e => setEmailLocal(e.target.value)} />
                </label>
            </div>
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
    const containerRef = useRef<HTMLDivElement>(null)
    // Move the screen-reader cursor into the view, but only after the slide-in
    // finishes — focusing mid-transition interrupts it (the entering view just
    // appears). preventScroll guards the case where the modal overflows the viewport.
    useEffect(() => {
        const id = window.setTimeout(() => containerRef.current?.focus({ preventScroll: true }), 250)
        return () => window.clearTimeout(id)
    }, [])
    return <div ref={containerRef} tabIndex={-1} className="p-3.5 outline-none">
        <DialogTitle className="text-2xl text-white">{t("forgotPassword.title")}</DialogTitle>
        <form onSubmit={handleRecoverPassword}>
            <div className="mb-4">
                <button
                    type="button"
                    className="text-sm text-amber hover:text-amber-300 font-bold"
                    onClick={() => setMode("login")}
                >
                    ← {t("accountMenu.backToLogin")}
                </button>
            </div>
            <div className="text-white">
                <label className="w-full text-sm">
                    {t("forgotPassword.prompt")}
                    <input
                        type="email"
                        className="text-black form-input w-full mt-1 dark:bg-transparent placeholder:text-gray-300"
                        name="email"
                        placeholder={t("forgotPassword.email")}
                        required
                        autoComplete="off"
                        value={recoverEmail}
                        onChange={e => setRecoverEmail(e.target.value)}
                    />
                </label>
            </div>
            <ModalFooter submit="forgotPassword.submit" close={close} />
        </form>
    </div>
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

    // Smoothly tween the modal's height when swapping between views of different heights
    // instead of snapping. We observe the INNER grid's natural height and animate the
    // OUTER clipper's height: because animating the outer never changes what we measure
    // (the inner), the ResizeObserver can't feed back into itself. Pure DOM — no React
    // state/re-render — so it can't interfere with the slide.
    const outerRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const outer = outerRef.current
        const inner = innerRef.current
        if (!outer || !inner) return
        let previous = inner.getBoundingClientRect().height
        let animation: Animation | null = null
        const observer = new ResizeObserver(() => {
            const next = inner.getBoundingClientRect().height
            if (Math.abs(next - previous) < 1) return
            const from = previous
            previous = next
            animation?.cancel()
            animation = outer.animate([{ height: `${from}px` }, { height: `${next}px` }], { duration: 200, easing: "ease-out" })
        })
        observer.observe(inner)
        return () => { observer.disconnect(); animation?.cancel() }
    }, [])

    // Grid cell-stacking (every view shares col/row 1) keeps the leaving and entering
    // views overlaid and sizes the container to the taller of the two mid-swap, so it
    // never collapses under the slide. Headless UI's data-attribute transition API drives
    // the slide: `data-[closed]` is the off-screen state and `transition-transform` tweens
    // it. With no `appear` prop the first view shown on open does not animate. Login is the
    // "left" panel and register/recover the "right" panel, so each slides to/from its own
    // edge for both enter and leave. overflow-hidden clips the off-screen views.
    return (
        <div className="bg-blue text-white overflow-x-hidden ring-2 ring-gray-700/50 ring-inset">
            <div ref={outerRef} className="overflow-hidden">
                <div ref={innerRef} className="grid">
                    <Transition show={mode === "login"}>
                        <div className="col-start-1 row-start-1 transition-transform duration-200 ease-out data-[closed]:-translate-x-full">
                            <LoginView
                                username={username}
                                setUsernameLocal={setUsernameLocal}
                                password={password}
                                setPasswordLocal={setPasswordLocal}
                                error={error}
                                handleLogin={handleLogin}
                                setMode={setMode}
                                close={close}
                            />
                        </div>
                    </Transition>
                    <Transition show={mode === "register"}>
                        <div className="col-start-1 row-start-1 transition-transform duration-200 ease-out data-[closed]:translate-x-full">
                            <RegisterView
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
                        </div>
                    </Transition>
                    <Transition show={mode === "recover"}>
                        <div className="col-start-1 row-start-1 transition-transform duration-200 ease-out data-[closed]:translate-x-full">
                            <RecoverView
                                recoverEmail={recoverEmail}
                                setRecoverEmail={setRecoverEmail}
                                handleRecoverPassword={handleRecoverPassword}
                                setMode={setMode}
                                close={close}
                            />
                        </div>
                    </Transition>
                </div>
            </div>
        </div>
    )
}
