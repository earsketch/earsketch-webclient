import React from "react"

import { useTranslation } from "react-i18next"



import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../../hooks"
import * as appState from "../appState"
import { Dialog, Menu, Popover, Transition } from "@headlessui/react"
import { AccountCreator } from "../AccountCreator"
import { AdminWindow } from "../AdminWindow"
import { openModal } from "../modal"
import { ProfileEditor } from "../ProfileEditor"
import { ForgotPassword } from "../ForgotPassword"


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
        <form className="flex items-center" onSubmit={e => { e.preventDefault(); login(username, password) }}>
            <input type="text" className="text-sm" autoComplete="on" name="username" title={t("formfieldPlaceholder.username")} aria-label={t("formfieldPlaceholder.username")} value={username} onChange={e => setUsername(e.target.value)} placeholder={t("formfieldPlaceholder.username")} required />
            <input type="password" className="text-sm" autoComplete="current-password" name="password" title={t("formfieldPlaceholder.password")} aria-label={t("formfieldPlaceholder.password")} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("formfieldPlaceholder.password")} required />
            <button type="submit" className="whitespace-nowrap text-xs bg-white text-black hover:text-black hover:bg-gray-200" style={{ marginLeft: "6px", padding: "2px 5px 3px" }} title="Login" aria-label="Login">GO <i className="icon icon-arrow-right" /></button>
        </form>}
        <Menu as="div" className="relative inline-block text-left mx-3">
            <Menu.Button className="text-gray-400">
                {loggedIn
                    ? <div className="text-black bg-gray-400 whitespace-nowrap py-1 px-2 rounded-md" role="button">{username}<span className="caret" /></div>
                    : <div className="whitespace-nowrap py-1 px-2 text-xs bg-white text-black hover:text-black hover:bg-gray-200" role="button" style={{ marginLeft: "6px", height: "23px" }} title={t("createResetAccount")} aria-label={t("createResetAccount")}>{t("createResetAccount")}</div>}
            </Menu.Button>
            <Menu.Items className="whitespace-nowrap absolute z-50 right-0 mt-1 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {(loggedIn
                    ? [{ name: t("editProfile"), action: editProfile }, ...(isAdmin ? [{ name: "Admin Window", action: openAdminWindow }] : []), { name: t("logout"), action: logout }]
                    : [{ name: t("registerAccount"), action: createAccount }, { name: t("forgotPassword.title"), action: forgotPass }])
                    .map(({ name, action }) =>
                        <Menu.Item key={name}>
                            {({ active }) => <button className={`${active ? "bg-gray-500 text-white" : "text-gray-900"} text-sm group flex items-center w-full px-2 py-1`} onClick={action}>{name}</button>}
                        </Menu.Item>)}
            </Menu.Items>
        </Menu>
    </>
}


const TopHeader = ({
    loggedIn,
    isAdmin,
    username,
    password,
    setUsername,
    setPassword,
    login,
    logout,
}: {
    loggedIn: boolean,
    isAdmin: boolean,
    username: string,
    password: string,
    setUsername: (u: string) => void,
    setPassword: (p: string) => void,
    login: (u: string, p: string) => void,
    logout: () => void
}) => {
    const dispatch = useDispatch()
    const embedMode = useSelector(appState.selectEmbedMode)
    const { t } = useTranslation()
    const showAfeCompetitionBanner = FLAGS.SHOW_AFE_COMPETITION_BANNER || location.href.includes("competition")

    if (embedMode) return null

    return (
        <header role="banner" id="top-header-nav" className="shrink-0">
            <div className="w-full flex items-center">
                <a href="http://earsketch.gatech.edu/landing"
                   target="_blank" rel="noreferrer"
                   className="flex items-center"
                   tabIndex={0}>
                    <img className="h-[26px] mx-2.5 min-w-[41px]" src={esLogo} alt="EarSketch Logo" />
                    <h1 className="text-2xl text-white">EarSketch</h1>
                </a>

                {showAfeCompetitionBanner &&
                <div className="hidden w-full lg:flex justify-evenly">
                    <a href="https://www.teachers.earsketch.org/compete"
                       aria-label="Link to Amazon Future Engineer Your Voice is Power competition"
                       target="_blank"
                       className="text-black uppercase dark:text-white"
                       style={{ color: "yellow", textShadow: "1px 1px #FF0000", lineHeight: "21px", fontSize: "18px" }}
                       rel="noreferrer">
                        <div><img id="app-logo" src={afeLogo} alt="Amazon Logo" style={{ marginLeft: "17px", marginRight: "0px", height: "13px" }} /></div>
                        Celebrity Remix
                    </a>
                </div>}
            </div>


            <div id="top-header-nav-form">

                <LoginMenu
                    {...{ loggedIn, isAdmin, username, password, setUsername, setPassword, login, logout }}
                />
            </div>
        </header>
    )
}

export default TopHeader