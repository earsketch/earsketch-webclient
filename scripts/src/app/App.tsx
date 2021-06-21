import i18n from "i18next"
import { Menu } from "@headlessui/react"
import React, { useEffect, useState } from "react"
import { Provider, useDispatch, useSelector } from "react-redux"

import * as appState from "../app/appState"
import * as audioLibrary from "./audiolibrary"
import { Bubble } from "../bubble/Bubble"
import * as collaboration from "./collaboration"
import { ScriptEntity, SoundEntity } from "common"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as helpers from "../helpers"
import { IDE, openShare } from "../ide/IDE"
import { LocaleSelector } from "../top/LocaleSelector"
import { NotificationBar, NotificationHistory, NotificationList, NotificationPopup } from "../user/Notifications"
import reporter from "./reporter"
import * as scripts from "../browser/scriptsState"
import { ScriptDropdownMenu } from "../browser/ScriptsMenus"
import * as sounds from "../browser/soundsState"
import store from "../reducers"
import * as recommenderState from "../browser/recommenderState"
import * as bubble from "../bubble/bubbleState"
import * as tabs from "../ide/tabState"
import * as curriculum from "../browser/curriculumState"
import * as layout from "../layout/layoutState"
import * as Layout from "../layout/Layout"
import * as cai from "../cai/caiState"
import * as recommender from "./recommender"
import * as user from "../user/userState"
import * as userNotification from "../user/notification"
import * as userProject from "./userProject"

const FONT_SIZES = [10, 12, 14, 18, 24, 36]

export function changePassword() {
    helpers.getNgService("$uibModal").open({ component: "changepasswordController" })
}

export function renameSound(sound: SoundEntity) {
    helpers.getNgService("$uibModal").open({
        component: "renameSoundController",
        size: "sm",
        resolve: { sound() { return sound } }
    })
}

export function renameScript(script: ScriptEntity) {
    // userProject, etc. will try to mutate the immutable redux script  state.
    const scriptCopy = Object.assign({}, script)

    const modal = helpers.getNgService("$uibModal").open({
        component: "renameController",
        size: 100,
        resolve: { script() { return scriptCopy } }
    })

    modal.result.then(async (newScript: ScriptEntity | null) => {
        if (!newScript) return
        await userProject.renameScript(scriptCopy.shareid, newScript.name)
        store.dispatch(scripts.syncToNgUserProject())
        reporter.renameScript()
    })
}

export function downloadScript(script: ScriptEntity) {
    helpers.getNgService("$uibModal").open({
        component: "downloadController",
        resolve: {
            script() { return script; },
            quality() { return 0; }
        }
    })
}

export async function openScriptHistory(script: ScriptEntity, allowRevert: boolean) {
    await userProject.saveScript(script.name, script.source_code)
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    helpers.getNgService("$uibModal").open({
        component: "scriptVersionController",
        size: "lg",
        resolve: {
            script() { return script; },
            allowRevert: allowRevert
        }
    })
    reporter.openHistory()
}

export function openCodeIndicator(script: ScriptEntity) {
    helpers.getNgService("$uibModal").open({
        component: "analyzeScriptController",
        size: 100,
        resolve: {
            script() { return script; }
        }
    })
}

export function deleteScript(script: ScriptEntity) {
    (helpers.getNgService("$confirm") as any)({
        text: 'Deleted scripts disappear from Scripts list and can be restored from the list of "deleted scripts".',
        ok: "Delete"
    }).then(async () => {
        if (script.shareid === collaboration.scriptID && collaboration.active) {
            collaboration.closeScript(script.shareid)
        }
        await userProject.saveScript(script.name, script.source_code)
        await userProject.deleteScript(script.shareid)
        reporter.deleteScript()

        store.dispatch(scripts.syncToNgUserProject())
        store.dispatch(tabs.closeDeletedScript(script.shareid))
        store.dispatch(tabs.removeModifiedScript(script.shareid))
    })
}

export function deleteSharedScript(script: ScriptEntity) {
    if (script.collaborative) {
        (helpers.getNgService("$confirm") as any)({text: 'Do you want to leave the collaboration on "" + script.name + ""?", ok: "Leave'}).then(() => {
            if (script.shareid === collaboration.scriptID && collaboration.active) {
                collaboration.closeScript(script.shareid)
                userProject.closeSharedScript(script.shareid)
            }
            // Apply state change first
            delete userProject.sharedScripts[script.shareid]
            store.dispatch(scripts.syncToNgUserProject())
            store.dispatch(tabs.closeDeletedScript(script.shareid))
            store.dispatch(tabs.removeModifiedScript(script.shareid))
            // userProject.getSharedScripts in this routine is not synchronous to websocket:leaveCollaboration
            collaboration.leaveCollaboration(script.shareid, userProject.getUsername(), false)
        })
    } else {
        (helpers.getNgService("$confirm") as any)({text: "Are you sure you want to delete the shared script '"+script.name+"'?", ok: "Delete"}).then(() => {
            userProject.deleteSharedScript(script.shareid).then(() => {
                store.dispatch(scripts.syncToNgUserProject())
                store.dispatch(tabs.closeDeletedScript(script.shareid))
                store.dispatch(tabs.removeModifiedScript(script.shareid))
            })
        })
    }
}

export async function submitToCompetition(script: ScriptEntity) {
    await userProject.saveScript(script.name, script.source_code)
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    const shareID = await userProject.getLockedSharedScriptId(script.shareid)
    helpers.getNgService("$uibModal").open({
        component: "submitCompetitionController",
        size: "lg",
        resolve: {
            name() { return script.name; },
            shareID() { return shareID; },
        }
    })
}

export async function importScript(script: ScriptEntity) {
    if (!script) {
        script = tabs.selectActiveTabScript(store.getState())
    }

    const imported = await userProject.importScript(Object.assign({},script))
    await userProject.refreshCodeBrowser()
    store.dispatch(scripts.syncToNgUserProject())

    const openTabs = tabs.selectOpenTabs(store.getState())
    store.dispatch(tabs.closeTab(script.shareid))

    if (openTabs.includes(script.shareid)) {
        store.dispatch(tabs.setActiveTabAndEditor(imported.shareid))
        userProject.openScript(imported.shareid)
    }
}

export function deleteSound(sound: SoundEntity) {
    (helpers.getNgService("$confirm") as any)({text: "Do you really want to delete sound " + sound.file_key + "?", ok: "Delete"}).then(() => {
        userProject.deleteAudio(sound.file_key).then(() => {
            store.dispatch(sounds.deleteLocalUserSound(sound.file_key))
            audioLibrary.clearAudioTagCache()
        })
    })
}

export function closeAllTabs() {
    (helpers.getNgService("$confirm") as any)({text: i18n.t("messages:idecontroller.closealltabs"), ok: "Close All"}).then(() => {
        userProject.saveAll().then(() => {
            userNotification.show(i18n.t("messages:user.allscriptscloud"))
            store.dispatch(tabs.closeAllTabs())
        }).catch(() => userNotification.show(i18n.t("messages:idecontroller.saveallfailed"), "failure1"))
    })
}

const licenses = {} as { [key: string]: any }

userProject.getLicenses().then(ls => {
    for (const license of Object.values(ls)) {
        licenses[(license as any).id] = license
    }
})

export async function shareScript(script: ScriptEntity) {
    await userProject.saveScript(script.name, script.source_code)
    store.dispatch(tabs.removeModifiedScript(script.shareid))
    helpers.getNgService("$uibModal").open({
        component: "shareScriptController",
        size: "lg",
        resolve: {
            script() { return script },
            quality() { return 0 },
            licenses() { return licenses }
        }
    })
}

export function openUploadWindow() {
    if (userProject.isLoggedIn()) {
        helpers.getNgService("$uibModal").open({ component: "uploadSoundController" })
    } else {
        userNotification.show(i18n.t("messages:general.unauthenticated"), "failure1")
    }
}

export function reloadRecommendations() {
    const activeTabID = tabs.selectActiveTabID(store.getState())!
    // Get the modified / unsaved script.
    let script = null
    if (activeTabID in userProject.scripts) {
        script = userProject.scripts[activeTabID]
    } else if (activeTabID in userProject.sharedScripts) {
        script = userProject.sharedScripts[activeTabID]
    }
    if (!script) return
    let input = recommender.addRecInput([], script)
    let res = [] as any[]
    if (input.length === 0) {
        const filteredScripts = Object.values(scripts.selectFilteredActiveScriptEntities(store.getState()))
        if (filteredScripts.length) {
            const lim = Math.min(5, filteredScripts.length)
            for (let i = 0; i < lim; i++) {
                input = recommender.addRecInput(input, filteredScripts[i])
            }
        }
    }
    [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(v => {
        res = recommender.recommend(res, input, ...v)
    })
    store.dispatch(recommenderState.setRecommendations(res))
}

function toggleColorTheme() {
    store.dispatch(appState.toggleColorTheme())
    reporter.toggleColorTheme()
}

function resumeQuickTour() {
    store.dispatch(bubble.reset())
    store.dispatch(bubble.resume())
}

function reportError() {
    helpers.getNgService("$uibModal").open({
        component: "errorController",
        resolve: { email() { return email } }
    })
}

function openAdminWindow() {
    helpers.getNgService("$uibModal").open({
        templateUrl: "templates/admin-window.html",
        controller: "adminwindowController",
        scope: {}
    })
}

function forgotPass() {
    helpers.getNgService("$uibModal").open({ component: "forgotpasswordController" })
}

const Footer = () => {
    const embedMode = useSelector(appState.selectEmbedMode)

    return <div className={`${embedMode ? "hidden" : "flex"} justify-between bg-black text-white p-3`}>
        <div>V{BUILD_NUM}</div>
        <div className="space-x-6">
            <a className="text-white" href="https://www.teachers.earsketch.org" target="_blank">TEACHERS</a>
            <a className="text-white" href="https://earsketch.gatech.edu/landing/#/contact" target="_blank">HELP / CONTACT</a>
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

    const isEmbedded = ESUtils.getURLParameter("embedded") === "true"
    const hideDAW = isEmbedded && ESUtils.getURLParameter("hideDaw")
    const hideEditor = isEmbedded && ESUtils.getURLParameter("hideCode")

    if (isEmbedded) {
        store.dispatch(appState.setColorTheme("light"))
        store.dispatch(appState.setEmbedMode(true))
        Layout.destroy()
        layout.setMinSize(0)

        if (hideEditor) {
            layout.setGutterSize(0)
        }
        Layout.initialize()
        store.dispatch(layout.collapseWest())
        store.dispatch(layout.collapseEast())
        store.dispatch(layout.collapseSouth())

        if (hideEditor) {
            // Note: hideDAW-only currently does not fit the layout height to the DAW player height as the below API only supports ratios.
            store.dispatch(layout.setNorthFromRatio([100,0,0]))
        } else {
            store.dispatch(layout.setNorthFromRatio([25,75,0]))
        }
    } else {
        userProject.loadLocalScripts()
        store.dispatch(scripts.syncToNgUserProject())
    }

    if (hideDAW) {
        store.dispatch(appState.setHideDAW(true))
    }

    if (hideEditor) {
        store.dispatch(appState.setHideEditor(true))
    }

    try {
        const shareID = ESUtils.getURLParameter("edit")
        if (shareID) {
            esconsole("opening a shared script in edit mode", ["main", "url"])
            userProject.openSharedScriptForEdit(shareID)
        }
    } catch (error) {
        esconsole(error, ["main", "url"])
    }

    // If in CAI study mode, switch to active CAI view.
    if (FLAGS.SHOW_CAI) {
        store.dispatch(layout.setEast({ open: true }))
        Layout.resetHorizontalSplits()
    }
}

// TODO: Move to userState, and maybe get rid of firstname/lastname.
let firstname = ""
let lastname = ""
let email = ""

export const App = () => {
    const dispatch = useDispatch()
    const fontSize = useSelector(appState.selectFontSize)
    const theme = useSelector(appState.selectColorTheme)
    const showCAI = useSelector(layout.selectEastKind) === "CAI"

    const notifications = useSelector(user.selectNotifications)
    const numUnread = notifications.filter(v => v && (v.unread || v.notification_type === "broadcast")).length

    const savedLoginInfo = userProject.loadUser()
    const [username, setUsername] = useState(savedLoginInfo?.username ?? "")
    const [password, setPassword] = useState(savedLoginInfo?.password ?? "")
    const [role, setRole] = useState("student")
    const [loggedIn, setLoggedIn] = useState(false)
    const embedMode = useSelector(appState.selectEmbedMode)

    // Note: Used in api_doc links to the curriculum Effects chapter.
    ;(window as any).loadCurriculumChapter = (location: string) => {
        dispatch(layout.openEast("CURRICULUM"))
        dispatch(curriculum.fetchContent({ location: location.split("-") }))
    }

    const [showNotifications, setShowNotifications] = useState(false)
    const [showNotificationHistory, setShowNotificationHistory] = useState(false)

    const showAmazonBanner = FLAGS.SHOW_AMAZON_BANNER || location.href.includes("competition")

    const MISC_ACTIONS = [
        { name: "Start Quick Tour", action: resumeQuickTour },
        { name: "Switch Theme", action: toggleColorTheme },
        { name: "Report Error", action: reportError },
    ]

    useEffect(() => {
        // Attempt to load userdata from a previous session.
        if (userProject.isLoggedIn()) {
            login().catch((error: Error) => {
                if (window.confirm("We are unable to automatically log you back in to EarSketch. Press OK to reload this page and log in again.")) {
                    localStorage.clear()
                    window.location.reload()
                    esconsole(error, ["error"])
                    reporter.exception("Auto-login failed. Clearing localStorage.")
                }
            })
        } else {
            store.dispatch(scripts.syncToNgUserProject())
            const openTabs = tabs.selectOpenTabs(store.getState())
            const allScripts = scripts.selectAllScriptEntities(store.getState())
            openTabs.forEach(scriptID => {
                if (!allScripts.hasOwnProperty(scriptID)) {
                    store.dispatch(tabs.closeAndSwitchTab(scriptID))
                }
            })
            // Show bubble tutorial when not opening a share link or in a CAI study mode.
            if (!ESUtils.getURLParameter("sharing") && !FLAGS.SHOW_CAI) {
                store.dispatch(bubble.resume())
            }
        }

        setup()
    }, [])

    const login = async () => {
        esconsole("Logging in", ["DEBUG","MAIN"])
        //save all unsaved open scripts (don't need no promises)
        userProject.saveAll()

        let userInfo
        try {
            userInfo = await userProject.getUserInfo(username, password)
        } catch (error) {
            userNotification.show(i18n.t("messages:general.loginfailure"), "failure1",  3.5)
            esconsole(error, ["main", "login"])
            return
        }

        store.dispatch(user.login({ username, password }))

        store.dispatch(sounds.getUserSounds(username))
        store.dispatch(sounds.getFavorites({ username, password }))

        // Always override with the returned username in case the letter cases mismatch.
        setUsername(userInfo.username)

        // get user role (can verify the admin / teacher role here?)
        if (userInfo.role) {
            setRole(userInfo.role)

            if (userInfo.role === "teacher") {
                if (userInfo.firstname === "" || userInfo.lastname === "" || userInfo.email === "") {
                    userNotification.show(i18n.t("messages:user.teachersLink"), "editProfile")
                }
            }
        } else {
            setRole("student")
        }

        firstname = userInfo.firstname
        lastname = userInfo.lastname
        email = userInfo.email

        userNotification.user.role = userInfo.role

        // Retrieve the user scripts.
        await userProject.login(username, password)
        esconsole("Logged in as " + username, ["DEBUG","MAIN"])
        store.dispatch(scripts.syncToNgUserProject())

        if (!loggedIn) {
            setLoggedIn(true)
            userNotification.show(i18n.t("messages:general.loginsuccess"), "history", 0.5)
            const activeTabID = tabs.selectActiveTabID(store.getState())
            activeTabID && store.dispatch(tabs.setActiveTabAndEditor(activeTabID))
        }
    }

    const logout = async () => {
        dispatch(user.logout())
        dispatch(sounds.resetUserSounds())
        dispatch(sounds.resetFavorites())
        dispatch(sounds.resetAllFilters())

        // save all unsaved open scripts
        try {
            await userProject.saveAll()
            if (userProject.openScripts.length > 0) {
                userNotification.show(i18n.t("messages:user.allscriptscloud"))
            }

            const activeTabID = tabs.selectActiveTabID(store.getState())
            if (activeTabID) {
                const allScriptEntities = scripts.selectAllScriptEntities(store.getState())
                if (allScriptEntities[activeTabID].collaborative) {
                    collaboration.leaveSession(activeTabID)
                }
            }

            userProject.clearUser()
            userNotification.clearHistory()
            reporter.logout()

            dispatch(scripts.syncToNgUserProject())
            dispatch(scripts.resetReadOnlyScripts())
            dispatch(tabs.resetTabs())
            dispatch(tabs.resetModifiedScripts())
        } catch (error) {
            await (helpers.getNgService("$confirm") as any)({ text: i18n.t("messages:idecontroller.saveallfailed"), cancel: "Keep unsaved tabs open", ok: "Ignore" })
            userProject.clearUser()
        }

        // Clear out all the values set at login.
        setUsername("")
        setPassword("")
        setLoggedIn(false)

        // User data
        firstname = ""
        lastname = ""
        email = ""
        setRole("student")
    }

    const createAccount = async () => {
        const result = await helpers.getNgService("$uibModal").open({ component: "accountController" }).result
        if (result) {
            setUsername(result.username)
            setPassword(result.password)
            login()
        }
    }

    const editProfile = async () => {
        setShowNotifications(false)
        const result = await helpers.getNgService("$uibModal").open({
            component: "editProfileController",
            resolve: {
                username() { return username },
                password() { return password },
                email() { return email },
                role() { return role },
                firstName() { return firstname },
                lastName() { return lastname },
            }
        }).result
        if (result !== undefined) {
            firstname = result.firstName
            lastname = result.lastName
            email = result.email
        }
    }

    const toggleCAIWindow = () => {
        if (!showCAI) {
            dispatch(layout.openEast("CAI"))
            document.getElementById("caiButton")!.classList.remove("flashNavButton")
            dispatch(cai.autoScrollCAI())
        } else {
            dispatch(layout.setEast({ kind: "CURRICULUM" }))
        }
    }

    const toggleNotificationHistory = (bool: boolean) => {
        setShowNotificationHistory(bool)
        if (bool) {
            setShowNotifications(false)
        }
    }

    const openSharedScript = (shareid: string) => {
        esconsole("opening a shared script: " + shareid, "main")
        openShare(shareid).then(() => store.dispatch(scripts.syncToNgUserProject()))
        setShowNotifications(false)
        setShowNotificationHistory(false)
    }

    const openCollaborativeScript = (shareID: string) => {
        if (userProject.sharedScripts[shareID] && userProject.sharedScripts[shareID].collaborative) {
            openSharedScript(shareID)
            store.dispatch(tabs.setActiveTabAndEditor(shareID))
        } else {
            setShowNotifications(false)
            userNotification.show("Error opening the collaborative script! You may no longer the access. Try refreshing the page and checking the shared scripts browser", "failure1")
        }
    }

    return <>
        {/* dynamically set the color theme */}
        <link rel="stylesheet" type="text/css" href={`css/earsketch/theme_${theme}.css`} />
        
        {/* highlight js style */}
        <link rel="stylesheet" type="text/css" href={`scripts/lib/highlightjs/styles/${theme === "dark" ? "monokai-sublime" : "vs"}.css`} />

        {showNotificationHistory && <NotificationHistory {...{ openSharedScript, toggleNotificationHistory }} />}
        
        <div className="flex flex-col justify-start h-screen max-h-screen">
            {!embedMode && <div id="top-header-nav" className="flex-shrink-0">
                <div id="top-header-nav-left">
                    <div id="app-title-container" className="pull-left">
                        <img id="app-logo" src="img/ES_logo_extract.svg" alt="EarSketch Logo" />
                        <a href="http://earsketch.gatech.edu/landing" target="_blank" id="app-title">EarSketch</a>
                    </div>
        
                    <div id="top-header-nav-links" className="pull-left" style={{ maxWidth: "500px" }}>
                        <div>
                            {showAmazonBanner && <a href="https://www.amazonfutureengineer.com/earsketch" target="_blank" id="app-title" style={{ color: "yellow", textShadow: "1px 1px #FF0000", lineHeight: "21px" }}>
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
                    {FLAGS.SHOW_CAI && <button className="top-header-nav-button btn" style={{ color: showCAI ? "white" : "#939393"}} onClick={toggleCAIWindow} title="CAI">
                        <i id="caiButton" className="icon icon-bubbles"></i>
                    </button>}
        
                    {/* TODO: Bring back keyboard shortcuts. */}
                    {/*<div>
                        <button id="keyboard-shortcuts" type="button" className="top-header-nav-button btn btn-xs btn-clear" ng-click="toggleShortcutHelper()" ng-className="showKeyShortcuts ? "grow-in-size":""" title="Show/Hide Keyboard Shortcuts">
                            <i className="icon icon-keyboard"></i>
                                <span className="sr-only">Keyboard Shortcuts</span>
                        </button>
                    </div>*/}
                    {FLAGS.SHOW_LOCALE_SWITCHER && <LocaleSelector />}
                    
                    {/* Font Size */}
                    <Menu as="div" className="relative inline-block text-left mx-3">
                        <Menu.Button className="text-gray-400 text-4xl">
                            <div className="flex flex-row items-center">
                                <div><i className="icon icon-font-size2" /></div>
                                <div className="ml-1"><span className="caret" /></div>
                            </div>
                        </Menu.Button>
                        <Menu.Items className="absolute z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            {FONT_SIZES.map(size =>
                            <Menu.Item key={size}>
                                {({ active }) =>
                                <button className={`${active ? "bg-gray-500 text-white" : "text-gray-900"} group flex items-center w-full px-4 py-2`}
                                        onClick={() => dispatch(appState.setFontSize(size))}>
                                    {size} {fontSize === size && <i className="ml-3 icon icon-checkmark4" />}
                                </button>}
                            </Menu.Item>)}
                        </Menu.Items>
                    </Menu>
        
                    {/* Misc. actions */}
                    <Menu as="div" className="relative inline-block text-left mx-3">
                        <Menu.Button className="text-gray-400 text-4xl">
                            <div className="flex flex-row items-center">
                                <div><i className="icon icon-cog2" /></div>
                                <div className="ml-1"><span className="caret" /></div>
                            </div>
                        </Menu.Button>
                        <Menu.Items className="w-52 absolute z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            {MISC_ACTIONS.map(({ name, action }) =>
                            <Menu.Item key={name}>
                                {({ active }) => <button className={`${active ? "bg-gray-500 text-white" : "text-gray-900"} group flex items-center w-full px-4 py-2`} onClick={action}>{name}</button>}
                            </Menu.Item>)}
                        </Menu.Items>
                    </Menu>
        
                    {/* notification (bell) button */}
                    <div className="user-notification relative">
                        <div id="bell-icon-container" className=".btn text-gray-400 text-4xl" onClick={() => setShowNotifications(!showNotifications)}>
                            <i className="icon icon-bell" />
                            {numUnread > 0 && <div id="badge" className="text-2xl">{numUnread}</div>}
                        </div>
                        <NotificationPopup />
                        {showNotifications && <div className="popover-content absolute z-50 right-0 mt-2">
                            <NotificationList {...{ editProfile, openSharedScript, openCollaborativeScript, toggleNotificationHistory }} />
                        </div>}
                    </div>
        
                    {/* user login menu */}
                    {!loggedIn &&
                    <form className="flex items-center" onSubmit={e => { e.preventDefault(); login() }}>
                        <input type="text" autoComplete="on" name="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required />
                        <input type="password" autoComplete="current-password" name="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                        <button type="submit" className="btn btn-xs btn-default" style={{ marginLeft: "6px", padding: "2px 5px 3px" }}><i className="icon icon-arrow-right" /></button>
                    </form>}
                    <Menu as="div" className="relative inline-block text-left mx-3">
                        <Menu.Button className="text-gray-400 text-4xl">
                            {loggedIn
                            ? <div className="btn btn-xs btn-default dropdown-toggle bg-gray-400 px-3 rounded-lg text-2xl"><em style={{ color: "#0078e0" }}>{username}</em>&nbsp;<span className="caret" /></div>
                            : <div className="btn btn-xs btn-default dropdown-toggle" style={{ marginLeft: "6px", height: "23px" }}>Create / Reset Account</div>}
                        </Menu.Button>
                        <Menu.Items className="w-72 absolute z-50 right-0 mt-2 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            {(loggedIn
                            ? [{ name: "Edit Profile", action: editProfile }, ...(role === "admin" ? [{ name: "Admin Window", action: openAdminWindow }] : []), { name: "Logout", action: logout }]
                            : [{ name: "Register a New Account", action: createAccount }, { name: "Forgot Your Password?", action: forgotPass }])
                            .map(({ name, action }) =>
                            <Menu.Item key={name}>
                                {({ active }) => <button className={`${active ? "bg-gray-500 text-white" : "text-gray-900"} group flex items-center w-full px-4 py-2`} onClick={action}>{name}</button>}
                            </Menu.Item>)}
                        </Menu.Items>
                    </Menu>
                </div>
            </div>}
            <IDE />
            <Footer />
        </div>
        <Bubble />
        <ScriptDropdownMenu />
    </>
}

// websocket gets closed before onunload in FF
window.onbeforeunload = () => {
    if (userProject.isLoggedIn()) {
        let saving = false

        const openTabs = tabs.selectOpenTabs(store.getState())
        const modifiedTabs = tabs.selectModifiedScripts(store.getState())
        const sharedScripts = scripts.selectSharedScriptIDs(store.getState())
        const scriptMap = scripts.selectActiveScriptEntities(store.getState())
        for (const id of openTabs) {
            if (sharedScripts.includes(id)) {
                collaboration.leaveSession(id)
            }
        }

        for (const id of modifiedTabs) {
            saving = true
            const script = scriptMap[id]
            userProject.saveScript(script.name, script.source_code).then(() => {
                store.dispatch(scripts.syncToNgUserProject())
                userNotification.show(i18n.t('messages:user.scriptcloud'), "success")
            })
        }

        // userNotification.markAllAsRead()
        // Show page-close warning if saving.
        // NOTE: For now, the cross-browser way to show the warning if to return a string in beforeunload. (Someday, the right will be to call preventDefault.)
        // See https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event.
        if (saving) {
            return ""
        }
    } else {
        if (localStorage.getItem(userProject.LS_SCRIPTS_KEY) !== null) {
            localStorage.setItem(userProject.LS_SCRIPTS_KEY, JSON.stringify(scripts))
        }
    }
}