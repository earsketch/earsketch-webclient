import i18n from "i18next"
import { Dialog, Menu, Popover, Transition } from "@headlessui/react"
import React, { Fragment, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch, useSelector } from "react-redux"

import { AccountCreator } from "./AccountCreator"
import { AdminWindow } from "./AdminWindow"
import * as appState from "../app/appState"
import * as audioLibrary from "./audiolibrary"
import { Bubble } from "../bubble/Bubble"
import * as bubble from "../bubble/bubbleState"
import * as cai from "../cai/caiState"
import * as collaboration from "./collaboration"
import { Script, SoundEntity } from "common"
import { CompetitionSubmission } from "./CompetitionSubmission"
import * as curriculum from "../browser/curriculumState"
import { Download } from "./Download"
import { ErrorForm } from "./ErrorForm"
import { ForgotPassword } from "./ForgotPassword"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { IDE, openShare } from "../ide/IDE"
import * as layout from "../ide/layoutState"
import { LocaleSelector } from "../top/LocaleSelector"
import { NotificationBar, NotificationHistory, NotificationList, NotificationPopup } from "../user/Notifications"
import { ProfileEditor } from "./ProfileEditor"
import { RenameScript, RenameSound } from "./Rename"
import reporter from "./reporter"
import { ScriptAnalysis } from "./ScriptAnalysis"
import { ScriptHistory } from "./ScriptHistory"
import { ScriptShare } from "./ScriptShare"
import * as scripts from "../browser/scriptsState"
import { ScriptDropdownMenu } from "../browser/ScriptsMenus"
import * as sounds from "../browser/soundsState"
import { SoundUploader } from "./SoundUploader"
import store, { persistor } from "../reducers"
import * as tabs from "../ide/tabState"
import * as user from "../user/userState"
import * as userNotification from "../user/notification"
import * as userProject from "./userProject"
import { ModalFooter, Prompt } from "../Utils"

import licenses_ from "../data/licenses.json"

const licenses: { [key: string]: any } = {}
for (const license of licenses_) {
    licenses[(license as any).id] = license
}

const FONT_SIZES = [10, 12, 14, 18, 24, 36]

// There is a little type magic here to accomplish three things:
// 1. Make the compiler check that `props` really matches the props expected by `modal`.
// 2. Allow omitting the `props` argument when the modal only expects `close`, but require it if the modal expects additional props.
// 3. Provide the correct return value: the Promise should resolve to whatever type that `modal` says `close` takes.
//    For example, if `modal` specifies that close has type `(foo?: number) => void`, then this should return `Promise<number | undefined>`.
//    Note that the promise can always resolve to `undefined`, because the user can always dismiss the modal without completing it.
type NoPropModal = (props: { close: (payload?: any) => void } & { [key: string]: never }) => JSX.Element

export function openModal<T extends NoPropModal>(modal: T, props?: undefined): Promise<Parameters<Parameters<T>[0]["close"]>[0]>
export function openModal<T extends appState.Modal>(modal: T, props: Omit<Parameters<T>[0], "close">): Promise<Parameters<Parameters<T>[0]["close"]>[0]>
export function openModal<T extends appState.Modal>(modal: T, props?: Omit<Parameters<T>[0], "close">): Promise<Parameters<Parameters<T>[0]["close"]>[0]> {
    return new Promise(resolve => {
        const wrappedModal = ({ close }: { close: (payload?: any) => void }) => {
            let closed = false
            const closeWrapper = (payload?: any) => {
                if (!closed) {
                    closed = true
                    resolve(payload)
                    close()
                }
            }
            // Close with no payload on unmount (i.e. modal was dismissed without completion).
            useEffect(() => closeWrapper, [])
            return modal({ ...props, close: closeWrapper })
        }
        store.dispatch(appState.setModal(wrappedModal))
    })
}

// TODO: Temporary workaround for autograders 1 & 3, which replace the prompt function.
(window as any).esPrompt = async (message: string) => {
    return (await openModal(Prompt, { message })) ?? ""
}

export function renameSound(sound: SoundEntity) {
    openModal(RenameSound, { sound })
}

export async function renameScript(script: Script) {
    const name = await openModal(RenameScript, { script })
    if (!name) return
    await userProject.renameScript(script, name)
    reporter.renameScript()
}

export function downloadScript(script: Script) {
    openModal(Download, { script })
}

export async function openScriptHistory(script: Script, allowRevert: boolean) {
    if (script.collaborative) {
        collaboration.saveScript(script.id)
    } else if (!script.isShared) {
        // saveScript() saves regular scripts - if called for shared scripts, it will create a local copy (#2663).
        await userProject.saveScript(script.name, script.source_code)
    }
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    openModal(ScriptHistory, { script, allowRevert })
    reporter.openHistory()
}

export function openCodeIndicator(script: Script) {
    openModal(ScriptAnalysis, { script })
}

export function openAdminWindow() {
    openModal(AdminWindow)
}

const Confirm = ({ textKey, textReplacements, okKey, cancelKey, type, close }: { textKey?: string, textReplacements?: object, okKey?: string, cancelKey?: string, type?: string, close: (ok: boolean) => void }) => {
    const { t } = useTranslation()
    return <>
        <div className="modal-header">
            <h3 className="modal-title">{t("confirm")}</h3>
        </div>
        <form onSubmit={e => { e.preventDefault(); close(true) }}>
            {textKey && <div className="modal-body">{textReplacements ? t(textKey, textReplacements) : t(textKey)}</div>}
            <ModalFooter submit={okKey ?? "ok"} cancel={cancelKey} type={type} close={() => close(false)} />
        </form>
    </>
}

function confirm({ textKey, textReplacements, okKey, cancelKey, type }: { textKey?: string, textReplacements?: object, okKey?: string, cancelKey?: string, type?: string }) {
    return openModal(Confirm, { textKey, textReplacements, okKey, cancelKey, type })
}

export async function deleteScript(script: Script) {
    if (await confirm({ textKey: "messages:confirm.deletescript", okKey: "script.delete", type: "danger" })) {
        if (script.shareid === collaboration.scriptID && collaboration.active) {
            collaboration.closeScript(script.shareid)
        }
        await userProject.saveScript(script.name, script.source_code)
        await userProject.deleteScript(script.shareid)
        reporter.deleteScript()

        store.dispatch(tabs.closeDeletedScript(script.shareid))
        store.dispatch(tabs.removeModifiedScript(script.shareid))
    }
}

export async function deleteSharedScript(script: Script) {
    if (script.collaborative) {
        if (await confirm({ textKey: "messages:confirm.leaveCollaboration", textReplacements: { scriptName: script.name }, okKey: "leave", type: "danger" })) {
            if (script.shareid === collaboration.scriptID && collaboration.active) {
                collaboration.closeScript(script.shareid)
            }
            // Apply state change first
            const { [script.shareid]: _, ...sharedScripts } = scripts.selectSharedScripts(store.getState())
            store.dispatch(scripts.setSharedScripts(sharedScripts))
            store.dispatch(tabs.closeDeletedScript(script.shareid))
            store.dispatch(tabs.removeModifiedScript(script.shareid))
            // userProject.getSharedScripts in this routine is not synchronous to websocket:leaveCollaboration
            collaboration.leaveCollaboration(script.shareid, userProject.getUsername(), false)
        }
    } else {
        if (await confirm({ textKey: "messages:confirm.deleteSharedScript", textReplacements: { scriptName: script.name }, okKey: "script.delete", type: "danger" })) {
            await userProject.deleteSharedScript(script.shareid)
            store.dispatch(tabs.closeDeletedScript(script.shareid))
            store.dispatch(tabs.removeModifiedScript(script.shareid))
        }
    }
}

export async function submitToCompetition(script: Script) {
    await userProject.saveScript(script.name, script.source_code)
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    const shareID = await userProject.getLockedSharedScriptId(script.shareid)
    openModal(CompetitionSubmission, { name: script.name, shareID })
}

export async function importScript(script: Script) {
    if (!script) {
        script = tabs.selectActiveTabScript(store.getState())
    }

    const imported = await userProject.importScript(script)
    if (!imported) {
        return
    }

    const openTabs = tabs.selectOpenTabs(store.getState())
    store.dispatch(tabs.closeTab(script.shareid))

    if (openTabs.includes(script.shareid)) {
        store.dispatch(tabs.setActiveTabAndEditor(imported.shareid))
    }
}

export async function deleteSound(sound: SoundEntity) {
    if (await confirm({ textKey: "messages:confirm.deleteSound", textReplacements: { soundName: sound.name }, okKey: "script.delete", type: "danger" })) {
        await userProject.deleteSound(sound.name)
        store.dispatch(sounds.deleteLocalUserSound(sound.name))
        audioLibrary.clearCache()
    }
}

export async function closeAllTabs() {
    if (await confirm({ textKey: "messages:idecontroller.closealltabs", okKey: "tabs.closeAll" })) {
        try {
            await saveAll()
            userNotification.show(i18n.t("messages:user.allscriptscloud"))
            store.dispatch(tabs.closeAllTabs())
        } catch {
            userNotification.show(i18n.t("messages:idecontroller.saveallfailed"), "failure1")
        }
    }
}

export async function shareScript(script: Script) {
    await userProject.saveScript(script.name, script.source_code)
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    openModal(ScriptShare, { script, licenses })
}

export function openUploadWindow() {
    if (userProject.isLoggedIn()) {
        openModal(SoundUploader)
    } else {
        userNotification.show(i18n.t("messages:general.unauthenticated"), "failure1")
    }
}

export function openSharedScript(shareID: string) {
    esconsole("opening a shared script: " + shareID, "main")
    openShare(shareID).then(() => {
        store.dispatch(tabs.setActiveTabAndEditor(shareID))
    })
}

export function openCollaborativeScript(shareID: string) {
    const sharedScripts = scripts.selectSharedScripts(store.getState())
    if (sharedScripts[shareID] && sharedScripts[shareID].collaborative) {
        openSharedScript(shareID)
        store.dispatch(tabs.setActiveTabAndEditor(shareID))
    } else {
        userNotification.show("Error opening the collaborative script! You may no longer the access. Try refreshing the page and checking the shared scripts browser", "failure1")
    }
}

function toggleColorTheme() {
    store.dispatch(appState.setColorTheme(store.getState().app.colorTheme === "light" ? "dark" : "light"))
    reporter.toggleColorTheme()
}

function resumeQuickTour() {
    store.dispatch(bubble.reset())
    store.dispatch(bubble.resume())
}

function reportError() {
    openModal(ErrorForm, { email })
}

function forgotPass() {
    openModal(ForgotPassword)
}

const KeyboardShortcuts = () => {
    const isMac = ESUtils.whichOS() === "MacOS"
    const modifier = isMac ? "Cmd" : "Ctrl"
    const { t } = useTranslation()

    const localize = (key: string) => key.length > 1 ? t(`hardware.${key.toLowerCase()}`) : key

    const shortcuts = {
        run: [modifier, "Enter"],
        save: [modifier, "S"],
        undo: [modifier, "Z"],
        redo: [modifier, "Shift", "Z"],
        comment: [modifier, "/"],
        autocomplete: [isMac ? "Option" : "Ctrl", "Space"],
        zoomHorizontal: <>
            <kbd>{modifier}</kbd>+<kbd>{localize("Wheel")}</kbd> or <kbd>+</kbd>/<kbd>-</kbd>
        </>,
        zoomVertical: [modifier, "Shift", "Wheel"],
    }

    return <Popover>
        <Popover.Button className="text-gray-400 hover:text-gray-300 text-4xl mx-6" title={t("ariaDescriptors:header.shortcuts")} aria-label={t("ariaDescriptors:header.shortcuts")}>
            <i className="icon icon-keyboard" />
        </Popover.Button>
        <Popover.Panel className="absolute z-10 mt-2 bg-gray-100 shadow-lg p-4 -translate-x-1/2 w-max">
            <table>
                {Object.entries(shortcuts).map(([action, keys], index, arr) =>
                    <tr key={action} className={index === arr.length - 1 ? "" : "border-b"}>
                        <td className="p-2 pr-4">{t(`shortcuts.${action}`)}</td>
                        <td>{Array.isArray(keys)
                            ? keys.map(key => <kbd key={key}>{localize(key)}</kbd>).reduce((a: any, b: any): any => [a, " + ", b])
                            : keys}
                        </td>
                    </tr>)}
            </table>
        </Popover.Panel>
    </Popover>
}

const FontSizeMenu = () => {
    const dispatch = useDispatch()
    const fontSize = useSelector(appState.selectFontSize)
    const { t } = useTranslation()

    return <Menu as="div" className="relative inline-block text-left mx-3">
        <Menu.Button className="text-gray-400 hover:text-gray-300 text-4xl" title={t("ariaDescriptors:header.fontSize")} aria-label={t("ariaDescriptors:header.fontSize")}>
            <div className="flex flex-row items-center">
                <div><i className="icon icon-font-size2" /></div>
                <div className="ml-1"><span className="caret" /></div>
            </div>
        </Menu.Button>
        <Menu.Items className="absolute z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {FONT_SIZES.map(size =>
                <Menu.Item key={size}>
                    {({ active }) =>
                        <button className={`${active ? "bg-gray-500 text-white" : "text-gray-900"} inline-grid grid-flow-col justify-items-start items-center px-3 py-2 w-full`}
                            onClick={() => dispatch(appState.setFontSize(size))}
                            style={{ gridTemplateColumns: "18px 1fr" }}
                            aria-selected={fontSize === size}>
                            {fontSize === size && <i className="mr-3 icon icon-checkmark4" />}
                            {fontSize !== size && <span></span>}
                            {size}
                        </button>}
                </Menu.Item>)}
        </Menu.Items>
    </Menu>
}

const MiscActionMenu = () => {
    const { t } = useTranslation()

    const actions = [
        { nameKey: "startQuickTour", action: resumeQuickTour },
        { nameKey: "switchTheme", action: toggleColorTheme },
        { nameKey: "reportError", action: reportError },
    ]

    return <Menu as="div" className="relative inline-block text-left mx-3">
        <Menu.Button className="text-gray-400 hover:text-gray-300 text-4xl" title={t("ariaDescriptors:header.settings")} aria-label={t("ariaDescriptors:header.settings")}>
            <div className="flex flex-row items-center">
                <div><i className="icon icon-cog2" /></div>
                <div className="ml-1"><span className="caret" /></div>
            </div>
        </Menu.Button>
        <Menu.Items className="w-52 absolute z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {actions.map(({ nameKey, action }) =>
                <Menu.Item key={nameKey}>
                    {({ active }) => <button className={`${active ? "bg-gray-500 text-white" : "text-gray-900"} group flex items-center w-full px-4 py-2`} onClick={action}>{t(nameKey)}</button>}
                </Menu.Item>)}
        </Menu.Items>
    </Menu>
}

const NotificationMenu = () => {
    const notifications = useSelector(user.selectNotifications)
    const numUnread = notifications.filter(v => v && (v.unread || v.notification_type === "broadcast")).length

    const [showHistory, setShowHistory] = useState(false)

    return <>
        {showHistory && <NotificationHistory close={() => setShowHistory(false)} />}
        <Popover>
            <Popover.Button className="text-gray-400 hover:text-gray-300 text-4xl mx-3 relative" title="Show/Hide Notifications">
                <i className="icon icon-bell" />
                {numUnread > 0 && <div className="text-2xl text-white bg-red-600 rounded-2xl absolute h-6 w-6 top-0 -right-1 leading-none">{numUnread}</div>}
            </Popover.Button>
            <div className="relative right-1">
                <NotificationPopup />
            </div>
            <Popover.Panel className="absolute z-10 mt-2 bg-gray-100 shadow-lg p-4 -translate-x-3/4">
                {({ close }) => <NotificationList showHistory={setShowHistory} close={close} />}
            </Popover.Panel>
        </Popover>
    </>
}

const LoginMenu = ({ loggedIn, isAdmin, username, password, setUsername, setPassword, login, logout }: {
    loggedIn: boolean, isAdmin: boolean, username: string, password: string,
    setUsername: (u: string) => void, setPassword: (p: string) => void,
    login: (u: string, p: string) => void, logout: () => void,
}) => {
    const { t } = useTranslation()

    const createAccount = async () => {
        const result = await openModal(AccountCreator)
        if (result) {
            setUsername(result.username)
            login(result.username, result.password)
        }
    }

    const editProfile = async () => {
        const newEmail = await openModal(ProfileEditor, { username, email })
        if (newEmail !== undefined) {
            email = newEmail
        }
    }

    return <>
        {!loggedIn &&
        <form className="flex items-center" onSubmit={e => { e.preventDefault(); login(username, password) }}>
            <input type="text" autoComplete="on" name="username" title={t("formfieldPlaceholder.username")} aria-label={t("formfieldPlaceholder.username")} value={username} onChange={e => setUsername(e.target.value)} placeholder={t("formfieldPlaceholder.username")} required />
            <input type="password" autoComplete="current-password" name="password" title={t("formfieldPlaceholder.password")} aria-label={t("formfieldPlaceholder.password")} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("formfieldPlaceholder.password")} required />
            <button type="submit" className="btn btn-xs btn-default" style={{ marginLeft: "6px", padding: "2px 5px 3px" }} title="Login" aria-label="Login"><i className="icon icon-arrow-right" /></button>
        </form>}
        <Menu as="div" className="relative inline-block text-left mx-3">
            <Menu.Button className="text-gray-400 text-4xl">
                {loggedIn
                    ? <div className="btn btn-xs btn-default dropdown-toggle bg-gray-400 px-3 rounded-lg text-2xl">{username}<span className="caret" /></div>
                    : <div className="btn btn-xs btn-default dropdown-toggle" style={{ marginLeft: "6px", height: "23px" }} title="Create or Reset Account" aria-label="Create or Reset Account">{t("createResetAccount")}</div>}
            </Menu.Button>
            <Menu.Items className="w-72 absolute z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {(loggedIn
                    ? [{ name: t("editProfile"), action: editProfile }, ...(isAdmin ? [{ name: "Admin Window", action: openAdminWindow }] : []), { name: t("logout"), action: logout }]
                    : [{ name: t("registerAccount"), action: createAccount }, { name: t("forgotPassword.title"), action: forgotPass }])
                    .map(({ name, action }) =>
                        <Menu.Item key={name}>
                            {({ active }) => <button className={`${active ? "bg-gray-500 text-white" : "text-gray-900"} group flex items-center w-full px-4 py-2`} onClick={action}>{name}</button>}
                        </Menu.Item>)}
            </Menu.Items>
        </Menu>
    </>
}

const Footer = () => {
    const embedMode = useSelector(appState.selectEmbedMode)
    const { t } = useTranslation()

    return <div className={`${embedMode ? "hidden" : "flex"} justify-between bg-black text-white p-3`} style={{ WebkitTransform: "translate3d(0,0,0)" }}>
        <div title={BUILD_NUM}>V{`${BUILD_NUM}`.split("-")[0]}</div>
        <div className="space-x-6">
            <a className="text-white" href="https://www.teachers.earsketch.org" target="_blank" rel="noreferrer">{t("footer.teachers").toLocaleUpperCase()}</a>
            <a className="text-white" href="https://earsketch.gatech.edu/landing/#/contact" target="_blank" rel="noreferrer">{t("footer.help").toLocaleUpperCase()}</a>
        </div>
    </div>
}

function setup() {
    store.dispatch(sounds.getDefaultSounds())
    if (FLAGS.SHOW_FEATURED_SOUNDS) {
        store.dispatch(sounds.setFeaturedSoundVisibility(true))
    }
    if (FLAGS.FEATURED_ARTISTS && FLAGS.FEATURED_ARTISTS.length) {
        store.dispatch(sounds.setFeaturedArtists(FLAGS.FEATURED_ARTISTS))
    }

    esconsole.getURLParameters()

    const isEmbedded = appState.selectEmbedMode(store.getState())

    if (isEmbedded) {
        store.dispatch(appState.setColorTheme("light"))
    } else {
        userProject.loadLocalScripts()
    }

    // If in CAI study mode, switch to active CAI view.
    if (FLAGS.SHOW_CAI) {
        store.dispatch(layout.setEast({ open: true, kind: "CAI" }))
    }
}

// TODO: Move to userState.
let email = ""

// Defunct localStorage key that contained username and password
const USER_STATE_KEY = "userstate"
const userstate = localStorage.getItem(USER_STATE_KEY)
const savedLoginInfo = userstate === null ? undefined : JSON.parse(userstate)

export const App = () => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const showCAI = useSelector(layout.selectEastKind) === "CAI"

    const [username, setUsername] = useState(savedLoginInfo?.username ?? "")
    const [password, setPassword] = useState(savedLoginInfo?.password ?? "")
    const [isAdmin, setIsAdmin] = useState(false)
    const [loggedIn, setLoggedIn] = useState(false)
    const embedMode = useSelector(appState.selectEmbedMode)

    // Note: Used in api_doc links to the curriculum Effects chapter.
    ;(window as any).loadCurriculumChapter = (url: string) => {
        dispatch(layout.setEast({ open: true, kind: "CURRICULUM" }))
        dispatch(curriculum.fetchContent({ url: url }))
    }

    const showAmazonBanner = FLAGS.SHOW_AMAZON_BANNER || location.href.includes("competition")

    const sharedScriptID = ESUtils.getURLParameter("sharing")

    useEffect(() => {
        (async () => {
            document.getElementById("loading-screen")!.style.display = "none"

            // Attempt to load userdata from a previous session.
            if (savedLoginInfo) {
                await login(username, password).then(() => {
                    // Remove defunct localStorage key
                    localStorage.removeItem(USER_STATE_KEY)
                }).catch((error: Error) => {
                    if (window.confirm("We are unable to automatically log you back in to EarSketch. Press OK to reload this page and log in again.")) {
                        localStorage.clear()
                        window.location.reload()
                        esconsole(error, ["error"])
                        reporter.exception("Auto-login failed. Clearing localStorage.")
                    }
                })
            } else {
                const token = userProject.getToken()
                if (token !== null) {
                    await relogin(token)
                }
            }

            setup()

            if (!userProject.isLoggedIn()) {
                const openTabs = tabs.selectOpenTabs(store.getState())
                const allScripts = scripts.selectAllScripts(store.getState())
                for (const scriptID of openTabs) {
                    if (!allScripts[scriptID]) {
                        store.dispatch(tabs.closeAndSwitchTab(scriptID))
                    }
                }
                // Show bubble tutorial when not opening a share link or in a CAI study mode.
                // TODO: Don't show if the user already has scripts?
                if (!sharedScriptID && !FLAGS.SHOW_CAI) {
                    store.dispatch(bubble.resume())
                }
            }
        })()
    }, [])

    useEffect(() => {
        if (theme === "dark") {
            document.body.classList.add("dark")
        } else {
            document.body.classList.remove(("dark"))
        }
    }, [theme])

    const login = async (username: string, password: string) => {
        esconsole("Logging in", ["DEBUG", "MAIN"])
        saveAll()

        let token
        try {
            token = await userProject.getBasicAuth("/users/token", username, password)
        } catch (error) {
            userNotification.show(i18n.t("messages:general.loginfailure"), "failure1", 3.5)
            esconsole(error, ["main", "login"])
            return
        }

        await relogin(token)
    }

    const relogin = async (token: string) => {
        let userInfo
        try {
            userInfo = await userProject.getUserInfo(token)
        } catch {
            userNotification.show("Your credentials have expired. Please login again with your username and password.", "failure1", 3.5)
            dispatch(user.logout())
            return
        }
        const username = userInfo.username

        store.dispatch(user.login({ username, token }))

        store.dispatch(sounds.getUserSounds(username))
        store.dispatch(sounds.getFavorites(token))

        // Always override with the returned username in case the letter cases mismatch.
        setUsername(username)
        setIsAdmin(userInfo.isAdmin)
        email = userInfo.email
        userNotification.user.isAdmin = userInfo.isAdmin

        // Retrieve the user scripts.
        await userProject.login(username)
        esconsole("Logged in as " + username, ["DEBUG", "MAIN"])

        if (!loggedIn) {
            setLoggedIn(true)
            userNotification.show(i18n.t("messages:general.loginsuccess"), "history", 0.5)
            const activeTabID = tabs.selectActiveTabID(store.getState())
            activeTabID && store.dispatch(tabs.setActiveTabAndEditor(activeTabID))
        }
    }

    const logout = async () => {
        let keepUnsavedTabs = false
        // save all unsaved open scripts
        try {
            const promise = saveAll()
            await promise
            if (promise) {
                userNotification.show(i18n.t("messages:user.allscriptscloud"))
            }
        } catch (error) {
            if (await confirm({ textKey: "messages:idecontroller.saveallfailed", cancelKey: "discardChanges", okKey: "keepUnsavedTabs" })) {
                keepUnsavedTabs = true
            }
        }

        leaveCollaborationSession()

        userProject.clearUser()
        userNotification.clearHistory()
        reporter.logout()

        if (keepUnsavedTabs) {
            // Close unmodified tabs/scripts.
            const state = store.getState()
            const modified = tabs.selectModifiedScripts(state)
            for (const tab of tabs.selectOpenTabs(state)) {
                if (!modified.includes(tab)) {
                    dispatch(tabs.closeAndSwitchTab(tab))
                }
            }
            const regularScripts = scripts.selectRegularScripts(state)
            const modifiedScripts = Object.entries(regularScripts).filter(([id, _]) => modified.includes(id))
            dispatch(scripts.setRegularScripts(ESUtils.fromEntries(modifiedScripts)))
        } else {
            dispatch(tabs.resetTabs())
            dispatch(tabs.resetModifiedScripts())
            dispatch(scripts.resetRegularScripts())
        }

        dispatch(scripts.resetSharedScripts())
        dispatch(scripts.resetReadOnlyScripts())

        dispatch(user.logout())
        dispatch(sounds.resetUserSounds())
        dispatch(sounds.resetFavorites())
        dispatch(sounds.resetAllFilters())

        // Clear out all the values set at login.
        setUsername("")
        setPassword("")
        setLoggedIn(false)

        // User data
        email = ""
        setIsAdmin(false)
    }

    const toggleCAIWindow = () => {
        if (!showCAI) {
            dispatch(layout.setEast({ open: true, kind: "CAI" }))
            dispatch(cai.closeCurriculum())
            document.getElementById("caiButton")!.classList.remove("flashNavButton")
            dispatch(cai.autoScrollCAI())
        } else {
            dispatch(layout.setEast({ kind: "CURRICULUM" }))
            dispatch(cai.curriculumPage([curriculum.selectCurrentLocation(store.getState()), curriculum.selectPageTitle(store.getState())]))
        }
    }

    return <div>
        {/* dynamically set the color theme */}
        <link rel="stylesheet" type="text/css" href={`css/earsketch/theme_${theme}.css`} />

        {/* highlight js style */}
        <link rel="stylesheet" type="text/css" href={`scripts/lib/highlightjs/styles/${theme === "dark" ? "monokai-sublime" : "vs"}.css`} />

        <div className="flex flex-col justify-start h-screen max-h-screen">
            {!embedMode && <div id="top-header-nav" className="shrink-0">
                <div id="top-header-nav-left" style={{ WebkitTransform: "translate3d(0,0,0)" }}>
                    <div id="app-title-container" className="pull-left">
                        <img id="app-logo" src="img/ES_logo_extract.svg" alt="EarSketch Logo" />
                        <a href="http://earsketch.gatech.edu/landing" target="_blank" id="app-title" rel="noreferrer">EarSketch</a>
                    </div>

                    <div id="top-header-nav-links" className="pull-left" style={{ maxWidth: "500px" }}>
                        <div>
                            {showAmazonBanner && <a href="https://www.amazonfutureengineer.com/earsketch" target="_blank" className="text-black normal-case dark:text-white" style={{ color: "yellow", textShadow: "1px 1px #FF0000", lineHeight: "21px", fontSize: "18px" }} rel="noreferrer">
                                <div><img id="app-logo" src="img/afe_logo.png" alt="Amazon Logo" style={{ marginLeft: "17px", marginRight: "0px", height: "13px" }} /></div>
                                Celebrity Remix
                            </a>}
                        </div>
                    </div>
                    <div className="clear:both"></div>
                </div>

                {/* temporary place for the app-generated notifications */}
                <NotificationBar />

                {/* top-right icons */}
                <div id="top-header-nav-form">
                    {/* CAI-window toggle */}
                    {FLAGS.SHOW_CAI && <button className="top-header-nav-button btn" style={{ color: showCAI ? "white" : "#939393" }} onClick={toggleCAIWindow} title="CAI">
                        <i id="caiButton" className="icon icon-bubbles"></i>
                    </button>}

                    {FLAGS.SHOW_LOCALE_SWITCHER && <LocaleSelector />}
                    <KeyboardShortcuts />
                    <FontSizeMenu />
                    <MiscActionMenu />
                    <NotificationMenu />
                    <LoginMenu {...{ loggedIn, isAdmin, username, password, setUsername, setPassword, login, logout }} />
                </div>
            </div>}
            <IDE />
            <Footer />
        </div>
        <Bubble />
        <ScriptDropdownMenu />
        <ModalContainer />
    </div>
}

export const ModalContainer = () => {
    const dispatch = useDispatch()
    const Modal = useSelector(appState.selectModal)!

    useEffect(() => {
        setClosing(false)
    }, [Modal])

    const [closing, setClosing] = useState(false)

    const close = () => {
        setClosing(true)
        setTimeout(() => {
            if (Modal === appState.selectModal(store.getState())) {
                dispatch(appState.setModal(null))
                setClosing(false)
            }
        }, 300)
    }

    return <Transition appear show={Modal !== null && !closing} as={Fragment}>
        <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={close}
        >
            <div className="min-h-screen px-4 text-center">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-40" />
                </Transition.Child>

                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                    <div className="modal-content inline-block w-full max-w-6xl mt-16 overflow-hidden text-left transition-all transform bg-white shadow-xl rounded-xl">
                        {Modal && <Modal close={close} />}
                    </div>
                </Transition.Child>
            </div>
        </Dialog>
    </Transition>
}

function saveAll() {
    const promises = []
    const modifiedTabs = tabs.selectModifiedScripts(store.getState())
    const scriptMap = scripts.selectActiveScripts(store.getState())

    for (const id of modifiedTabs) {
        const script = scriptMap[id]
        promises.push(userProject.saveScript(script.name, script.source_code))
    }

    if (promises.length) {
        return Promise.all(promises)
    }
    return promises.length ? Promise.all(promises) : null
}

function leaveCollaborationSession() {
    const activeTabID = tabs.selectActiveTabID(store.getState())
    if (activeTabID) {
        const allScriptEntities = scripts.selectAllScripts(store.getState())
        if (allScriptEntities[activeTabID].collaborative) {
            collaboration.leaveSession(activeTabID)
        }
    }
}

// websocket gets closed before onunload in FF
window.onbeforeunload = () => {
    if (userProject.isLoggedIn()) {
        leaveCollaborationSession()

        // Show page-close warning if saving.
        // NOTE: For now, the cross-browser way to show the warning if to return a string in beforeunload. (Someday, the right way will be to call preventDefault.)
        // See https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event.
        const promise = saveAll()
        if (promise) {
            promise.then(() => userNotification.show(i18n.t("messages:user.allscriptscloud"), "success"))
            return ""
        }
    }
    persistor.flush()
}
