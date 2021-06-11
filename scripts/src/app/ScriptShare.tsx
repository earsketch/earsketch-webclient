import React, { useRef, useState } from "react"
import { Provider, useDispatch, useSelector } from "react-redux"

import * as app from "./appState"
import * as collaboration from "./collaboration"
import { ScriptEntity } from "common"
import * as ESUtils from "../esutils"
import * as exporter from "./exporter"
import reporter from "./reporter"
import * as scripts from "../browser/scriptsState"
import store from "../reducers"
import * as tabs from "../editor/tabState"
import * as userNotification from "./userNotification"
import * as userProject from "./userProject"
import { useTranslation } from "react-i18next"
import i18n from "i18next"

// stuff for view-only and collaborative share
async function queryID(query: any) {
    query = query.toLowerCase().trim()
    if (query === "") {
        return null
    } else if (ESUtils.checkIllegalCharacters(query)) {
        throw i18n.t('messages:general.illegalCharacterInUserID')
    } else if (query === userProject.getUsername().toLowerCase()) {
        throw "You cannot share scripts with yourself!"
    }

    const data = await userProject.get("/services/scripts/searchuser", { query })
    if (data) {
        return data.username
    }
    throw "That user ID does not exist."
}

const UserListInput = ({ users, setUsers, setFinalize }:
    { users: string[], setUsers: (u: string[]) => void, setFinalize: (f: () => Promise<string[] | null>) => void }
) => {
    const theme = useSelector(app.selectColorTheme)
    const [query, setQuery] = useState("")
    const [error, setError] = useState("")

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
                newUsers = [ ...users, username ]
                setUsers(newUsers)
            }
            setQuery("")
            return newUsers
        } catch (error) {
            setError(error)
            return null
        }
    }

    const removeUser = (index: number) => {
        setUsers(users.slice(0, index).concat(users.slice(index+1)))
    }

    return <>
        <div className="mt-5">
            {users.map((name: string, index: number) =>
            <div key={index} className="share-people-chip">
                <span className="mr-1" style={{ color: theme === "dark" ? "white" : "black" }}>{name}</span>
                <span className="cursor-pointer" onClick={() => removeUser(index)} style={{ color: "#c25452" }}>X</span>
            </div>)}
            <input className="bg-transparent border-none outline-none flex-grow" style={{ width: "24em" }} placeholder="Type user IDs, separated by space." autoFocus
                value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => handleInput(e)} onBlur={addUser} />
        </div>
        <hr className="mt-3" />
        {error && <div className="share-people-error">{error}</div>}
    </>
}

interface TabParameters {
    script: ScriptEntity
    licenses: { [key: string]: any }
    licenseID: string
    setLicenseID: (id: string) => void
    description: string
    setDescription: (description: string) => void
    save: () => void
    close: () => void
}

export const LinkTab = ({ script, licenses, licenseID, setLicenseID, description, setDescription, save, close }: TabParameters) => {
    const [lockedShareID, setLockedShareID] = useState("")
    const [lock, setLock] = useState(false)
    const [viewers, setViewers] = useState([] as string[])
    const finalize = useRef<undefined | (() => Promise<string[] | null>)>()
    const linkElement = useRef<HTMLInputElement>(null)

    const sharelink = location.origin + location.pathname +"?sharing=" + script.shareid
    const lockedShareLink = location.origin + location.pathname +"?sharing=" + lockedShareID
    const link = lock ? lockedShareLink : sharelink

    userProject.getLockedSharedScriptId(script.shareid).then(setLockedShareID)

    const downloadShareUrl = () => {
        const textContent = "[InternetShortcut]\n" + "URL=" + link + "\n" + "IconIndex=0"
        // This is an "interesting" use of exporter.text().
        exporter.text({
            name: script.name + ".url",
            source_code: textContent
        } as ScriptEntity)
    }

    const submit = async () => {
        const users = await finalize.current?.()
        if (!users) return
        save()
        reporter.share("link", licenses[licenseID].license)
        userProject.shareWithPeople(lock ? lockedShareID : script.shareid, users)
        userNotification.show("Shared " + script.name + " as view-only with " + users.join(", "))
        close()
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body">
            <div>
                <div className="modal-section-header">
                    <span>
                        <i className="icon icon-copy" style={{ color: "#6dfed4" }}></i>
                        Sharable View-only Link
                    </span>
                    <div className="btn-group">
                        <button type="button" onClick={() => setLock(true)}
                                className={"btn " + (lock ? "btn-primary" : "btn-default")}
                                style={{ marginRight: 0, borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px" }}>
                            SHARE CURRENT VERSION
                        </button>
                        <button type="button" onClick={() => setLock(false)}
                                className={"btn " + (lock ? "btn-default" : "btn-primary")}
                                style={{ borderTopRightRadius: "8px", borderBottomRightRadius: "8px" }}>
                            SHARE FUTURE CHANGES
                        </button>
                    </div>
                </div>
                <div id="share-link-container" className="mt-5 flex">
                    <input ref={linkElement} className="share-link outline-none flex-grow" type="text" value={link} readOnly />
                    <span className="download-share-url" onClick={downloadShareUrl}><i className="glyphicon glyphicon-download-alt" uib-tooltip="Download URL shortcut file" tooltip-placement="bottom" tooltip-append-to-body="true"></i></span>
                    <span onClick={() => { linkElement.current?.select(); document.execCommand("copy") }} className="copy-share-link" title="Copy to clipboard">
                        <i className="icon icon-paste4"></i>
                    </span>
                </div>
                <hr className="mt-3" />

                <div>
                    <div className="modal-section-header">
                        <span>
                            <i className="icon icon-copy" style={{ color: "#6dfed4" }}></i>
                            Send View-only Script to Other Users
                        </span>
                    </div>
                    <UserListInput users={viewers} setUsers={setViewers} setFinalize={f => finalize.current = f} />
                </div>
            </div>
        </div>
        <div className="modal-footer border-t-0">
            <MoreDetails {...{ licenses, licenseID, setLicenseID, description, setDescription }} />
            <div className="text-right" style={{ height: "3em", lineHeight: "3em" }}>
                <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
                <input type="submit" value={"SAVE" + (viewers.length ? " AND SEND" : "")} className="btn btn-primary text-white" />
            </div>
        </div>
    </form>
}

const CollaborationTab = ({ script, licenses, licenseID, setLicenseID, description, setDescription, save, close }: TabParameters) => {
    const dispatch = useDispatch()
    const activeTabID = useSelector(tabs.selectActiveTabID)
    const [collaborators, setCollaborators] = useState(script.collaborators)
    const finalize = useRef<undefined | (() => Promise<string[] | null>)>()

    const submit = async () => {
        const newCollaborators = await finalize.current?.()
        if (!newCollaborators) return
        const oldCollaborators = script.collaborators

        // Update the remote script state.
        const added = newCollaborators.filter(m => !oldCollaborators.includes(m))
        const removed = oldCollaborators.filter(m => !newCollaborators.includes(m))
        const username = userProject.getUsername()
        collaboration.addCollaborators(script.shareid, username, added)
        collaboration.removeCollaborators(script.shareid, username, removed)

        // Update the local script state.
        script.collaborators = newCollaborators
        userProject.scripts[script.shareid] = script
        save()

        script.collaborators = newCollaborators
        script.collaborative = newCollaborators.length > 0
        // Update the state of tab, if open.
        if (activeTabID === script.shareid) {
            if (oldCollaborators.length === 0 && newCollaborators.length > 0) {
                if (!script.saved) {
                    await userProject.saveScript(script.name, script.source_code)
                }
                collaboration.openScript(script, username)
            } else if (oldCollaborators.length > 0 && newCollaborators.length === 0) {
                collaboration.closeScript(script.shareid, username)
            }
        }
        dispatch(scripts.syncToNgUserProject())
        close()
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body">
            <div className="modal-section-header">
                <i className="icon icon-users" style={{ color: "#6dfed4" }}></i>
                Add or Remove Collaborators
            </div>
            <UserListInput users={collaborators} setUsers={setCollaborators} setFinalize={f => finalize.current = f} />
        </div>
        <div className="modal-footer border-t-0">
            <MoreDetails {...{ licenses, licenseID, setLicenseID, description, setDescription }} />
            <div className="text-right" style={{ height: "3em", lineHeight: "3em" }}>
                <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
                <input type="submit" value="SAVE" className="btn btn-primary text-white" />
            </div>
        </div>
    </form>
}

const EmbedTab = ({ script, licenses, licenseID, setLicenseID, description, setDescription, save, close }: TabParameters) => {
    const sharelink = location.origin + location.pathname +"?sharing=" + script.shareid
    const [showCode, setShowCode] = useState(true)
    const [showDAW, setShowDAW] = useState(true)
    const options = "" + (showCode ? "" : "&hideCode") + (showDAW ? "" : "&hideDaw")
    const height = (showCode || showDAW) ? 400 : 54
    const code = `<iframe width="600" height="${height}" src="${sharelink}&embedded=true${options}"></iframe>`
    const codeElement = useRef<HTMLTextAreaElement>(null)

    return <form onSubmit={e => { e.preventDefault(); save(); close() }}>
        <div className="modal-body">
            <div>
                <div className="modal-section-header">
                    <span>
                        <i className="icon icon-copy" style={{ color: "#6dfed4" }}></i>
                        Embeddable IFrame code
                    </span>
                    <label className="mr-3">Show Code: <input type="checkbox" checked={showCode} onChange={e => setShowCode(e.target.checked)} /></label>
                    <label className="mr-3">Show DAW: <input type="checkbox" checked={showDAW} onChange={e => setShowDAW(e.target.checked)} /></label>
                 </div>
                <div id="share-link-container" className="mt-5">
                    <textarea ref={codeElement} className="share-link outline-none resize-none w-full" value={code} readOnly />
                    <span onClick={() => { codeElement.current?.select(); document.execCommand("copy") }} className="copy-share-link" title="Copy to clipboard">
                        <i className="icon icon-paste4"></i>
                    </span>
                </div>
                <hr className="mt-3" />
            </div>
        </div>
        <div className="modal-footer border-t-0">
            <MoreDetails {...{ licenses, licenseID, setLicenseID, description, setDescription }} />
            <div className="text-right" style={{ height: "3em", lineHeight: "3em" }}>
                <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
                <input type="submit" value="SAVE" className="btn btn-primary text-white" />
            </div>
        </div>
    </form>
}

const SoundCloudTab = ({ script, licenses, licenseID, setLicenseID, description, setDescription, save, close }: TabParameters) => {
    const ACCESS_OPTIONS = [
        { sharing: "private", downloadable: true, description: "Private. Only visible to me." },
        { sharing: "public", downloadable: true, description: "Public. Others can download and stream." },
        { sharing: "public", downloadable: false, description: "Public. Others can only stream." },
    ]
    const [name, setName] = useState(script.name)
    const [access, setAccess] = useState(1)
    const sharelink = location.origin + location.pathname +"?sharing=" + script.shareid
    const license = licenses[licenseID].license

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
        const { t } = useTranslation()
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
        sc.description += t('messages:idecontroller.soundcloud.description') + "\n\n"
        sc.description += "-------------------------------------------------------------\n\n"
        sc.description += t('messages:idecontroller.soundcloud.code') + "\n\n" + script.source_code + "\n\n"
        sc.description += "-------------------------------------------------------------\n\n"
        sc.description += t('messages:idecontroller.soundcloud.share') + " " + sharelink + "\n\n"
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

        exporter.soundcloud(script, false, sc).then(url => {
            setURL(url)
            clearInterval(animation)        
            setMessage("Finished uploading!")
            reporter.share("soundcloud", license)
        }).catch(function (err) {
            userNotification.show("Error exporting to SoundCloud.", "failure1")
            console.log(err)
        })
    }

    return <form onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="modal-body">
            <div className="modal-section-header">
                <span>
                    <i className="icon icon-soundcloud" style={{ color: "#6dfed4" }}></i>
                    Song Name
                </span>
            </div>
            <input required type="text" className="form-control border-0" placeholder="Click here to start typing..." value={name} onChange={e => setName(e.target.value)} autoFocus />

            <div className="modal-section-header">
                <span>What can others do with your song on SoundCloud?</span>
            </div>
            <div className="container">
                <div className="row mt-5 justify-between flex">
                    {ACCESS_OPTIONS.map(({ description }, index) =>
                    <div key={index} style={{ color: "#8c8c8c" }} className="radio-inline">
                        <label>
                            <input type="radio" name="useraccess" value={index} checked={index === access} onChange={e => { if (e.target.checked) setAccess(index) }} />
                            <span />{description}
                        </label>
                    </div>)}
                </div>
            </div>
        </div>
        <div className="modal-footer border-t-0">
            <MoreDetails {...{ licenses, licenseID, setLicenseID, description, setDescription }} />

            {message && <div className="text-center" style={{ height: "3em", lineHeight: "3em", textAlign: "center", backgroundColor: "rgb(170,255,255,0.5)" }}>
                {message.startsWith("UPLOADING") && <i className="spinner icon icon-spinner"></i>} {message}
            </div>}

            <div className="text-right" style={{ height: "3em", lineHeight: "3em" }}>
                <input type="button" value="CANCEL" onClick={close} className="btn btn-default" style={{ color: "#d04f4d", marginRight: "14px" }} />
                <input type="submit" value={url ? "VIEW ON SOUNDCLOUD" : "UPLOAD"} className="btn btn-primary text-white" />
            </div>
        </div>
    </form>
}

const MoreDetails = ({ licenses, licenseID, setLicenseID, description, setDescription }:
    { licenses: { [key: string]: any }, licenseID: string, setLicenseID: (id: string) => void, description: string, setDescription: (ds: string) => void }
) => {
    const [collapsed, setCollapsed] = useState(true)
    const licenseLink = "https://creativecommons.org/licenses/" + licenses[licenseID].license.split(" ")[1].toLowerCase() + "/4.0"

    return <div className="panel panel-default">
        <div  className="panel-heading">
            <h4 className="panel-title">
                <a role="button" className="accordion-toggle" onClick={() => setCollapsed(!collapsed)}><span>More Details (Description, License)...</span></a>
            </h4>
        </div>
        {!collapsed
        && <div className="panel-body">
            <div className="form-group text-left">
                <div className="modal-section-header">
                    <span>Description (optional)</span>
                </div>
                <textarea className="form-control border-0" rows={2} placeholder="Click here to start typing..." value={description} onChange={e => setDescription(e.target.value)} maxLength={500}></textarea>
            </div>

            <div className="text-left">
                <div className="modal-section-header">
                    <span>License Type</span>
                </div>

                <div className="container" id="share-licenses-container">
                    <div className="row mt-6 flex">
                        {Object.entries(licenses).map(([id, license]: any) =>
                        <div key={id} style={{ color: "#8c8c8c" }} className="radio-inline p-0 flex-grow">
                            <label>
                                <input type="radio" name="optradio" value={id} checked={id === licenseID} onChange={e => { if (e.target.checked) setLicenseID(id) }} />
                                <span></span>{license.license}
                            </label>
                        </div>)}
                    </div>
                </div>

                <div className="description my-3 p-3">
                    {licenses[licenseID].licenseDesc} Click <a href={licenseLink} target="_blank">here</a> to see more.
                </div>
            </div>
        </div>}
    </div>
}

const Tabs = [
    { component: LinkTab, title: "LET OTHERS VIEW", descriptionKey: 'messages:shareScript.menuDescriptions.viewOnly' },
    { component: CollaborationTab, title: "LET OTHERS EDIT", descriptionKey: 'messages:shareScript.menuDescriptions.collaboration' },
    { component: EmbedTab, title: "SHARE AN EMBEDDED SCRIPT", descriptionKey: 'messages:shareScript.menuDescriptions.embedded' },
    { component: SoundCloudTab, title: "SHARE ON SOUNDCLOUD", descriptionKey: 'messages:shareScript.menuDescriptions.soundCloud' },
]

export const ScriptShare = ({ script, licenses, close }: any) => {
    const [activeTab, setActiveTab] = useState(0)
    const [description, setDescription] = useState(script.description)
    const [licenseID, setLicenseID] = useState(script.license_id || "1")
    const { t } = useTranslation()

    const save = () => {
        userProject.setScriptDesc(script.name, script.shareid, description)
        userProject.setLicense(script.name, script.shareid, licenseID)
    }

    const ShareBody = Tabs[activeTab].component
    return <div className="share-script">
        <div className="modal-header">
            <h4 className="modal-title">
                <i className="icon icon-share2 mr-3"></i>Share "{script.name}"
            </h4>
            <hr className="my-4 border-gray-200" />
            <div className="es-modal-tabcontainer">
                <ul className="nav-pills flex flex-row">
                    {Tabs.map(({ title }, index) =>
                    <li key={index} className={"uib-tab nav-item flex-grow" + (activeTab === index ? " active" : "")}>
                        <a onClick={() => setActiveTab(index)} className="nav-link h-full flex justify-center items-center">{title}</a>
                    </li>)}
                </ul>
            </div>
            <div className="text-center mt-4">{t(Tabs[activeTab].descriptionKey)}</div>
        </div>
        <Provider store={store}>
            <ShareBody {...{script, licenses, licenseID, setLicenseID, description, setDescription, save, close}} />
        </Provider>
    </div>
}