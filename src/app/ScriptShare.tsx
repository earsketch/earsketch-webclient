import { Transition } from "@headlessui/react"
import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePopper } from "react-popper"

import { Script } from "common"
import * as ESUtils from "../esutils"
import * as exporter from "./exporter"
import reporter from "./reporter"
import * as scriptsThunks from "../browser/scriptsThunks"
import * as userNotification from "../user/notification"
import * as user from "../user/userState"
import { get } from "../request"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"
import store from "../reducers"
import * as websocket from "./websocket"

function shareWithPeople(shareid: string, users: string[]) {
    const data = {
        notification_type: "sharewithpeople",
        username: user.selectUserName(store.getState()),
        sender: user.selectUserName(store.getState()),
        scriptid: shareid,
        // TODO: Simplify what the server expects. (`exists` is an artifact of the old UI.)
        users: users.map(id => ({ id, exists: true })),
    }

    websocket.send(data)
}

// stuff for view-only share
async function queryID(query: any) {
    query = query.toLowerCase().trim()
    if (query === "") {
        return null
    } else if (ESUtils.checkIllegalCharacters(query)) {
        throw new Error("messages:general.illegalCharacterInUserID")
    } else if (query === user.selectUserName(store.getState())!.toLowerCase()) {
        throw new Error("messages:general.noSelfShare")
    }

    const data = await get("/users/search", { query })
    if (data) {
        return data.username
    }
    throw new Error("messages:general.userDoesNotExist")
}

const UserListInput = ({ users, setUsers, setFinalize }: {
    users: string[], setUsers: (u: string[]) => void, setFinalize: (f: () => Promise<string[] | null>) => void
}) => {
    const [query, setQuery] = useState("")
    const [error, setError] = useState("")
    const { t } = useTranslation()

    setFinalize(async () => {
        if (error !== "") {
            return null
        } else if (query !== "") {
            // User has entered but not yet added another name; add it now.
            return addUser()
        } else {
            return users
        }
    })

    const handleInput = (event: React.KeyboardEvent) => {
        if (event.key === " ") {
            event.preventDefault()
            addUser()
        } else if (event.key === "Backspace" && query === "") {
            setUsers(users.slice(0, -1))
        } else if (error !== "") {
            setError("")
        }
    }

    const addUser = async () => {
        try {
            const username = await queryID(query)
            if (!username) {
                return users
            }
            let newUsers = users
            if (!users.map((s: string) => s.toLowerCase()).includes(username.toLowerCase())) {
                // Avoid duplicates.
                newUsers = [...users, username]
                setUsers(newUsers)
            }
            setQuery("")
            return newUsers
        } catch (error: any) {
            setError(error.message)
            return null
        }
    }

    const removeUser = (index: number) => {
        setUsers(users.slice(0, index).concat(users.slice(index + 1)))
    }

    return <>
        <div className="mt-3 p-2.5 flex flex-wrap border border-gray-500 focus-within:outline outline-2 outline-blue-600">
            {users.map((name: string, index: number) =>
                <div key={index} className="share-people-chip shrink">
                    <span className="mr-1 text-black dark:text-white">{name}</span>
                    <span className="cursor-pointer" onClick={() => removeUser(index)} style={{ color: "#c25452" }}>X</span>
                </div>)}
            <input className="px-3 py-2 grow w-full dark:bg-transparent placeholder:text-gray-300 border-0 focus:shadow-none focus:outline-none" placeholder={t("scriptShare.tab.viewonly.usersPlaceholder")} autoFocus
                value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => handleInput(e)} onBlur={addUser} />
        </div>
        <hr className="mt-3" />
        {error && <div className="share-people-error">{t(error)}</div>}
    </>
}

interface TabParameters {
    script: Script
    close: () => void
}

export const CopyButton = ({ textElement }: { textElement: React.RefObject<HTMLInputElement | HTMLTextAreaElement> }) => {
    const [referenceElement, setReferenceElement] = useState(null as HTMLElement | null)
    const [popperElement, setPopperElement] = useState(null as HTMLElement | null)
    const { styles, attributes } = usePopper(referenceElement, popperElement, { placement: "top" })

    const { t } = useTranslation()
    const [copied, setCopied] = useState(false)

    const handleClick = () => {
        textElement.current?.select()
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 1000)
    }

    return <>
        <button aria-label={t("scriptShare.copyClipboard")} ref={setReferenceElement} onClick={e => { e.preventDefault(); handleClick() }} className="text-blue-400 hover:text-blue-600 text-2xl p-2" title={t("scriptShare.copyClipboard")}>
            <i className="icon icon-paste4"></i>
        </button>
        <Transition
            show={copied}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
        >
            <div ref={setPopperElement} className="bg-white p-2 rounded-md shadow-md" style={{ ...styles.popper, bottom: "5px" }} {...attributes.popper}>
                Copied!
            </div>
        </Transition>
    </>
}

export const LinkTab = ({ script, close }: TabParameters) => {
    const [lockedShareID, setLockedShareID] = useState("")
    const [lock, setLock] = useState(false)
    const [viewers, setViewers] = useState([] as string[])
    const finalize = useRef<undefined |(() => Promise<string[] | null>)>()
    const linkElement = useRef<HTMLInputElement>(null)
    const { t } = useTranslation()

    const sharelink = location.origin + location.pathname + "?sharing=" + script.shareid
    const lockedShareLink = location.origin + location.pathname + "?sharing=" + lockedShareID
    const link = lock ? lockedShareLink : sharelink

    useEffect(() => {
        scriptsThunks.getLockedSharedScriptId(script.shareid).then(setLockedShareID)
    }, [])

    const downloadShareUrl = () => {
        const textContent = "[InternetShortcut]\n" + "URL=" + link + "\n" + "IconIndex=0"
        // This is an "interesting" use of exporter.text().
        exporter.text({
            name: script.name + ".url",
            source_code: textContent,
        } as Script)
    }

    const submit = async () => {
        const users = await finalize.current?.()
        if (!users) return // Bad username in the list.
        if (users.length) {
            reporter.share()
            shareWithPeople(lock ? lockedShareID : script.shareid, users)
            userNotification.show(t("messages:shareScript.sharedViewOnly", { scriptName: script.name }) + users.join(", "))
        }
        close()
    }

    const selectedClasses = "bg-sky-600 text-white hover:text-white focus:text-white hover:bg-sky-700"
    const unselectedClasses = "bg-white text-black hover:text-black hover:bg-gray-200"

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <ModalBody>
            <div>
                <div className="modal-section-header">
                    <span>
                        <i className="icon icon-copy mr-2" style={{ color: "#6dfed4" }}></i>
                        {t("scriptShare.tab.viewonly.linkTitle")}
                    </span>
                    <div className="btn-group">
                        <button type="button" onClick={() => setLock(true)}
                            className={"btn " + (lock ? selectedClasses : unselectedClasses)}
                            style={{ marginRight: 0, borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px" }}
                            aria-label={t("scriptShare.tab.viewonly.shareCurrent")}
                            title={t("scriptShare.tab.viewonly.shareCurrent")}>
                            {t("scriptShare.tab.viewonly.shareCurrent")}
                        </button>
                        <button type="button" onClick={() => setLock(false)}
                            className={"btn " + (lock ? unselectedClasses : selectedClasses)}
                            style={{ borderTopRightRadius: "8px", borderBottomRightRadius: "8px" }}
                            aria-label={t("scriptShare.tab.viewonly.shareFuture")}
                            title={t("scriptShare.tab.viewonly.shareFuture")}>
                            {t("scriptShare.tab.viewonly.shareFuture")}
                        </button>
                    </div>
                </div>
                <div id="share-link-container" className="mt-2.5 flex">
                    <input title={t("scriptShare.tab.viewonly.linkTitle")} aria-label={t("scriptShare.tab.viewonly.linkTitle")} ref={linkElement} className="outline-none grow mr-3 bg-gray-200 dark:bg-gray-800 p-2 rounded" type="text" value={link} readOnly />
                    <CopyButton textElement={linkElement} />
                    <button aria-label={t("scriptShare.tab.viewonly.downloadShortcutFile")} className="text-blue-400 hover:text-blue-600 text-2xl p-2" onClick={e => { e.preventDefault(); downloadShareUrl() }} title={t("scriptShare.tab.viewonly.downloadShortcutFile")}><i className="icon-file-download" /></button>
                </div>
                <hr className="mt-3" />

                <div>
                    <div className="modal-section-header">
                        <span>
                            <i className="icon icon-copy mr-2" style={{ color: "#6dfed4" }}></i>
                            {t("scriptShare.tab.viewonly.otherUsers")}
                        </span>
                    </div>
                    <UserListInput users={viewers} setUsers={setViewers} setFinalize={f => { finalize.current = f }} />
                </div>
            </div>
        </ModalBody>
        <ModalFooter submit={viewers.length ? "saveAndSend" : "save"} close={close} />
    </form>
}

const EmbedTab = ({ script, close }: TabParameters) => {
    const sharelink = location.origin + location.pathname + "?sharing=" + script.shareid
    const [showCode, setShowCode] = useState(true)
    const [showDAW, setShowDAW] = useState(true)
    const options = "" + (showCode ? "" : "&hideCode") + (showDAW ? "" : "&hideDaw")
    const height = (showCode || showDAW) ? 400 : 54
    const code = `<iframe width="600" height="${height}" src="${sharelink}&embedded=true${options}"></iframe>`
    const codeElement = useRef<HTMLTextAreaElement>(null)
    const { t } = useTranslation()

    return <form onSubmit={e => { e.preventDefault(); close() }}>
        <ModalBody>
            <div>
                <div className="modal-section-header">
                    <span>
                        <i className="icon icon-copy mr-2" style={{ color: "#6dfed4" }}></i>
                        {t("scriptShare.tab.embed.linkTitle")}
                    </span>
                    <label className="mr-3">{t("scriptShare.tab.embed.showCode")} <input type="checkbox" checked={showCode} onChange={e => setShowCode(e.target.checked)} /></label>
                    <label className="mr-3">{t("scriptShare.tab.embed.showDAW")} <input type="checkbox" checked={showDAW} onChange={e => setShowDAW(e.target.checked)} /></label>
                </div>
                <div id="share-link-container" className="mt-2.5">
                    <textarea ref={codeElement} className="share-link outline-none resize-none w-full bg-gray-200 dark:bg-gray-800 p-2 rounded" value={code} readOnly />
                    <CopyButton textElement={codeElement} />
                </div>
                <hr className="mt-3" />
            </div>
        </ModalBody>
        <ModalFooter submit="save" close={close} />
    </form>
}

const Tabs = [
    { component: LinkTab, titleKey: "scriptShare.tab.viewonly.title", descriptionKey: "messages:shareScript.menuDescriptions.viewOnly" },
    { component: EmbedTab, titleKey: "scriptShare.tab.embed.title", descriptionKey: "messages:shareScript.menuDescriptions.embedded" },
]

export const ScriptShare = ({ script, close }: { script: Script, close: () => void }) => {
    const [activeTab, setActiveTab] = useState(0)
    const { t } = useTranslation()

    const ShareBody = Tabs[activeTab].component
    // TODO: Reduce duplication with tab component in SoundUploader.
    return <div className="share-script">
        <ModalHeader><i className="icon icon-share2 mr-3"></i>{t("scriptShare.title", { scriptName: script.name })}</ModalHeader>
        <div className="mb-2 flex">
            {Tabs.map(({ titleKey }, index) =>
                <button aria-label={t(titleKey)} key={index} onClick={e => { e.preventDefault(); setActiveTab(index) }} className={"text-sm flex justify-center items-center grow px-1 py-2 w-1/4 cursor-pointer bg-blue border-b-4 " + (activeTab === index ? "border-b-amber text-amber" : "border-transparent text-white")} style={{ textDecoration: "none" }}>
                    {t(titleKey).toLocaleUpperCase()}
                </button>
            )}
        </div>
        <div className="text-center text-sm my-3 dark:text-white">{t(Tabs[activeTab].descriptionKey)}</div>
        <ShareBody {...{ script, close }} />
    </div>
}
