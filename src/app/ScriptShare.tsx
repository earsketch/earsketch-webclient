import i18n from "i18next"
import { Transition } from "@headlessui/react"
import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePopper } from "react-popper"
import { useDispatch, useSelector } from "react-redux"

import * as collaboration from "./collaboration"
import { Script } from "common"
import * as ESUtils from "../esutils"
import * as exporter from "./exporter"
import licenses from "../data/licenses"
import reporter from "./reporter"
import * as scripts from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"
import * as tabs from "../ide/tabState"
import * as userNotification from "../user/notification"
import * as user from "../user/userState"
import { get } from "../request"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"
import type { AppDispatch } from "../reducers"
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

// stuff for view-only and collaborative share
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
        } catch (error) {
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
    licenseID: number
    setLicenseID: (id: number) => void
    description: string
    setDescription: (description: string) => void
    save: () => void
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

export const LinkTab = ({ script, licenseID, setLicenseID, description, setDescription, save, close }: TabParameters) => {
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
        save()
        if (users.length) {
            reporter.share("link", licenses[licenseID].name)
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
        <MoreDetails {...{ licenseID, setLicenseID, description, setDescription }} />
        <ModalFooter submit={viewers.length ? "saveAndSend" : "save"} close={close} />
    </form>
}

const CollaborationTab = ({ script, licenseID, setLicenseID, description, setDescription, save, close }: TabParameters) => {
    const dispatch = useDispatch<AppDispatch>()
    const activeTabID = useSelector(tabs.selectActiveTabID)
    const [collaborators, setCollaborators] = useState(script.collaborators)
    const finalize = useRef<undefined |(() => Promise<string[] | null>)>()
    const { t } = useTranslation()

    const submit = async () => {
        const newCollaborators = await finalize.current?.()
        if (!newCollaborators) return
        const oldCollaborators = script.collaborators

        // Update the remote script state.
        const added = newCollaborators.filter(m => !oldCollaborators.includes(m))
        const removed = oldCollaborators.filter(m => !newCollaborators.includes(m))
        const username = user.selectUserName(store.getState())!
        collaboration.addCollaborators(script.shareid, username, added)
        collaboration.removeCollaborators(script.shareid, username, removed)

        // Update the local script state.
        dispatch(scripts.setScriptCollaborators({ id: script.shareid, collaborators: newCollaborators }))
        save()
        script = scripts.selectRegularScripts(store.getState())[script.shareid]

        // Update the state of tab, if open.
        if (activeTabID === script.shareid) {
            if (oldCollaborators.length === 0 && newCollaborators.length > 0) {
                if (!script.saved) {
                    await dispatch(scriptsThunks.saveScript({ name: script.name, source: script.source_code })).unwrap()
                }
                collaboration.openScript(script, username)
            } else if (oldCollaborators.length > 0 && newCollaborators.length === 0) {
                collaboration.closeScript(script.shareid)
            }
        }
        close()
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <ModalBody>
            <div className="modal-section-header">
                <i className="icon icon-users mr-2" style={{ color: "#6dfed4" }}></i>
                {t("scriptShare.tab.collab.addRemove")}
            </div>
            <UserListInput users={collaborators} setUsers={setCollaborators} setFinalize={f => { finalize.current = f }} />
        </ModalBody>
        <MoreDetails {...{ licenseID, setLicenseID, description, setDescription }} />
        <ModalFooter submit="save" close={close} />
    </form>
}

const EmbedTab = ({ script, licenseID, setLicenseID, description, setDescription, save, close }: TabParameters) => {
    const sharelink = location.origin + location.pathname + "?sharing=" + script.shareid
    const [showCode, setShowCode] = useState(true)
    const [showDAW, setShowDAW] = useState(true)
    const options = "" + (showCode ? "" : "&hideCode") + (showDAW ? "" : "&hideDaw")
    const height = (showCode || showDAW) ? 400 : 54
    const code = `<iframe width="600" height="${height}" src="${sharelink}&embedded=true${options}"></iframe>`
    const codeElement = useRef<HTMLTextAreaElement>(null)
    const { t } = useTranslation()

    return <form onSubmit={e => { e.preventDefault(); save(); close() }}>
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
        <MoreDetails {...{ licenseID, setLicenseID, description, setDescription }} />
        <ModalFooter submit="save" close={close} />
    </form>
}

const SoundCloudTab = ({ script, licenseID, setLicenseID, description, setDescription, save, close }: TabParameters) => {
    const ACCESS_OPTIONS = [
        { sharing: "private", downloadable: true, descriptionKey: "scriptShare.tab.soundcloud.shareDesc.private" },
        { sharing: "public", downloadable: true, descriptionKey: "scriptShare.tab.soundcloud.shareDesc.publicDownload" },
        { sharing: "public", downloadable: false, descriptionKey: "scriptShare.tab.soundcloud.shareDesc.public" },
    ]
    const [name, setName] = useState(script.name)
    const [access, setAccess] = useState(1)
    const { t } = useTranslation()
    const sharelink = location.origin + location.pathname + "?sharing=" + script.shareid
    const license = licenses[licenseID].name

    const [url, setURL] = useState("")
    let animation = 0
    const [message, setMessage] = useState("")

    const submit = () => {
        if (url) {
            // Already uploaded.
            window.open(url, "_blank")?.focus()
            close()
        } else {
            setMessage("")
            shareToSoundCloud()
        }
    }

    const shareToSoundCloud = () => {
        const sc = {
            name,
            sharing: ACCESS_OPTIONS[access].sharing,
            downloadable: ACCESS_OPTIONS[access].downloadable,
            description,
            tags: "EarSketch",
            license: "cc-" + license.split(" ")[1].toLowerCase(),
        }

        if (description !== "") {
            sc.description += "\n\n"
            sc.description += "-------------------------------------------------------------\n\n"
        }
        sc.description += i18n.t("messages:idecontroller.soundcloud.description") + "\n\n"
        sc.description += "-------------------------------------------------------------\n\n"
        sc.description += i18n.t("messages:idecontroller.soundcloud.code") + "\n\n" + script.source_code + "\n\n"
        sc.description += "-------------------------------------------------------------\n\n"
        sc.description += i18n.t("messages:idecontroller.soundcloud.share") + " " + sharelink + "\n\n"
        sc.description += "-------------------------------------------------------------\n\n"

        save()

        setMessage("UPLOADING")
        animation = window.setInterval(() => {
            const numDots = Math.floor(new Date().getTime() / 1000) % 5 + 1
            let dots = ""
            for (let i = 0; i < numDots; i++) {
                dots += "."
            }
            setMessage("UPLOADING" + dots)
        }, 1000)

        exporter.soundcloud(script, sc).then(url => {
            setURL(url)
            clearInterval(animation)
            setMessage("Finished uploading!")
            reporter.share("soundcloud", license)
        }).catch((err) => {
            userNotification.show(t("messages:shareScript.soundcloudError"), "failure1")
            console.log(err)
        })
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <ModalBody>
            <div className="modal-section-header">
                <span>
                    <i className="icon icon-soundcloud mr-2" style={{ color: "#6dfed4" }}></i>
                    {t("scriptShare.tab.soundcloud.songName")}
                </span>
            </div>
            <input required type="text" className="form-input w-full dark:bg-transparent placeholder:text-gray-300" placeholder="Click here to start typing..." value={name} onChange={e => setName(e.target.value)} autoFocus />

            <div className="modal-section-header">
                <span>{t("scriptShare.tab.soundcloud.sharePrompt")}</span>
            </div>
            <div className="container">
                <div className="row mt-5 justify-between flex">
                    {ACCESS_OPTIONS.map(({ descriptionKey }, index) =>
                        <div key={index}>
                            <label>
                                <input type="radio" name="useraccess" value={index} checked={index === access} onChange={e => { if (e.target.checked) setAccess(index) }} />
                                <span />{t(descriptionKey)}
                            </label>
                        </div>)}
                </div>
            </div>
        </ModalBody>

        <MoreDetails {...{ licenses, licenseID, setLicenseID, description, setDescription }} />

        {message && <div className="text-center" style={{ height: "3em", lineHeight: "3em", textAlign: "center", backgroundColor: "rgb(170,255,255,0.5)" }}>
            {message.startsWith("UPLOADING") && <i className="animate-spin es-spinner mr-3"></i>}{message}
        </div>}

        <ModalFooter submit={url ? "scriptShare.tab.soundcloud.view" : "upload"} close={close} />
    </form>
}

const MoreDetails = ({ licenseID, setLicenseID, description, setDescription }: {
    licenseID: number, setLicenseID: (id: number) => void, description: string, setDescription: (ds: string) => void
}) => {
    const [collapsed, setCollapsed] = useState(true)
    const { t } = useTranslation()
    const licenseLink = "https://creativecommons.org/licenses/" + licenses[licenseID].name.split(" ")[1].toLowerCase() + "/4.0"

    return <div>
        <div className="bg-blue-200 px-3 py-2">
            <h4>
                <button className="text-black" onClick={e => { e.preventDefault(); setCollapsed(!collapsed) }}>
                    {t("scriptShare.moreDetails")}
                    <i className={`ml-3 icon icon-arrow-${collapsed ? "right" : "down"}2`} />
                </button>
            </h4>
        </div>
        {!collapsed &&
        <div className="bg-gray-200">
            <div className="form-group text-left">
                <div className="modal-section-header pl-8">
                    <span>{t("scriptShare.descriptionOptional")}</span>
                </div>
                <div className="px-3">
                    <textarea className="form-textarea border-0 w-full" rows={2} placeholder={t("formFieldPlaceholder.typeDescriptionHere")} value={description} onChange={e => setDescription(e.target.value)} maxLength={500}></textarea>
                </div>
            </div>

            <div className="text-left">
                <div className="modal-section-header pl-8">
                    <span>{t("scriptShare.licenseType")}</span>
                </div>

                <div className="container px-5" id="share-licenses-container">
                    <div className="row mt-6 flex">
                        {licenses.map((license, id) =>
                            <div key={id} style={{ color: "#717171" }} className="radio-inline p-0 grow">
                                <label>
                                    <input type="radio" name="optradio" value={id} checked={id === licenseID} onChange={e => { if (e.target.checked) setLicenseID(id) }} />
                                    <span></span>{license.name}
                                </label>
                            </div>)}
                    </div>
                </div>

                <div className="description p-3 text-black">
                    {licenses[licenseID].description} Click <a href={licenseLink} target="_blank" rel="noreferrer">here</a> to see more.
                </div>
            </div>
        </div>}
    </div>
}

const Tabs = [
    { component: LinkTab, titleKey: "scriptShare.tab.viewonly.title", descriptionKey: "messages:shareScript.menuDescriptions.viewOnly" },
    { component: CollaborationTab, titleKey: "scriptShare.tab.collab.title", descriptionKey: "messages:shareScript.menuDescriptions.collaboration" },
    { component: EmbedTab, titleKey: "scriptShare.tab.embed.title", descriptionKey: "messages:shareScript.menuDescriptions.embedded" },
    { component: SoundCloudTab, titleKey: "scriptShare.tab.soundcloud.title", descriptionKey: "messages:shareScript.menuDescriptions.soundCloud" },
]

export const ScriptShare = ({ script, close }: { script: Script, close: () => void }) => {
    const [activeTab, setActiveTab] = useState(0)
    const [description, setDescription] = useState(script.description ?? "")
    // NOTE: Offsets here and in `save` compensate for 1-indexing on server-side. Would be nice to fix at some point.
    const [licenseID, setLicenseID] = useState((script.license_id ?? 1) - 1)
    const { t } = useTranslation()

    const save = () => scriptsThunks.setScriptMetadata(script.shareid, description, licenseID + 1)

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
        <ShareBody {...{ script, licenseID, setLicenseID, description, setDescription, save, close }} />
    </div>
}
