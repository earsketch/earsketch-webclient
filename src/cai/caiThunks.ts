import { createAsyncThunk } from "@reduxjs/toolkit"

import store, { ThunkAPI } from "../reducers"
import { setEast } from "../ide/layoutState"
import { fetchContent } from "../browser/curriculumState"
import { selectActiveTabScript } from "../ide/tabState"
import { changeListeners, getContents, setReadOnly } from "../ide/Editor"
import { analyzeCode } from "./analysis"
import { generateResults } from "./codeSuggestion"
import * as dialogue from "./dialogue"
import { studentModel, addEditPeriod, addTabSwitch, addScoreToAggregate } from "./student"
import { storeErrorInfo } from "./errorHandling"
import { selectUserName } from "../user/userState"
import { chatListeners, sendChatMessage } from "../app/collaboration"
import { elaborate } from "../ide/console"
import {
    CAIButton, CAIMessage, selectWizard, selectResponseOptions, combineMessageText, selectMessageList,
    selectInputOptions, addToMessageList, setDropupLabel, setErrorOptions,
    setInputOptions, setMessageList, setResponseOptions, setCurriculumView, setActiveProject,
} from "./caiState"
import { DAWData } from "common"

export let firstEdit: number | null = null

// Listen for editor updates.
if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT) {
    let caiTimer = 0

    if (changeListeners) {
        // Code edit timestamps
        changeListeners.push(() => {
            if (firstEdit === null) {
                firstEdit = Date.now()
                dialogue.addToNodeHistory(["Begin Code Edit", firstEdit])
            }

            clearTimeout(caiTimer)
            caiTimer = window.setTimeout(() => {
                store.dispatch(checkForCodeUpdates())
                const lastEdit = Date.now()
                dialogue.addToNodeHistory(["End Code Edit", lastEdit])
                addEditPeriod(firstEdit, lastEdit)
                firstEdit = null
            }, 1000)
        })

        // Delete key presses
        changeListeners.push(deletion => {
            if (deletion) {
                studentModel.preferences.deleteKeyTS.push(Date.now())
            }
        })
    }
}

// Listen for chat messages.
chatListeners.push(message => {
    const outputMessage = message.caiMessage!

    switch (message.caiMessageType) {
        case "cai":
            outputMessage.sender = "CAI"
            store.dispatch(addCAIMessage([outputMessage, { remote: true }]))
            break
        case "cai suggestion":
            outputMessage.sender = "CAI"
            store.dispatch(addCAIMessage([outputMessage, { remote: true, suggestion: true }]))
            break
        case "wizard":
            outputMessage.sender = "CAI"
            store.dispatch(addCAIMessage([outputMessage, { remote: true, wizard: true }]))
            break
        case "user":
            store.dispatch(addCAIMessage([outputMessage, { remote: true }]))
            break
        case "curriculum":
            store.dispatch(setCurriculumView(message.sender + " is viewing " + outputMessage.text[0][1][0]))
            break
    }
})

// TODO: Avoid DOM manipulation.
export const newCAIMessage = () => {
    const east = store.getState().layout.east
    if (!(east.open && east.kind === "CAI")) {
        document.getElementById("caiButton")!.classList.add("flashNavButton")
    }
}

interface MessageParameters {
    remote?: boolean
    wizard?: boolean
    suggestion?: boolean
    project?: string
}

export const addCAIMessage = createAsyncThunk<void, [CAIMessage, MessageParameters], ThunkAPI>(
    "cai/addCAIMessage",
    ([message, parameters], { getState, dispatch }) => {
        if (!FLAGS.SHOW_CHAT || message.sender !== "CAI") {
            dispatch(addToMessageList({ message, activeProject: parameters.project }))
            dispatch(autoScrollCAI())
            newCAIMessage()
        } else if (parameters.remote) {
            if (selectWizard(getState())) {
                let responseOptions = selectResponseOptions(getState())
                const messageText = combineMessageText(message)
                // Ignore empty messages
                if (messageText.length === 0) {
                    return
                }
                // Ignore messages already in options
                for (const response of responseOptions) {
                    if (combineMessageText(response) === messageText) {
                        return
                    }
                }
                if (responseOptions.length > 2) {
                    responseOptions = responseOptions.slice(1)
                }
                dispatch(setResponseOptions([...responseOptions, message]))
            } else if (!parameters.suggestion) {
                // Message from CAI/wizard to user. Remove suggestion messages.
                dialogue.addToNodeHistory(["chat", [combineMessageText(message), parameters.wizard ? "Wizard" : "CAI"]])
                dispatch(addToMessageList({ message, activeProject: parameters.project }))
                dispatch(autoScrollCAI())
                newCAIMessage()
            }
        } else {
            // Messages from CAI: save as suggestion and send to wizard.
            dialogue.addToNodeHistory(["chat", [combineMessageText(message), "CAI Suggestion"]])
            sendChatMessage(message, "cai suggestion")
        }
    }
)

const caiOutput = createAsyncThunk<void, [[string, string[]][][], string?], ThunkAPI>(
    "cai/caiOutput",
    ([messages, project = undefined], { dispatch }) => {
        for (const msg of messages) {
            const outputMessage = {
                text: msg,
                date: Date.now(),
                sender: "CAI",
            } as CAIMessage

            dispatch(addCAIMessage([outputMessage, { project }]))
        }
    }
)

const introduceCAI = createAsyncThunk<void, string, ThunkAPI>(
    "cai/introduceCAI",
    (activeProject, { dispatch }) => {
        const introductionMessage = async () => {
            const msgText = await dialogue.generateOutput("Chat with CAI", activeProject)
            dialogue.studentInteract(false)
            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setErrorOptions([]))
            dispatch(setResponseOptions([]))
            if (msgText.length > 0) {
                dispatch(caiOutput([[msgText], activeProject]))
            }
        }

        introductionMessage()
    }
)

export const sendCAIMessage = createAsyncThunk<void, CAIButton, ThunkAPI>(
    "cai/sendCAIMessage",
    async (input, { getState, dispatch }) => {
        dialogue.studentInteract()
        if (input.label.trim().replace(/(\r\n|\n|\r)/gm, "") === "") {
            return
        }
        const message = {
            text: [["plaintext", [input.label]]],
            date: Date.now(),
            sender: selectUserName(getState()),
        } as CAIMessage

        const text = getContents()
        const lang = getState().app.scriptLanguage
        generateResults(text, lang)
        dialogue.setCodeObj(text)
        dispatch(addToMessageList({ message }))
        dispatch(autoScrollCAI())
        const msgText = await dialogue.generateOutput(input.value)

        if (input.value === "error") {
            dispatch(setErrorOptions([]))
        }
        dispatch(dialogue.isDone ? setInputOptions([]) : setInputOptions(dialogue.createButtons()))
        if (msgText.length > 0) {
            dispatch(caiOutput([[msgText]]))
            dispatch(setResponseOptions([]))
        } else {
            // With no options available to user, default to tree selection.
            dispatch(setInputOptions([]))
        }
        dispatch(setDropupLabel(dialogue.getDropup()))
    }
)

export const caiSwapTab = createAsyncThunk<void, string, ThunkAPI>(
    "cai/caiSwapTab",
    (activeProject, { getState, dispatch }) => {
        if (!activeProject || activeProject === "") {
            dispatch(setActiveProject(""))
            dispatch(setInputOptions([]))
            dispatch(setDropupLabel(""))
            dispatch(setErrorOptions([]))

            dialogue.setActiveProject("")
        } else {
            dispatch(setActiveProject(activeProject))
            dialogue.setActiveProject(activeProject)

            if (selectWizard(getState()) && selectActiveTabScript(getState()).collaborative) {
                setReadOnly(true)
            }

            if (!selectMessageList(getState())[activeProject]) {
                dispatch(setMessageList([]))
                if (FLAGS.SHOW_CAI && !selectWizard(getState())) {
                    dispatch(introduceCAI(activeProject.slice()))
                }
            }

            dialogue.setActiveProject(activeProject)

            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setDropupLabel(dialogue.getDropup()))
            if (selectInputOptions(getState()).length === 0) {
                dispatch(setInputOptions([]))
            }
        }
        addTabSwitch(activeProject)
        dispatch(autoScrollCAI())
    }
)

export const compileCAI = createAsyncThunk<void, [DAWData, string, string], ThunkAPI>(
    "cai/compileCAI",
    async (data, { getState, dispatch }) => {
        if (FLAGS.SHOW_CHAT) {
            if (!selectWizard(getState())) {
                const message = {
                    text: [["plaintext", ["Compiled the script!"]]],
                    date: Date.now(),
                    sender: selectUserName(getState()),
                } as CAIMessage
                sendChatMessage(message, "user")
            }
        } else if (dialogue.isDone) {
            return
        }

        // call cai analysis here
        const language = data[1]
        const code = data[2]

        const results = analyzeCode(language, code)

        generateResults(code, language)
        addScoreToAggregate(code, language)

        dispatch(setErrorOptions([]))

        const output = await dialogue.processCodeRun(code, results)
        if (output && output[0][0] !== "") {
            const message = {
                text: output,
                date: Date.now(),
                sender: "CAI",
            } as CAIMessage

            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setDropupLabel(dialogue.getDropup()))
            dispatch(addCAIMessage([message, { remote: false }]))
        }
        if (output[0][0] === "" && !dialogue.activeWaits() && dialogue.studentInteractedValue()) {
            dispatch(setInputOptions([]))
        }

        dispatch(autoScrollCAI())
        newCAIMessage()

        studentModel.preferences.compileTS.push(Date.now())
    }

)

export const compileError = createAsyncThunk<void, string | Error, ThunkAPI>(
    "cai/compileError",
    (data, { getState, dispatch }) => {
        const errorReturn = dialogue.handleError(data)
        storeErrorInfo(data, getContents(), getState().app.scriptLanguage)
        if (FLAGS.SHOW_CAI && FLAGS.SHOW_CHAT && !selectWizard(getState())) {
            const message = {
                text: [["plaintext", ["Compiled the script with error: " + elaborate(data)]]],
                date: Date.now(),
                sender: selectUserName(getState()),
            } as CAIMessage
            sendChatMessage(message, "user")
        } else if (dialogue.isDone) {
            return
        }

        if (errorReturn !== "") {
            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setErrorOptions([{ label: "do you know anything about this error i'm getting", value: "error" }]))
            dispatch(autoScrollCAI())
        } else {
            dispatch(setErrorOptions([]))
        }
    }
)

export const openCurriculum = createAsyncThunk<void, string, ThunkAPI>(
    "cai/openCurriculum",
    (link, { dispatch }) => {
        dispatch(fetchContent({ url: link }))
        dispatch(setEast({ open: true, kind: "CURRICULUM" }))
    }
)

export const closeCurriculum = createAsyncThunk<void, void, ThunkAPI>(
    "cai/closeCurriculum",
    (_, { getState }) => {
        if (FLAGS.SHOW_CAI && FLAGS.SHOW_CHAT && !selectWizard(store.getState())) {
            sendChatMessage({
                text: [["plaintext", ["the CAI Window"]]],
                sender: selectUserName(getState()),
                date: Date.now(),
            } as CAIMessage, "curriculum")
        }
    }
)

export const autoScrollCAI = createAsyncThunk<void, void, ThunkAPI>(
    "cai/autoScrollCAI",
    () => {
        // Auto scroll to the bottom (set on a timer to happen after message updates).
        const caiBody = document.getElementById("cai-body")
        setTimeout(() => {
            if (caiBody) {
                caiBody.scrollTop = caiBody.scrollHeight
            }
        })
    }
)

export const curriculumPage = createAsyncThunk<void, [number[], string?], ThunkAPI>(
    "cai/curriculumPage",
    ([location, title], { getState }) => {
        dialogue.addCurriculumPageToHistory(location)
        const east = store.getState().layout.east
        if (!(east.open && east.kind === "CAI")) {
            if (FLAGS.SHOW_CAI && FLAGS.SHOW_CHAT && !selectWizard(store.getState())) {
                const page = title || location as unknown as string
                sendChatMessage({
                    text: [["plaintext", ["Curriculum Page " + page]]],
                    sender: selectUserName(getState()),
                    date: Date.now(),
                } as CAIMessage, "curriculum")
            }
        }
    }
)

export const checkForCodeUpdates = createAsyncThunk<void, void, ThunkAPI>(
    "cai/checkForCodeUpdates",
    () => {
        dialogue.checkForCodeUpdates(getContents())
    }
)
