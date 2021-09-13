import React, { useEffect, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Collapsed } from "../browser/Browser"

import { CaiHeader, CaiBody } from "./CAI"
import * as cai from "./caiState"
import * as dialogue from "../cai/dialogue"
import * as tabs from "../ide/tabState"
import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import * as collaboration from "../app/collaboration"

const ChatFooter = () => {
    const dispatch = useDispatch()
    const inputOptions = useSelector(cai.selectInputOptions)
    const responseOptions = useSelector(cai.selectResponseOptions)
    const errorOptions = useSelector(cai.selectErrorOptions)

    const wizard = useSelector(cai.selectWizard)

    const [inputText, setInputText] = useState("")

    const parseStudentInput = (label: string) => {
        const option = inputOptions.filter(option => { return option.label === inputText })[0]
        if (option) {
            const button = {
                label: label,
                value: option.value,
            } as cai.CAIButton
            dispatch(cai.sendCAIMessage(button))
        }
        const message = {
            text: [label],
            keyword: ["", "", "", "", ""],
            date: Date.now(),
            sender: collaboration.userName,
        } as cai.CAIMessage
        collaboration.sendChatMessage(message)
    }

    const parseCAIInput = (input: string) => {
        const labels = dialogue.getLinks(input)
        const outputMessage = {
            text: labels[0],
            keyword: labels[1],
            date: Date.now(),
            sender: "CAI",
        } as cai.CAIMessage
        dispatch(cai.setResponseOptions([]))
        dispatch(cai.addToMessageList(outputMessage))
        dispatch(cai.autoScrollCAI())
        cai.newCAIMessage()
        collaboration.sendChatMessage(outputMessage, true)
    }

    const caiResponseInput = (input: cai.CAIMessage) => {
        dispatch(cai.setResponseOptions([]))
        dispatch(cai.addToMessageList(input))
        dispatch(cai.autoScrollCAI())
        cai.newCAIMessage()
        collaboration.sendChatMessage(input, true)
    }

    const sendMessage = () => {
        wizard ? parseCAIInput(inputText) : parseStudentInput(inputText)
        setInputText("")
    }

    return (
        <div id="chat-footer" style={{ marginTop: "auto", display: "block" }}>
            {wizard &&
                <div style={{ flex: "auto" }}>
                    <ul>
                        {Object.entries(responseOptions).map(([inputIdx, input]: [string, cai.CAIMessage]) =>
                            <li key={inputIdx}>
                                <button type="button" className="btn btn-cai" onClick={() => caiResponseInput(input)} style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
                                    {input.text}
                                </button>
                            </li>
                        )}
                    </ul>
                </div>}
            <div style={{ flex: "auto" }}>
                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { sendMessage() } }} style={{ backgroundColor: "lightgray" }}></input>
                <button className="btn btn-cai" onClick={() => { sendMessage() }} style={{ float: "right" }}> Send </button>
            </div>
            <div style={{ flex: "auto" }}>
                <ul>
                    {errorOptions.length > 0 &&
                        Object.entries(errorOptions).map(([errIdx, input]: [string, cai.CAIButton]) =>
                            <li key={errIdx}>
                                <button type="button" className="btn btn-cai" onClick={() => dispatch(cai.sendCAIMessage(input))} style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
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
