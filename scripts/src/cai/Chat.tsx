import React, { useEffect, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Collapsed } from "../browser/Browser"

import { CaiHeader, CaiBody } from "./CAI"
import * as cai from "./caiState"
import * as tabs from "../ide/tabState"
import * as appState from "../app/appState"
import * as ESUtils from "../esutils"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
// import store from "../reducers"

const ChatFooter = () => {
    const dispatch = useDispatch()
    const inputOptions = useSelector(cai.selectInputOptions)
    const responseOptions = useSelector(cai.selectResponseOptions)
    const errorOptions = useSelector(cai.selectErrorOptions)
    const dropupLabel = useSelector(cai.selectDropupLabel)
    const buttonLimit = 6

    const wizard = useSelector(cai.selectWizard)

    const [inputText, setInputText] = useState("")

    const parseInput = (label: string) => {
        let option = inputOptions.filter(option => { return option.label === inputText } )[0]
        let value
        value = option ? option.value : inputOptions[0].value
        const message = { 
            label: label, 
            value: value
        } as cai.CAIButton
        dispatch(cai.sendCAIMessage(message))
    }

    const parseCAIInput = (label: string) => {
        const outputMessage = {
            text: [label],
            keyword: ["","","","",""],
            date: Date.now(),
            sender: "CAI",
        } as cai.CAIMessage
        dispatch(cai.addToMessageList(outputMessage))
        dispatch(cai.autoScrollCAI())
        cai.newCAIMessage()
    }

    const buttonInput = (input: cai.CAIMessage) => {
        dispatch(cai.setResponseOptions([]))
        dispatch(cai.addToMessageList(input))
        dispatch(cai.autoScrollCAI())
        cai.newCAIMessage()
    }

    return (
        <div id="chat-footer" style={{ marginTop: "auto", display: "block" }}>
            {wizard && 
            <div style={{ flex: "auto" }}>
                {responseOptions.length < buttonLimit
                    ? <ul>
                        {responseOptions.length < buttonLimit &&
                        Object.entries(responseOptions).map(([inputIdx, input]: [string, cai.CAIMessage]) =>
                            <li key={inputIdx}>
                                <button type ="button" className="btn btn-cai" onClick={() => buttonInput(input)} style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
                                    {input.text}
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
                                {Object.entries(responseOptions).map(([inputIdx, input]: [string, cai.CAIMessage]) =>
                                    <li key={inputIdx}>
                                        <option onClick={() => buttonInput(input)}>{input.text}</option>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>}
            </div>
            }
            <div style={{ flex: "auto" }}>
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} style={{ backgroundColor: "lightgray" }}></input>
                <button className="btn btn-cai" onClick={() => wizard ? parseCAIInput(inputText) : parseInput(inputText)} style={{ float: "right" }}> Send </button>
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

export const Chat = () => {
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
                <ChatFooter />
            </div>
        )
        : <Collapsed title="CAI" position="east" />
}

// if (FLAGS.SHOW_CHAT) {
//     // TODO: Moved out of userProject, should probably go in a useEffect.
//     window.onfocus = () => store.dispatch(cai.userOnPage(Date.now()))
//     window.onblur = () => store.dispatch(cai.userOnPage(Date.now()))

//     let mouseX: number | undefined, mouseY: number | undefined

//     window.addEventListener("mousemove", e => {
//         mouseX = e.x
//         mouseY = e.y
//     })

//     window.setInterval(() => {
//         if (mouseX && mouseY) {
//             store.dispatch(cai.mousePosition([mouseX, mouseY]))
//         }
//     }, 5000)
// }
