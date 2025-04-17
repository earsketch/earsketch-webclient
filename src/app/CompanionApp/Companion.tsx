import React, { useState, useRef, useEffect, ChangeEvent } from "react"

import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../../hooks"
import { useTranslation } from "react-i18next"

import * as appState from "../appState"
import * as layout from "../../ide/layoutState"
import * as caiState from "../../cai/caiState"
import * as caiThunks from "../../cai/caiThunks"
import { SoundBrowser } from "./Sounds"
import { ScriptBrowser } from "../../browser/Scripts"
import { APIBrowser } from "./API"
import type { RootState } from "../../reducers"
import { Collapsed } from "../../browser/Utils"
import { BrowserTabType } from "../../browser/BrowserTab"
import * as tabState from "../../ide/tabState"
import { addUIClick } from "../../cai/dialogue/student"
import * as soundsThunks from "../../browser/soundsThunks"
import store, { persistor } from "../../reducers"

import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../../hooks"

import store from "../reducers";
import reporter from "./reporter";

import { ListOnScrollProps, VariableSizeList as List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import classNames from "classnames"


import TopHeader from "./TopHeader" 
import { Dialog, Menu, Popover, Transition } from "@headlessui/react"
import { AccountCreator } from "../AccountCreator"
import { AdminWindow } from "../AdminWindow"
import { openModal } from "../modal"
import { ProfileEditor } from "../ProfileEditor"
import { ForgotPassword } from "../ForgotPassword"

import { reloadRecommendations } from "../reloadRecommender"
import * as editor from "../../ide/Editor"
import * as user from "../../user/userState"
import * as tabs from "../../ide/tabState"

import * as request from "../../request"


import type { SoundEntity } from "common"

//import { SearchBar } from "../../browser/Utils"
import { createAsyncThunk } from "@reduxjs/toolkit"

import context from "../../audio/context"
import * as audioLibrary from "../audiolibrary"
import { SoundEntity } from "common"
import { fillDict } from "../recommender"
import { ThunkAPI } from "../../reducers"
import { get, postAuth } from "../../request"
import * as soundsState from "../../browser/soundsState"
import { beatStringToArray } from "../../esutils"
import _ from "lodash"

import { createSlice, createSelector } from "@reduxjs/toolkit"
import { createSelectorCreator, defaultMemoize } from "reselect"
import { pickBy, isEqual } from "lodash"

import { fromEntries } from "../../esutils"

import { keyLabelToNumber, keyNumberToLabel, splitEnharmonics } from "../recommender"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../../hooks"
import {SwitchThemeButton} from "./SwitchThemeButton";


store.dispatch(soundsThunks.getStandardSounds())
export const Companion = () => {
    useEffect(() => {
        document.getElementById("loading-screen")!.style.display = "none"
    })
    const { t } = useTranslation()
    const theme = useSelector(appState.selectColorTheme)
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isAdmin, setIsAdmin] = useState(false)
    const [loggedIn, setLoggedIn] = useState(false)

    let kind: BrowserTabType = useSelector(layout.selectWestKind)
    if (!Object.values(BrowserTabType).includes(kind)) {
        kind = BrowserTabType.Sound
    }
    useEffect(() => {
        if (theme === "dark") {
            document.body.classList.add("dark")
        } else {
            document.body.classList.remove(("dark"))
        }
    }, [theme])
    const dispatch = useDispatch()
    const login = async (username: string, password: string) => {

        let token
        try {
            token = await request.getBasicAuth("/users/token", username, password)
        } catch (error) {
            // userNotification.show(i18n.t("messages:general.loginfailure"), "failure1", 3.5)
            return
        }

        await relogin(token)
    }

    const relogin = async (token: string) => {
        let userInfo
        try {
            userInfo = await request.get("/users/info", {}, { Authorization: "Bearer " + token })
        } catch {
            // userNotification.show("Your credentials have expired. Please login again with your username and password.", "failure1", 3.5)
            dispatch(user.logout())
            return
        }
        const username = userInfo.username

        store.dispatch(user.login({ username, token }))

        store.dispatch(soundsThunks.getUserSounds(username))
        store.dispatch(soundsThunks.getFavorites(token))

        // Always override with the returned username in case the letter cases mismatch.
        setUsername(username)
        setIsAdmin(userInfo.isAdmin)
        email = userInfo.email
        // userNotification.user.isAdmin = userInfo.isAdmin

        // Retrieve the user scripts.
        // await postLogin(username)
        // esconsole("Logged in as " + username, ["DEBUG", "MAIN"])

        if (!loggedIn) {
            setLoggedIn(true)
            // userNotification.show(i18n.t("messages:general.loginsuccess"), "history", 0.5)
            // const activeTabID = tabs.selectActiveTabID(store.getState())
            // activeTabID && store.dispatch(tabThunks.setActiveTabAndEditor(activeTabID))
        }
    }

    const logout = async () => {
        let keepUnsavedTabs = false
        // save all unsaved open scripts
        // try {
        //     const promise = scriptsThunks.saveAll()
        //     await promise
        //     if (promise) {
        //         userNotification.show(i18n.t("messages:user.allscriptscloud"))
        //     }
        // } catch (error) {
        //     if (await confirm({ textKey: "messages:idecontroller.saveallfailed", cancelKey: "discardChanges", okKey: "keepUnsavedTabs" })) {
        //         keepUnsavedTabs = true
        //     }
        // }



        localStorage.clear()
        if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT) {
            store.dispatch(caiState.resetState())
        }



        dispatch(user.logout())
        dispatch(soundsState.resetFavorites())
        dispatch(soundsState.resetAllFilters())

        // Clear out all the values set at login.
        setUsername("")
        setPassword("")
        setLoggedIn(false)

        // User data
        email = ""
        setIsAdmin(false)
    }

    return <div
        className={`flex flex-col h-screen max-h-screen text-left font-sans ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}
        id="content-manager">
        <div className={"flex flex-row justify-center w-full bg-blue"}> 
            <LoginMenu {...{ loggedIn, isAdmin, username, password, setUsername, setPassword, login, logout }} />
            <SwitchThemeButton />
        </div>    
        <div className={"flex flex-col w-full h-full"}>

            <TitleBar />
            <BrowserTabs />
            {Object.entries(BrowserComponents).map(([type, TabBody]) =>
                <div key={type} className={"flex flex-col grow" + (+type === kind ? "" : " hidden")}><TabBody /></div>)}
        </div>
    </div>
}




export const TitleBar = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div
            className="flex justify-between text-center text-white bg-blue"
            id="browser-tabs"
            role="tablist"
            aria-label="Content manager tabs"
            style={{
                minHeight: "fit-content", // Safari-specific issue
            }}
        >
        </div>
    )
}



let email = ""

export function openAdminWindow() {
    openModal(AdminWindow)
}

function forgotPass() {
  openModal(ForgotPassword)
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
        <form className="flex bg-blue pt-6 gap-2 justify-center" onSubmit={e => { e.preventDefault(); login(username, password) }}>
            <input type="text" className="text-2xl" ml-8 autoComplete="on" name="username" title={t("formfieldPlaceholder.username")} aria-label={t("formfieldPlaceholder.username")} value={username} onChange={e => setUsername(e.target.value)} placeholder={t("formfieldPlaceholder.username")} required />
            <input type="password" className="text-2xl" autoComplete="current-password" name="password" title={t("formfieldPlaceholder.password")} aria-label={t("formfieldPlaceholder.password")} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("formfieldPlaceholder.password")} required />
            <button type="submit" className="whitespace-nowrap text-5xl bg-white text-black hover:text-black hover:bg-gray-200" style={{ marginLeft: "6px", padding: "2px 5px 3px" }} title="Login" aria-label="Login">GO <i className="icon icon-arrow-right" /></button>
        </form>}
    </>
}



const BrowserTab = ({ name, type, children }: { name: string, type: BrowserTabType, children: React.ReactNode }) => {
    const dispatch = useDispatch()
    const isSelected = useSelector(layout.selectWestKind) === type
    const highlight = useSelector(caiState.selectHighlight).zone === name.toLowerCase()
    const activeProject = useSelector(tabState.selectActiveTabID)

    const { t } = useTranslation()

    return (
        <button
            id={name}
            className={`px-1 py-2 w-1/3 flex-grow cursor-pointer ${isSelected ? "text-amber border-amber border-b-4" : (highlight ? "border-yellow-400 border-4" : "border-b-4 border-transparent")} truncate`}
            style={isSelected
                ? {
                    color: "#F5AE3C",
                    borderColor: "#F5AE3C",
                }
                : {}}
            onClick={() => {
                dispatch(layout.setWest({
                    open: true,
                    kind: type,
                }))
                if (!isSelected) { addUIClick(name + " tab") }
                if (highlight) {
                    if (type === 1) {
                        dispatch(caiThunks.highlight({ zone: "script", id: activeProject || undefined }))
                    } else {
                        dispatch(caiThunks.highlight({ zone: "apiSearchBar" }))
                    }
                }
            }}
            title={t("contentManager.openTab", { name })}
            aria-label={t("contentManager.openTab", { name })}
            role="tab"
            aria-selected={isSelected ? "true" : "false"}
            aria-controls={"panel-" + type}
        >
            <h3 style={{ fontSize: "80px", fontWeight: "bold", lineHeight: "300px"}} >
                {children}
                {name}
            </h3>
        </button>
    )
}

export const BrowserTabs = () => {
    const { t } = useTranslation()
    return (
        <div
            className="flex justify-center text-center text-white bg-blue"
            id="browser-tabs"
            role="tablist"
            aria-label="Content manager tabs"
            style={{
                minHeight: "fit-content", // Safari-specific issue
            }}
        >
            <BrowserTab name={t("soundBrowser.title").toLocaleUpperCase()} type={BrowserTabType.Sound}>
                <i className="icon-headphones pr-2" />
            </BrowserTab>

            <BrowserTab name="API" type={BrowserTabType.API}>
                <i className="icon-book pr-2" />
            </BrowserTab>
        </div>
    )
}
export const Header = ({ title }: { title: string }) => (
    <div className="p-4 hidden">{title}</div>
)


// Keys are weirdly all caps because of the shared usage in the layout reducer as well as component's title-bar prop.
const BrowserComponents: { [key in BrowserTabType]: React.FC } = {
    [BrowserTabType.Sound]: SoundBrowser,
    [BrowserTabType.Script]: ScriptBrowser,
    [BrowserTabType.API]: APIBrowser,
}




