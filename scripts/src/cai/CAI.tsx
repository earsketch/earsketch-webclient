import React, { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Collapsed } from "../browser/Browser"

import * as cai from "./caiState"
import * as caiDialogue from "./dialogue"
import * as caiStudentPreferences from "./studentPreferences"
import * as tabs from "../ide/tabState"
import * as appState from "../app/appState"
import * as ESUtils from "../esutils"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import * as sounds from "../browser/soundsState"


export const CaiHeader = () => {
    const activeProject = useSelector(cai.selectActiveProject)

    return (
        <div id="chat-header">
            <div id="chatroom-title">
                <div>
                    Talk to CAI about { }
                    {(activeProject && activeProject.length > 0)
                        ? <span id="chat-script-name">{activeProject}</span>
                        : <span>a project, when one is open</span>}
                    .
                </div>
            </div>
        </div>
    )
}

const CAIMessageView = (message: cai.CAIMessage) => {
    const dispatch = useDispatch()

    return (
        <div className="chat-message" style={{ color: "black" }}>
            <div className="chat-message-bubble" style={{
                maxWidth: "80%",
                float: message.sender !== "CAI" ? "left" : "right",
                backgroundColor: message.sender !== "CAI" ? "darkgray" : "lightgray",
            }}>
                <div className="chat-message-sender">{message.sender}</div>
                <div id="text" className="chat-message-text">
                    {message.text[0]}
                    {message.keyword.map((phrase, index) => (
                        [
                        <a href="#" onClick={e => { e.preventDefault(); dispatch(cai.openCurriculum([message, index])) }} style={{ color: "blue" }}>{message.keyword[index][0]}</a>,
                        message.text[index+1]
                        ]
                    ))}
                     {message.recs.map((rec,index) => (
                        <button
                        className="btn btn-xs btn-action"
                        onClick={() => {dispatch(sounds.previewSound(rec)); }}
                            > {rec}
                        </button>
                ))}
                </div>
               
                
            </div>
            <div className="chat-message-date" style={{ float: message.sender !== "CAI" ? "left" : "right" }}>
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
            <div className="chat-message-container">
                <ul>
                    {messageList[activeProject] &&
                    Object.entries(messageList[activeProject]).map(([idx, message]: [string, cai.CAIMessage]) =>
                        <li key={idx}>
                            <CAIMessageView {...message} />
                        </li>)}
                </ul>
            </div>
        </div>
    )
}

const CaiFooter = () => {
    const dispatch = useDispatch()
    const inputOptions = useSelector(cai.selectInputOptions)
    const errorOptions = useSelector(cai.selectErrorOptions)
    const dropupLabel = useSelector(cai.selectDropupLabel)
    const buttonLimit = 6

    return (
        <div id="chat-footer" style={{ marginTop: "auto", display: "block" }}>
            <div style={{ flex: "auto" }}>
                {inputOptions.length < buttonLimit
                    ? <ul>
                        {Object.entries(inputOptions).map(([inputIdx, input]: [string, cai.CAIButton]) =>
                            <li key={inputIdx}>
                                <button type="button" className="btn btn-cai" onClick={() => dispatch(cai.sendCAIMessage(input))} style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
                                    {input.label}
                                </button>
                            </li>)}
                    </ul>
                    : <div className="dropup-cai" style={{ width: "100%" }}>
                        <button className="dropbtn-cai" style={{ marginLeft: "auto", display: "block", marginRight: "auto" }}>
                            {dropupLabel}
                        </button>
                        <div className="dropup-cai-content" style={{ left: "50%", height: "fit-content" }}>
                            <ul>
                                {Object.entries(inputOptions).map(([inputIdx, input]: [string, cai.CAIButton]) =>
                                    <li key={inputIdx}>
                                        <option onClick={() => dispatch(cai.sendCAIMessage(input))}>{input.label}</option>
                                    </li>)}
                            </ul>
                        </div>
                    </div>}
            </div>
            <div style={{ flex: "auto" }}>
                <ul>
                    {errorOptions.length > 0 &&
                    Object.entries(errorOptions).map(([errIdx, input]: [string, cai.CAIButton]) =>
                        <li key={errIdx}>
                            <button type="button" className="btn btn-cai" onClick={() => dispatch(cai.sendCAIMessage(input))} style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
                                {input.label}
                            </button>
                        </li>)}
                </ul>
            </div>
        </div>
    )
}

export const CAI = () => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const activeScript = useSelector(tabs.selectActiveTabScript)
    const curriculumLocation = useSelector(curriculum.selectCurrentLocation)

    useEffect(() => {
        dispatch(cai.caiSwapTab(activeScript ? activeScript.name : ""))
        dispatch(cai.curriculumPage(curriculumLocation))
    })

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

if (FLAGS.SHOW_CAI) {
    // TODO: Moved out of userProject, should probably go in a useEffect.
    window.onfocus = () => caiStudentPreferences.addOnPageStatus(1)
    window.onblur = () => caiStudentPreferences.addOnPageStatus(0)

    window.addEventListener("load", () => {
        caiStudentPreferences.addPageLoad(1)
    })

    window.addEventListener("beforeunload", () => {
        // the absence of a returnValue property on the event will guarantee the browser unload happens
        caiStudentPreferences.addPageLoad(0)
    })

    let mouseX: number | undefined, mouseY: number | undefined

    window.addEventListener("mousemove", e => {
        mouseX = e.x
        mouseY = e.y
    })

    document.addEventListener("copy" || "cut", e => {
        caiDialogue.addToNodeHistory([e.type, e.clipboardData!.getData("Text")])
    })

    window.addEventListener("paste", e => {
        caiDialogue.addToNodeHistory([e.type, []])
    })

    window.setInterval(() => {
        if (mouseX && mouseY) {
            caiStudentPreferences.addMousePos({ x: mouseX, y: mouseY })
        }
    }, 5000)

    window.addEventListener("keydown", e => {
        e = e || window.event // IE support
        const c = e.key
        const ctrlDown = e.ctrlKey || e.metaKey // Mac support

        // Check for Alt+Gr (http://en.wikipedia.org/wiki/AltGr_key)
        if (ctrlDown) {
            if (e.altKey) {
                caiDialogue.addToNodeHistory(["other", []])
            } else {
                switch (c) {
                    case "c":
                        caiDialogue.addToNodeHistory(["copy", []])
                        break
                    case "x":
                        caiDialogue.addToNodeHistory(["cut", []])
                        break
                    case "v":
                        caiDialogue.addToNodeHistory(["paste", []])
                        break
                }
            }
        } else {
            caiDialogue.addToNodeHistory(["keydown", [c]])
        }
    })
}
