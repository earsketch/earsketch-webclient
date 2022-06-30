import React, { useEffect, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Collapsed } from "../browser/Utils"

import ReactTextareaAutocomplete from "@webscopeio/react-textarea-autocomplete"
import "@webscopeio/react-textarea-autocomplete/style.css"

import { CaiHeader, CaiBody } from "./CAI"
import * as cai from "./caiState"
import * as caiThunks from "./caiThunks"
import { CAI_TREE_NODES } from "./caitree"
import * as dialogue from "../cai/dialogue"
import * as tabs from "../ide/tabState"
import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import * as collaboration from "../app/collaboration"
import * as editor from "../ide/Editor"
import * as user from "../user/userState"

interface AutocompleteSuggestion {
    utterance: string
    slashCommand: string
}

const AutocompleteSuggestionItem = (text: { entity: AutocompleteSuggestion }) => {
    return (
        <div className="autocomplete-item" style={{ zIndex: 1000 }}>
            <span className="autocomplete-item-slash-command" style={{ fontWeight: "bold" }}>{`${text.entity.slashCommand}`}: </span>
            <span className="autocomplete-item-utterance">{`${text.entity.utterance}`}</span>
        </div>
    )
}

const ChatFooter = () => {
    const dispatch = useDispatch()
    const userName = useSelector(user.selectUserName)
    const inputOptions = useSelector(cai.selectInputOptions)
    const responseOptions = useSelector(cai.selectResponseOptions)

    const wizard = useSelector(cai.selectWizard)
    const curriculumView = useSelector(cai.selectCurriculumView)

    const [inputText, setInputText] = useState("")

    const caiTree = CAI_TREE_NODES.slice(0)

    const parseStudentInput = (label: string) => {
        dialogue.addToNodeHistory(["chat", [label, userName]])

        const message = {
            text: [["plaintext", [label]]],
            date: Date.now(),
            sender: userName,
        } as cai.CAIMessage

        if (FLAGS.SHOW_CAI) {
            const option = inputOptions.filter(option => { return option.label === inputText })[0]
            const button = {
                label: label,
                value: option ? option.value : "suggest",
            } as cai.CAIButton
            dispatch(caiThunks.sendCAIMessage(button))
        } else {
            dispatch(cai.addToMessageList(message))
            dispatch(caiThunks.autoScrollCAI())
        }
        collaboration.sendChatMessage(message, "user")
    }

    const parseCAIInput = async (input: string) => {
        dialogue.setCodeObj(editor.getValue())
        const structure = await dialogue.showNextDialogue(input)
        if (structure.length > 0) {
            const outputMessage = {
                text: structure,
                date: Date.now(),
                sender: "CAI",
            } as cai.CAIMessage
            if (cai.combineMessageText(outputMessage).length > 0) {
                dispatch(cai.setResponseOptions([]))
                dispatch(cai.addToMessageList(outputMessage))
                dispatch(caiThunks.autoScrollCAI())
                caiThunks.newCAIMessage()
                collaboration.sendChatMessage(outputMessage, "wizard")
            }
        }
    }

    const caiResponseInput = (input: cai.CAIMessage) => {
        dispatch(cai.setResponseOptions([]))
        dispatch(cai.addToMessageList(input))
        dispatch(caiThunks.autoScrollCAI())
        caiThunks.newCAIMessage()
        collaboration.sendChatMessage(input, "cai")
    }

    const sendMessage = () => {
        if (inputText.length > 0) {
            wizard ? parseCAIInput(inputText) : parseStudentInput(inputText)
            setInputText("")
        }
    }

    const findUtteranceBySlashCommand = (slashCommandPrompt: string) => {
        const utterances: AutocompleteSuggestion[] = []
        for (const node of caiTree) {
            if ("slashCommand" in node && node.slashCommand.toLowerCase().startsWith(slashCommandPrompt.toLowerCase())) {
                utterances.push({
                    utterance: node.utterance,
                    slashCommand: node.slashCommand,
                } as AutocompleteSuggestion)
            }
        }
        return utterances
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (!wizard) {
            dialogue.addToNodeHistory(["chat keydown", event.key])
        }
        if (event.key === "Enter") {
            sendMessage()
            event.preventDefault()
        }
    }

    return (
        <div id="chat-footer" style={{ marginTop: "auto", display: "block" }}>
            {wizard &&
            <div style={{ flex: "auto", color: "white" }}>
                {curriculumView}
            </div>}
            {wizard &&
            <div style={{ flex: "auto" }}>
                <ul>
                    {Object.entries(responseOptions).map(([inputIdx, input]: [string, cai.CAIMessage]) =>
                        <li key={inputIdx}>
                            <button type="button" className="btn btn-cai py-1.5 px-3" onClick={() => caiResponseInput(input)} style={{ margin: "10px", maxWidth: "90%", whiteSpace: "initial", textAlign: "left" }}>
                                {cai.combineMessageText(input)}
                            </button>
                        </li>)}
                </ul>
            </div>}
            <div style={{ flex: "auto" }}>
                {wizard
                    ? <ReactTextareaAutocomplete
                        id="chat-textarea"
                        value={inputText}
                        onChange={(e: Event) => setInputText((e.target as HTMLTextAreaElement).value)}
                        onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e)}
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
                                output: (item: AutocompleteSuggestion) => item.utterance,
                            },
                        }}
                        style={{ backgroundColor: "lightGray" }}
                        onItemSelected={(selection: { currentTrigger: string, item: AutocompleteSuggestion }) => {
                            dialogue.addToNodeHistory(["Slash", [selection.item.utterance]])
                        }}
                    />
                    : <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => handleKeyDown(e)} style={{ backgroundColor: "lightgray" }}></input>}
                <button className="btn btn-cai py-1.5 px-3" onClick={() => { sendMessage() }} style={{ float: "right" }}> Send </button>
            </div>
        </div>
    )
}

export const Chat = () => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const activeScript = useSelector(tabs.selectActiveTabScript)?.name
    const collaborative = useSelector(tabs.selectActiveTabScript)?.collaborative
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
                {collaborative &&
                <ChatFooter />}
            </div>
        )
        : <Collapsed title="CAI" position="east" />
}
