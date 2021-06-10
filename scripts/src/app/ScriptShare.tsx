import React, { useState } from "react"
import { Provider, useDispatch, useSelector } from "react-redux"

import * as collaboration from "./collaboration"
import esconsole from "../esconsole"
import ESMessages from "../data/messages"
import * as ESUtils from "../esutils"
import * as exporter from "./exporter"
import * as helpers from "../helpers"
import reporter from "./reporter"
import * as scripts from "../browser/scriptsState"
import * as tabs from "../editor/tabState"
import * as userNotification from "./userNotification"
import * as userProject from "./userProject"
import { ScriptEntity } from "common"
import * as app from "./appState"
import store from "../reducers"

// stuff for view-only and collaborative share
// param "which" is either "viewers" or "collaborators"
function processQueryInput($event: any, which: any) {
    if ($event.keyCode === 13) {
        queryId(which); // asynchronous
    } else if ($event.keyCode === 8) {
        // delete key removes list item
        if (which.query === "") {
            which.list.pop()
            checkAllForErrors(which)
            checkIfReady(which)
        }
    } else if ($event.keyCode === 32) {
        queryId(which)
    }
}

interface User {
    id: string
    exists: boolean
}

function queryId(which: any) {
        which.query = which.query.toLowerCase()

    if (which.query === "") {
        return null
    } else if (which.query.replace(/\s+/, "").length === 0) {
        return null
    }

    if (ESUtils.checkIllegalCharacters(which.query)) {
        showErrorMessage(ESMessages.general.illegalCharacterInUserID, which)
        return null
    }

    // #1858
    if (which.query === userProject.getUsername().toLowerCase()) {
        showErrorMessage("You cannot share scripts with yourself!", which)
        return null
    }

    var url = URL_DOMAIN + "/services/scripts/searchuser"
    var opts = { params: {"query": which.query} }
    helpers.getNgService("$http").get(url, opts)
        .then(function(result: any) {
            if (result.data.hasOwnProperty("created")) {
                clearErrors(which)

                // Fix letter cases if they are not all-lower-cases.
                which.query = result.data.username

                which.list.push({
                    id: which.query,
                    exists: true
                })

                checkQueryDuplicates(which)
                which.query = ""

                checkIfReady(which)
            } else {
                showErrorMessage("That user ID does not exist.", which)

                which.list.push({
                    id: which.query,
                    exists: false
                })
                which.query = ""
            }
            return result.data
        }, function(err: any) {
            esconsole(err, ["DEBUG","ERROR"])
        })
}

function checkAllForErrors(which: any) {
    clearErrors(which)

    if (!which.list.every((p: any) => p.exists)) {
        showErrorMessage("There might be invalid IDs in the list.", which)
        return null
    }
    checkQueryDuplicates(which)
}

function checkQueryDuplicates(which: any) {
    // #1858
    const unique = new Set(which.list.map((p: User) => p.id.toLowerCase()))
    if (unique.size !== which.list.length) {
        showErrorMessage("There might be duplicate IDs in the list.", which)
    }
}

function showErrorMessage(message: string, which: any) {
    which.hasError = true
    which.errorMessage = message
    which.ready = false
}

function clearErrors(which: any) {
    which.hasError = false
    which.errorMessage = ""
    which.ready = false
}

function checkIfReady(which: any) {
    which.ready = which.list.length > 0 && !which.hasError
}

function removeId(index: number, which: any) {
    which.list.splice(index, 1)
    checkAllForErrors(which)
}

export const LinkTab = ({ script, licenses, licenseID, setLicenseID, description, setDescription, save, close }: any) => {
    const [lockedShareID, setLockedShareID] = useState("")
    const [showLockedShareLink, setShowLockedShareLink] = useState(false)

    const sharelink = location.origin + location.pathname +"?sharing=" + script.shareid
    const lockedShareLink = location.origin + location.pathname +"?sharing=" + lockedShareID

    userProject.getLockedSharedScriptId(script.shareid).then(setLockedShareID)
    // const [viewers, setViewers] = useState({
    //     list: [] as User[],
    //     query: "", // current input value
    //     hasError: false, // for all list items
    //     errorMessage: "",
    //     ready: false // ready to share
    // })

    const downloadShareUrl = () => {
        const url = showLockedShareLink ? lockedShareLink : sharelink
        const textContent = "[InternetShortcut]\n" + "URL=" + url + "\n" + "IconIndex=0"
        // This is an "interesting" use of exporter.text().
        exporter.text({
            name: script.name + ".url",
            source_code: textContent
        } as ScriptEntity)
    }

    // const sendViewOnlyScript = function () {
    //     if (viewers.hasError) return
    //     save()

    //     if (viewers.ready) {
    //         // reporter.share("link", $scope.licenses[$scope.selectedLicenseId].license)
    //         if (showLockedShareLink) {
    //             userProject.shareWithPeople(lockedShareID, viewers.list)
    //         } else {
    //             userProject.shareWithPeople(script.shareid, viewers.list)
    //         }
    //         userNotification.show("Shared " + script.name + " as view-only with " + viewers.list.map(user => user.id).join(", "))
    //         close()
    //     } else {
    //         if (viewers.query.length) {
    //             alert(ESMessages.shareScript.preemptiveSave)
    //         } else {
    //             close()
    //         }
    //     }
    // }

    return <>
        <div className="modal-body">
            <div>
                <div className="modal-section-header">
                    <span>
                        <i className="icon icon-copy" style={{ color: "#6dfed4" }}></i>
                        Sharable View-only Link
                    </span>
                    {/* TODO: Deal with this dropdown */}
                    <div className="btn-group" auto-close="outsideClick">
                        <button type="button" className="btn btn-filter dropdown-toggle">
                            <span>
                            {showLockedShareLink
                            ? "SHARE ONLY CURRENT VERSION"
                            : "SHARE FUTURE CHANGES"}
                            </span>
                            <span className="caret"></span>
                        </button>
                        <ul className="dropdown-menu" role="menu">
                            <li>
                                <a href="#" onClick={() => setShowLockedShareLink(!showLockedShareLink)}>
                                    <div>
                                        <div>
                                            <span>
                                                {showLockedShareLink
                                                ? "SHARE FUTURE CHANGES"
                                                : "SHARE ONLY CURRENT VERSION"}
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div id="share-link-container" style={{ marginTop: "15px" }}>
                    <div className="share-link">
                        <span ng-show="!showLockedShareLink">{sharelink}</span>
                        <span ng-hide="!showLockedShareLink">{lockedShareLink}</span>
                    </div>
                    <div>
                        <span className="download-share-url" onClick={downloadShareUrl}><i className="glyphicon glyphicon-download-alt" uib-tooltip="Download URL shortcut file" tooltip-placement="bottom" tooltip-append-to-body="true"></i></span>
                        {/* TODO: Clipboard directive: sharelink or lockedShareLink */}
                        <span className="copy-share-link" uib-popover="Copied!" popover-placement="top-right" popover-animation="true" popover-trigger="outsideClick"><i className="icon icon-paste4" uib-tooltip="Copy To Clipboard" tooltip-placement="bottom" tooltip-append-to-body="true"></i></span>
                    </div>
                </div>
                <hr className="mt-3" />

                {/* <div>
                    <div className="modal-section-header">
                        <span>
                            <i className="icon icon-copy" style={{ color: "#6dfed4" }}></i>
                            Send View-only Script to Other Users
                        </span>
                    </div>
                    <div className="mt-5 flex justify-between">
                        <form>
                            {viewers.list.map((p: any, index) =>
                            <div key={index} className="share-people-chip" ng-repeat="p in viewers.list track by $index">
                                <span className="mr-1" style={{ color: p.exists ? pillFontColor : "red" }}>{p.id}</span>
                                <span className="cursor-pointer" onClick={() => removeId(index, viewers)} style={{ color: "#c25452" }}>X</span>
                            </div>)}
                            <input className="bg-transparent border-none outline-none flex-grow" ng-model="viewers.query" style={{ width: "24em" }} placeholder="Type user ID, then hit enter." ng-keydown="processQueryInput($event, "viewers")" ng-blur="queryId("viewers")" autoFocus />
                        </form>
                    </div>
                    <hr className="mt-3" />
                    <div ng-show="viewers.hasError" className="share-people-error">{viewers.errorMessage}</div>
                </div> */}
            </div>
        </div>
        <div className="modal-footer border-t-0">
            <MoreDetails {...{ script, licenses, licenseID, setLicenseID, description, setDescription }} />
            <div className="text-right" style={{ height: "3em", lineHeight: "3em" }}>
                <span onClick={close}><a href="#" style={{ color: "#d04f4d", marginRight: "14px" }}><i className="icon icon-cross2"></i>CANCEL</a></span>
                {/* <span onClick={sendViewOnlyScript}><a href="#" style={!viewers.hasError ? { color: "#76aaff" } : { color: "#777", cursor: "pointer" }}><i className="icon icon-checkmark"></i>SAVE{viewers.ready ? " and SEND" : ""}</a></span> */}
            </div>
        </div>
    </>
}

const CollaborationTab = ({ script, licenses, licenseID, setLicenseID, description, setDescription }: any) => {
    const dispatch = useDispatch()
    const activeTabID = useSelector(tabs.selectActiveTabID)
    const theme = useSelector(app.selectColorTheme)
    const pillFontColor = theme === "dark" ? "white" : "black"

    const [collaborators, setCollaborators] = useState({
        list: [] as User[],
        query: "", // current input value
        hasError: false, // for all list items
        errorMessage: "",
        ready: false // ready to share
    })

    const manageCollaborators = function () {
        if (collaborators.hasError) return
        var userName = userProject.getUsername()
        var existingUsersList = script.collaborators

        var newUsersList = collaborators.list.map(user => user.id)

        var added = newUsersList.filter(function (m) {
            return existingUsersList.indexOf(m) === -1
        })
        var removed = existingUsersList.filter((m: string) => !newUsersList.includes(m))

        // update the remote script state
        collaboration.addCollaborators(script.shareid, userName, added)
        collaboration.removeCollaborators(script.shareid, userName, removed)

        // update the local script state
        script.collaborators = newUsersList
        userProject.scripts[script.shareid] = script

        // save license info for the collaboration mode as well
        userProject.setLicense(script.name, script.shareid, licenseID)

        script.collaborators = newUsersList
        script.collaborative = newUsersList.length !== 0

        // manage the state of tab if already open
        if (activeTabID === script.shareid) {
            if (existingUsersList.length === 0 && newUsersList.length > 0) {
                if (!script.saved) {
                    userProject.saveScript(script.name, script.source_code)
                        .then(function () {
                            collaboration.openScript(script, userName)
                        })
                } else {
                    collaboration.openScript(script, userName)
                }
            } else if (existingUsersList.length > 0 && newUsersList.length === 0) {
                collaboration.closeScript(script.shareid, userName)
            }
        }

        if (collaborators.ready) {
            dispatch(scripts.syncToNgUserProject())
            close()
        } else {
            if (collaborators.query.length) {
                alert(ESMessages.shareScript.preemptiveSave)
            } else {
                dispatch(scripts.syncToNgUserProject())
                close()
            }
        }
    }

    // auto-filling the existing collaborators
    // TODO: Watch for mixed-case bugs #1858
    if (script.hasOwnProperty("collaborators")) {
        collaborators.list = script.collaborators.map((userID: string) => ({
            id: userID,
            exists: true
        }))
    }

    return <>
        <div className="modal-body">
            <div>
                <div className="modal-section-header">
                    <span>
                        <i className="icon icon-users" style={{ color: "#6dfed4" }}></i>
                        Add or Remove Collaborators
                    </span>
                </div>
                <div className="mt-5">
                    <form>
                        {collaborators.list.map((p: any, index: number) =>
                        <div key={index} className="share-people-chip">
                            <span className="mr-1" style={{ color: p.exists ? pillFontColor : "red" }}>{p.id}</span>
                            <span className="cursor-pointer" onClick={() => removeId(index, collaborators)} style={{ color: "#c25452" }}>X</span>
                        </div>)}
                        {/* #1858: TODO -- Existing collaborators are listed in all lowercase! */}
                        <input className="bg-transparent border-none outline-none flex-grow" ng-model="viewers.query" style={{ width: "24em" }} placeholder="Type user ID, then hit enter." onKeyDown={e => processQueryInput(e, collaborators)} onBlur={() => queryId(collaborators)} autoFocus />
                    </form>
                </div>
                <hr className="mt-3" />
                <div ng-show="collaborators.hasError" className="share-people-error">{collaborators.errorMessage}</div>
            </div>
        </div>
        <div className="modal-footer border-t-0">
            <MoreDetails {...{ script, licenses, licenseID, setLicenseID, description, setDescription }} />
            <div className="text-right" style={{ height: "3em", lineHeight: "3em" }}>
                <span onClick={close}><a href="#" style={{ color: "#d04f4d", marginRight: "14px" }}><i className="icon icon-cross2"></i>CANCEL</a></span>
                <span onClick={manageCollaborators}><a href="#" style={!collaborators.hasError ? { color: "#76aaff" } : { color: "#777", cursor: "pointer" }}><i className="icon icon-checkmark"></i>SAVE</a></span>
            </div>
        </div>
    </>
}

const EmbedTab = ({ script, licenses, licenseID, setLicenseID, description, setDescription, save, close }: any) => {
    const sharelink = location.origin + location.pathname +"?sharing=" + script.shareid
    const [showCode, setShowCode] = useState(true)
    const [showDAW, setShowDAW] = useState(true)
    const embeddingOption = "" + (showCode ? "&hideCode" : "") + (showDAW ? "&hideDaw" : "")
    const embedHeight = (showCode || showDAW) ? 400 : 54
    const embeddedIFrameCode = `<iframe width="600" height="${embedHeight}" src="${sharelink}&embedded=true${embeddingOption}"></iframe>`

    return <>
        <div className="modal-body">
            <div>
                <div className="modal-section-header">
                    <span>
                        <i className="icon icon-copy" style={{ color: "#6dfed4" }}></i>
                        Embeddable IFrame code
                    </span>
                    <form name="myForm" >
                        <label>Show Code: <input type="checkbox" checked={showCode} onChange={e => setShowCode(e.target.checked)} /></label>
                        <label>Show Daw: <input type="checkbox" checked={showDAW} onChange={e => setShowDAW(e.target.checked)} /></label>
                        </form>
                </div>
                <div id="share-link-container" className="mt-5">
                    <div className="share-link">
                        <span>{embeddedIFrameCode}</span>
                    </div>
                    <div>
                        {/* Replace clipboard directive */}
                        <span className="copy-share-link" uib-popover="Copied!" popover-placement="top-right" popover-animation="true" popover-trigger="outsideClick"><i className="icon icon-paste4" uib-tooltip="Copy To Clipboard" tooltip-placement="bottom" tooltip-append-to-body="true"></i></span>
                    </div>
                </div>
                <hr className="mt-3" />
            </div>
        </div>
        <div className="modal-footer border-t-0">
            <MoreDetails {...{ script, licenses, licenseID, setLicenseID, description, setDescription }} />
            <div className="text-right" style={{ height: "3em", lineHeight: "3em" }}>
                <span onClick={close}><a href="#" style={{ color: "#d04f4d", marginRight: "14px" }}><i className="icon icon-cross2"></i>CANCEL</a></span>
                <span onClick={() => { save(); close() }}><a href="#" style={{ color: "#76aaff" }}><i className="icon icon-checkmark"></i>SAVE</a></span>
            </div>
        </div>
    </>
}

const SoundCloudTab = ({ script, licenses, licenseID, setLicenseID, description, setDescription, save, close }: any) => {
    const sharelink = location.origin + location.pathname +"?sharing=" + script.shareid
    const license = licenses[licenseID]
    
    const shareSoundCloud = () => {
        if (!sc.uploaded) {
            if (sc.options.name === "") {
                sc.message.show = true
                sc.message.text = "The song name cannot be empty!"
                sc.message.color = "red"
            } else {
                sc.message.show = false
                sc.message.color = "transparent"
                shareToSoundCloud()
            }
        } else {
            window.open(sc.url, "_blank")?.focus()
            close()
        }
    }

    const sc = {
        options: {
            name: script.name,
            sharing: "public",
            downloadable: true,
            description,
            tags: "EarSketch",
            license: "cc-by"
        },
        uploaded: false,
        url: "",
        userAccess: [
            "Private. Only visible to me.",
            "Public. Others can download and stream.",
            "Public. Others can only stream."
        ],
        selectedUserAccess: 1,
        message: {
            show: false,
            spinner: false,
            text: "",
            color: "transparent",
            animation: null
        }
    }

    const shareToSoundCloud = () => {
        if (sc.selectedUserAccess === 0) {
            sc.options.sharing = "private"
            sc.options.downloadable = true
        } else if (sc.selectedUserAccess === 1) {
            sc.options.sharing = "public"
            sc.options.downloadable = true
        } else {
            sc.options.sharing = "public"
            sc.options.downloadable = false
        }

        save()

        if (description !== "") {
            sc.options.description = description + "\n\n"
            sc.options.description += "-------------------------------------------------------------\n\n"
        }

        sc.options.description += ESMessages.idecontroller.soundcloud.description + "\n\n"
        sc.options.description += "-------------------------------------------------------------\n\n"
        sc.options.description += ESMessages.idecontroller.soundcloud.code + "\n\n" + script.source_code + "\n\n"
        sc.options.description += "-------------------------------------------------------------\n\n"
        sc.options.description += ESMessages.idecontroller.soundcloud.share + " " + sharelink + "\n\n"
        sc.options.description += "-------------------------------------------------------------\n\n"

        sc.options.license = "cc-" + license.split(" ")[1].toLowerCase()

        exporter.soundcloud(script, false, sc).then(function () {
            sc.message.show = true
            sc.message.color = "rgb(170,255,255,0.5)"
            sc.message.spinner = true
            sc.message.text = "UPLOADING"
            // TODO(ijc): ?
            // sc.message.animation = setInterval(function () {
            //     var numDots = Math.floor(new Date().getTime() / 1000) % 5 + 1
            //     var dots = ""
            //     for (var i = 0; i < numDots; i++) {
            //         dots += "."
            //     }
            //     sc.message.text = "UPLOADING" + dots
            // }, 1000)

            reporter.share("soundcloud", license)
        }).catch(function (err) {
            userNotification.show("Error exporting to SoundCloud.", "failure1")
            console.log(err)
        })
    }

    return <>
        <div className="modal-body">
            <div className="modal-section-header">
                <span>
                    <i className="icon icon-soundcloud" style={{ color: "#6dfed4" }}></i>
                    Song Name
                </span>
            </div>
            <form role="form">
                <textarea className="form-control border-0" rows={1} placeholder="Click here to start typing..." ng-model="sc.options.name"></textarea>
            </form>
            <hr className="mt-0" />

            <div className="modal-section-header">
                <span>What can others do with your song on SoundCloud?</span>
            </div>
            <div className="container" id="sc-options-container">
                <div className="row my-3 justify-between flex">
                    {sc.userAccess.map((accessType, index) =>
                    <div key={index} style={{ color: "#8c8c8c" }} className="radio-inline mt-3">
                        <label>
                            <input type="radio" name="useraccess" ng-model="sc.selectedUserAccess" ng-value="$index"/>
                            <span></span>{accessType}
                        </label>
                    </div>)}
                </div>
            </div>
        </div>
        <div className="modal-footer border-t-0">
            <MoreDetails {...{ script, licenses, licenseID, setLicenseID, description, setDescription }} />

            <div ng-show="sc.message.show" className="text-center" style={{ height: "3em", lineHeight: "3em", textAlign: "center", backgroundColor: sc.message.color }}>
                <span ng-show="sc.message.spinner"><i className="spinner icon icon-spinner"></i></span> {sc.message.text}
            </div>

            <div className="text-right" style={{ height: "3em", lineHeight: "3em" }}>
                <span onClick={close}><a href="#" style={{ color: "#d04f4d", marginRight: "14px" }}><i className="icon icon-cross2"></i>CANCEL</a></span>
                <span onClick={shareSoundCloud}><a href="#"><i className="icon icon-checkmark"></i>UPLOAD</a></span>
            </div>
        </div>
    </>
}

const MoreDetails = ({ script, licenses, licenseID, setLicenseID, description, setDescription }: any) => {
    const [collapsed, setCollapsed] = useState(true)

    const getLicenseLink = function (id: string) {
        var name = licenses[id].license
        var link = "https://creativecommons.org/licenses/"
        var type = name.split(" ")[1]

        if (type !== undefined) {
            link = link + type.toLowerCase() + "/4.0"
        }

        return link
    }

    return <div className="panel panel-default"> {/* TODO: Expand/collabse, heading. ("More Details (Description, License)...") */}
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
                <form role="form">
                    <textarea className="form-control border-0" rows={2} placeholder="Click here to start typing..." value={description} onChange={e => setDescription(e.target.value)} maxLength={500}></textarea>
                </form>
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
                    {licenses[licenseID].licenseDesc} Click <a href={getLicenseLink(licenseID)} target="_blank">here</a> to see more.
                </div>
            </div>
        </div>}
    </div>
}

const Tabs = [
    { component: LinkTab, title: "LET OTHERS VIEW", description: ESMessages.shareScript.menuDescriptions.viewOnly },
    { component: CollaborationTab, title: "LET OTHERS EDIT", description: ESMessages.shareScript.menuDescriptions.collaboration },
    { component: EmbedTab, title: "SHARE AN EMBEDDED SCRIPT", description: ESMessages.shareScript.menuDescriptions.embedded },
    { component: SoundCloudTab, title: "SHARE ON SOUNDCLOUD", description: ESMessages.shareScript.menuDescriptions.soundCloud },
]

export const ScriptShare = ({ script, licenses, close }: any) => {
    const [activeTab, setActiveTab] = useState(0)
    const [description, setDescription] = useState(script.description)
    const [licenseID, setLicenseID] = useState(script.license_id || "1")

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
            <div className="text-center mt-4">{Tabs[activeTab].description}</div>
        </div>
        {/* TODO: Move to wrapModal */}
        <Provider store={store}><ShareBody {...{script, licenses, licenseID, setLicenseID, description, setDescription, save, close}} /></Provider>
    </div>
}