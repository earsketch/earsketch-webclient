import React, { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Collapsed } from "../browser/Utils"

import * as cai from "./caiState"
import * as caiThunks from "./caiThunks"
import * as dialogue from "./dialogue"
import * as student from "./student"
import * as tabs from "../ide/tabState"
import * as appState from "../app/appState"
import * as ESUtils from "../esutils"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import * as sounds from "../browser/soundsState"
import { previewSound } from "../browser/soundsThunks"

import { useTranslation } from "react-i18next"
import * as editor from "../ide/Editor"
import store from "../reducers"
import * as user from "../user/userState"

export const CaiHeader = () => {
    const activeProject = useSelector(cai.selectActiveProject)

    return (
        <div id="chat-header">
            <div id="chatroom-title">
                <div>
                    Talk {FLAGS.SHOW_CAI && "to CAI"} about {" "}
                    {(activeProject && activeProject.length > 0)
                        ? <span id="chat-script-name">{activeProject}</span>
                        : <span>a project, when one is open</span>}
                    .
                </div>
            </div>
        </div>
    )
}

export const SoundPreviewContent = (name: string) => {
    const theme = useSelector(appState.selectColorTheme)
    const previewNode = useSelector(sounds.selectPreviewNode)
    const previewFileName = useSelector(sounds.selectPreviewName)
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const wizardMode = cai.selectWizard(store.getState())

    return (
        <div style={{ display: "inline" }}>
            <div className={`flex grow truncate left-justify py-2 lightgray border ${theme === "light" ? "border-gray-300" : "border-gray-700"}`}>
                <div className="pl-2 pr-4 h-1">
                    <button
                        className="btn btn-xs btn-action"
                        onClick={e => { e.preventDefault(); dispatch(previewSound(name)); student.addUIClick("sound - preview") }}
                        title={t("soundBrowser.clip.tooltip.previewSound")}
                    >
                        {previewFileName === name
                            ? (previewNode ? <i className="icon icon-stop2" /> : <i className="animate-spin es-spinner" />)
                            : <i className="icon icon-play4" />}
                    </button>
                    {tabsOpen && !wizardMode &&
                        (
                            <button
                                className="btn btn-xs btn-action"
                                onClick={() => { editor.pasteCode(name); student.addUIClick("sound - copy") }}
                                title={t("soundBrowser.clip.tooltip.paste")}
                            >
                                <i className="icon icon-paste2" />
                            </button>
                        )}
                </div>
                <span id="text" className="chat-message-text truncate pl-5">{name}</span>
            </div>
        </div>
    )
}

const CAIMessageView = (message: cai.CAIMessage) => {
    const dispatch = useDispatch()
    const userName = useSelector(user.selectUserName)

    const wholeMessage = (message: cai.CAIMessage) => {
        return message.text.map((phrase: [string, string], index) => {
            switch (phrase[0]) {
                case "plaintext":
                    return <span key={index}> {phrase[1][0]} </span>
                case "LINK":
                    return <a key={index} href="#" onClick={e => { e.preventDefault(); dispatch(caiThunks.openCurriculum(phrase[1][1])); dialogue.addToNodeHistory(["curriculum", phrase[1][1]]) }} style={{ color: "blue" }}>{phrase[1][0]}</a>
                case "sound_rec":
                    return <span key={index}> {SoundPreviewContent(phrase[1][0])} </span>
                default:
                    return <span key={index}> error </span>
            }
        })
    }

    return (
        <div className="chat-message" style={{ color: "black" }}>
            <div className="chat-message-bubble" style={{
                maxWidth: "80%",
                float: message.sender === userName ? "left" : "right",
                backgroundColor: message.sender === userName ? "darkgray" : "lightgray",
            }}>
                <div className="chat-message-sender">{message.sender}</div>
                <div id="text" className="chat-message-text">
                    {wholeMessage(message)}
                </div>
            </div>
            <div className="chat-message-date" style={{ float: message.sender === userName ? "left" : "right" }}>
                {ESUtils.formatTime(Date.now() - message.date)}
            </div>
        </div>
    )
}

export const CaiBody = () => {
    const activeProject = useSelector(cai.selectActiveProject)
    const messageList = useSelector(cai.selectMessageList)

    return (
        <div id="cai-body">
            <div>
                <video src="https://earsketch.gatech.edu/videoMedia/cai_denoise.mp4" controls style={{ width: "100%", maxWidth: "webkit-fill-available" }}></video>
            </div>
            <div className="chat-message-container text-sm">
                <ul>
                    {messageList[activeProject] &&
                    Object.values(messageList[activeProject]).map((message: cai.CAIMessage, idx) =>
                        <li key={idx}>
                            <CAIMessageView {...message} />
                        </li>)}
                </ul>
            </div>
        </div>
    )
}

const CaiInputButtons = (inputOptions: cai.CAIButton[]) => {
    const dispatch = useDispatch()

    return <ul>
        {Object.entries(inputOptions).map(([inputIdx, input]: [string, cai.CAIButton]) =>
            <li key={inputIdx}>
                <button type="button" className="btn btn-cai" onClick={() => dispatch(caiThunks.sendCAIMessage(input))}
                    style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
                    {input.label}
                </button>
            </li>)}
    </ul>
}

const CaiFooter = () => {
    const dispatch = useDispatch()
    const inputOptions = useSelector(cai.selectInputOptions)
    const errorOptions = useSelector(cai.selectErrorOptions)
    const dropupLabel = useSelector(cai.selectDropupLabel)

    return (
        <div id="chat-footer" style={{ marginTop: "auto", display: "block" }}>
            <div style={{ flex: "auto" }}>
                {!dropupLabel.length
                    ? <CaiInputButtons {...inputOptions}/>
                    : <div className="dropup-cai" style={{ width: "100%" }}>
                        <button className="dropbtn-cai" style={{ marginLeft: "auto", display: "block", marginRight: "auto" }}>
                            {dropupLabel}
                        </button>
                        <div className="dropup-cai-content" style={{ left: "50%", maxHeight: "fit-content" }}>
                            <ul>
                                {Object.entries(inputOptions).map(([inputIdx, input]: [string, cai.CAIButton]) =>
                                    <li key={inputIdx}>
                                        <option onClick={() => dispatch(caiThunks.sendCAIMessage(input))}>{input.label}</option>
                                    </li>)}
                            </ul>
                        </div>
                    </div>}
            </div>
            <div style={{ flex: "auto" }}>
                {errorOptions.length > 0 &&
                <CaiInputButtons {...errorOptions}/>}
            </div>
        </div>
    )
}

export const CAI = () => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const activeScript = useSelector(tabs.selectActiveTabScript)?.name
    const curriculumLocation = useSelector(curriculum.selectCurrentLocation)
    const curriculumPage = useSelector(curriculum.selectPageTitle)
    const showCAI = useSelector(layout.selectEastKind) === "CAI"

    useEffect(() => {
        dispatch(caiThunks.caiSwapTab(activeScript || ""))
    }, [activeScript])

    useEffect(() => {
        dispatch(caiThunks.curriculumPage([curriculumLocation, curriculumPage]))
    }, [curriculumPage])

    useEffect(() => {
        if (showCAI) {
            dispatch(caiThunks.closeCurriculum())
        }
    }, [showCAI])

    return paneIsOpen
        ? (
            <div className={`font-sans h-full flex flex-col ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}>
                <CaiHeader />
                <CaiBody />
                <CaiFooter />
            </div>
        )
        : <Collapsed title="CAI" position="east" />
}

if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT) {
    // TODO: Moved out of userProject, should probably go in a useEffect.
    window.onfocus = () => student.addOnPageStatus(1)
    window.onblur = () => student.addOnPageStatus(0)

    window.addEventListener("load", () => {
        student.addPageLoad(1)
    })

    window.addEventListener("beforeunload", () => {
        // the absence of a returnValue property on the event will guarantee the browser unload happens
        student.addPageLoad(0)
    })

    let mouseX: number | undefined, mouseY: number | undefined

    window.addEventListener("mousemove", e => {
        mouseX = e.x
        mouseY = e.y
    })

    document.addEventListener("copy" || "cut", e => {
        dialogue.addToNodeHistory([e.type, e.clipboardData!.getData("Text")])
    })

    window.addEventListener("paste", e => {
        dialogue.addToNodeHistory([e.type, []])
    })

    window.setInterval(() => {
        if (mouseX && mouseY) {
            student.studentModel.preferences.mousePos.push({ x: mouseX, y: mouseY })
        }
    }, 5000)

    window.addEventListener("copy", () => {
        dialogue.addToNodeHistory(["copy", []])
    })

    window.addEventListener("cut", () => {
        dialogue.addToNodeHistory(["cut", []])
    })

    window.addEventListener("paste", () => {
        dialogue.addToNodeHistory(["paste", []])
    })
}
