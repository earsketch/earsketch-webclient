import React, { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Collapsed } from "../browser/Browser"

import * as cai from "./caiState"
import * as tabs from "../ide/tabState"
import * as appState from "../app/appState"
import * as ESUtils from "../esutils"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import store from "../reducers"

const CaiHeader = () => {
    const activeProject = useSelector(cai.selectActiveProject)

    return (
        <div id="chat-header">
            <div id="chatroom-title">
                <div>
                    Talk to CAI about {}
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
                    {/* TODO: Refactor using map. */}
                    {message.text[0]}
                    <a href="#" onClick={e => { e.preventDefault(); dispatch(cai.openCurriculum([message, 0])) }} style={{ color: "blue" }}>{message.keyword[0][0]}</a>
                    {message.text[1]}
                    <a href="#" onClick={e => { e.preventDefault(); dispatch(cai.openCurriculum([message, 1])) }} style={{ color: "blue" }}>{message.keyword[1][0]}</a>
                    {message.text[2]}
                    <a href="#" onClick={e => { e.preventDefault(); dispatch(cai.openCurriculum([message, 2])) }} style={{ color: "blue" }}>{message.keyword[2][0]}</a>
                    {message.text[3]}
                    <a href="#" onClick={e => { e.preventDefault(); dispatch(cai.openCurriculum([message, 3])) }} style={{ color: "blue" }}>{message.keyword[3][0]}</a>
                    {message.text[4]}
                    <a href="#" onClick={e => { e.preventDefault(); dispatch(cai.openCurriculum([message, 4])) }} style={{ color: "blue" }}>{message.keyword[4][0]}</a>
                    {message.text[5]}
                </div>
            </div>
            <div className="chat-message-date" style={{ float: message.sender !== "CAI" ? "left" : "right" }}>
                {ESUtils.formatTime(Date.now() - message.date)}
            </div>
        </div>
    )
}

const CaiBody = () => {
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
                            <CAIMessageView {...message}/>
                        </li>
                    )}
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
                        {inputOptions.length < buttonLimit &&
                        Object.entries(inputOptions).map(([inputIdx, input]: [string, cai.CAIButton]) =>
                            <li key={inputIdx}>
                                <button type ="button" className="btn btn-cai" onClick={() => dispatch(cai.sendCAIMessage(input))} style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
                                    {input.label}
                                </button>
                            </li>
                        )}
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
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>}
            </div>
            <div style={{ flex: "auto" }}>
                <ul>
                    {errorOptions.length > 0 &&
                    Object.entries(errorOptions).map(([errIdx, input]: [string, cai.CAIButton]) =>
                        <li key={errIdx}>
                            <button type ="button" className="btn btn-cai" onClick={() => dispatch(cai.sendCAIMessage(input))} style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
                                {input.label}
                            </button>
                        </li>
                    )}
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
    window.onfocus = () => store.dispatch(cai.userOnPage(Date.now()))
    window.onblur = () => store.dispatch(cai.userOnPage(Date.now()))

    let x: number | undefined, y: number | undefined

    window.addEventListener("mousemove", e => {
        x = e.x
        y = e.y
    })

    window.setInterval(() => {
        if (x && y) {
            store.dispatch(cai.mousePosition([x, y]))
        }
    }, 5000)
}
