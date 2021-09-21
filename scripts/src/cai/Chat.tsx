import React, { useEffect, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Collapsed } from "../browser/Browser"

import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete"
import "@webscopeio/react-textarea-autocomplete/style.css"

import { CaiHeader, CaiBody } from "./CAI"
import * as cai from "./caiState"
import { CAI_TREE_NODES } from "./caitree"
import * as dialogue from "../cai/dialogue"
import * as tabs from "../ide/tabState"
import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import * as collaboration from "../app/collaboration"


const AutocompleteSuggestionItem = (text: any) => {
    return (
        <div className="autocomplete-item" style={{ zIndex: 1000 }}>
            <span className="autocomplete-item-slash-command" style={{ fontWeight : "bold" }}>{`${text.entity.slashCommand}`}: </span>
            <span className="autocomplete-item-utterance">{`${text.entity.utterance}`}</span>
        </div>
    )
}

const ChatFooter = () => {
    const dispatch = useDispatch()
    const inputOptions = useSelector(cai.selectInputOptions)
    const responseOptions = useSelector(cai.selectResponseOptions)

    const wizard = useSelector(cai.selectWizard)

    const [inputText, setInputText] = useState("")

    const caiTree = CAI_TREE_NODES.slice(0)

    const parseStudentInput = (label: string) => {
        const option = inputOptions.filter(option => { return option.label === inputText })[0]
        const button = {
            label: label,
            value: option ? option.value : "suggest",
        } as cai.CAIButton
        dispatch(cai.sendCAIMessage(button))
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
        if (inputText.length > 0) {
            wizard ? parseCAIInput(inputText) : parseStudentInput(inputText)
            setInputText("")
        }
    }

    const findUtteranceBySlashCommand = (slashCommandPrompt: string) => {
        const utterances = []
        for (const node of caiTree) {
            if ("slashCommand" in node && node.slashCommand.toLowerCase().startsWith(slashCommandPrompt.toLowerCase())) {
                utterances.push({
                    utterance: node.utterance,
                    slashCommand: node.slashCommand,
                })
            }
        }
        return utterances
    }

    const handleKeyDown = (event: any) => {
        if (event.key === "Enter") {
            sendMessage()
        }
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
                            </li>)}
                    </ul>
                </div>}
            <div style={{ flex: "auto" }}>
                <ReactTextareaAutocomplete
                    id="chat-textarea"
                    value={inputText}
                    onChange={(e: any) => setInputText(e.target.value)}
                    onKeyDown={(e: any) => handleKeyDown(e)}
                    minChar={1}
                    loadingComponent={() => <span>Loading</span>}
                    itemClassName="autocomplete-item"
                    dropdownClassName="autocomplete-list"
                    containerClassName="autocomplete-container"
                    trigger={{
                        "/": {
                            dataProvider: (token: string) => {
                                const utterances = findUtteranceBySlashCommand(token)
                                return utterances
                            },
                            component: AutocompleteSuggestionItem,
                            output: (item: any, trigger: any) => item.utterance,
                        },
                    }}
                    style={{
                        backgroundColor: "lightGray",
                    }}
                />
                <button className="btn btn-cai" onClick={() => { sendMessage() }} style={{ float: "right" }}> Send </button>
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
