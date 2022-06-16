import { createAsyncThunk } from "@reduxjs/toolkit"

import store, { ThunkAPI } from "../reducers"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import * as editor from "../ide/Editor"
import * as analysis from "./analysis"
import * as recommender from "../app/recommender"
import * as codeSuggestion from "./codeSuggestion"
import * as dialogue from "./dialogue"
import * as student from "./student"
import * as errorHandling from "./errorHandling"
import * as user from "../user/userState"
import * as collaboration from "../app/collaboration"
import * as console from "../ide/console"
import {
    CAIButton, CAIMessage, selectWizard, selectResponseOptions, combineMessageText, selectMessageList,
    selectInputOptions, addToMessageList, clearMessageList, setDropupLabel, setErrorOptions,
    setInputOptions, setMessageList, setResponseOptions, setCurriculumView, setActiveProject,
} from "./caiState"
import { DAWData } from "common"

export let firstEdit: number | null = null

// Listen for editor updates.
if (FLAGS.SHOW_CAI) {
    let caiTimer = 0

    if (editor.changeListeners) {
        editor.changeListeners.push(() => {
            if (firstEdit === null) {
                firstEdit = Date.now()
                dialogue.addToNodeHistory(["Begin Code Edit", firstEdit])
            }

            clearTimeout(caiTimer)
            caiTimer = window.setTimeout(() => {
                store.dispatch(checkForCodeUpdates())
                const lastEdit = Date.now()
                dialogue.addToNodeHistory(["End Code Edit", lastEdit])
                student.addEditPeriod(firstEdit, lastEdit)
                firstEdit = null
            }, 1000)
        })
    }
}

// Listen for chat messages.
collaboration.chatListeners.push(message => {
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
            dispatch(addToMessageList({ message: message, activeProject: parameters.project }))
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
                dispatch(addToMessageList({ message: message, activeProject: parameters.project }))
                dispatch(autoScrollCAI())
                newCAIMessage()
            }
        } else {
            // Messages from CAI: save as suggestion and send to wizard.
            dialogue.addToNodeHistory(["chat", [combineMessageText(message), "CAI Suggestion"]])
            collaboration.sendChatMessage(message, "cai suggestion")
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
        const introductionMessage = () => {
            const msgText = dialogue.generateOutput("Chat with CAI", activeProject)
            dialogue.studentInteract(false)
            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setErrorOptions([]))
            dispatch(setResponseOptions([]))
            if (msgText.length > 0) {
                dispatch(caiOutput([[msgText], activeProject]))
            }
        }

        // reinitialize recommendation dictionary
        if (Object.keys(recommender.soundGenreDict).length < 1) {
            analysis.fillDict().then(() => {
                introductionMessage()
            })
        } else {
            introductionMessage()
        }
    }
)

export const sendCAIMessage = createAsyncThunk<void, CAIButton, ThunkAPI>(
    "cai/sendCAIMessage",
    (input, { getState, dispatch }) => {
        dialogue.studentInteract()
        if (input.label.trim().replace(/(\r\n|\n|\r)/gm, "") === "") {
            return
        }
        const message = {
            text: [["plaintext", [input.label]]],
            date: Date.now(),
            sender: user.selectUserName(getState()),
        } as CAIMessage

        const text = editor.ace.getValue()
        const lang = getState().app.scriptLanguage
        codeSuggestion.generateResults(text, lang)
        dialogue.setCodeObj(editor.ace.session.getDocument().getAllLines().join("\n"))
        dispatch(addToMessageList({ message }))
        dispatch(autoScrollCAI())
        const msgText = dialogue.generateOutput(input.value)

        if (input.value === "error") {
            dispatch(setErrorOptions([]))
        }
        dispatch(dialogue.isDone() ? setInputOptions([]) : setInputOptions(dialogue.createButtons()))
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
            dispatch(clearMessageList())
            dispatch(setInputOptions([]))
            dispatch(setDropupLabel(""))
            dispatch(setErrorOptions([]))

            dialogue.setActiveProject("")
            dialogue.clearNodeHistory()
        } else {
            dispatch(setActiveProject(activeProject))
            dialogue.setActiveProject(activeProject)

            if (!selectMessageList(getState())[activeProject]) {
                dispatch(setMessageList([]))
                if (!selectWizard(getState())) {
                    dispatch(introduceCAI(activeProject.slice()))
                }
            }
            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setDropupLabel(dialogue.getDropup()))
            if (selectInputOptions(getState()).length === 0) {
                dispatch(setInputOptions([]))
            }
        }
        student.addTabSwitch(activeProject)
        dispatch(autoScrollCAI())
    }
)

export const compileCAI = createAsyncThunk<void, [DAWData, string, string], ThunkAPI>(
    "cai/compileCAI",
    (data, { getState, dispatch }) => {
        if (FLAGS.SHOW_CHAT) {
            if (!selectWizard(getState())) {
                const message = {
                    text: [["plaintext", ["Compiled the script!"]]],
                    date: Date.now(),
                    sender: user.selectUserName(getState()),
                } as CAIMessage
                collaboration.sendChatMessage(message, "user")
            }
        } else if (dialogue.isDone()) {
            return
        }

        // call cai analysis here
        const language = data[1]
        const code = data[2]

        const results = analysis.analyzeCode(language, code)

        codeSuggestion.generateResults(code, language)
        student.addScoreToAggregate(code, language)

        dispatch(setErrorOptions([]))

        const output = dialogue.processCodeRun(code, results)
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

        student.studentModel.preferences.compileTS.push(Date.now())
    }

)

export const compileError = createAsyncThunk<void, string | Error, ThunkAPI>(
    "cai/compileError",
    (data, { getState, dispatch }) => {
        const errorReturn = dialogue.handleError(data)
        errorHandling.storeErrorInfo(data, editor.ace.getValue(), getState().app.scriptLanguage)
        if (FLAGS.SHOW_CHAT && !selectWizard(getState())) {
            const message = {
                text: [["plaintext", ["Compiled the script with error: " + console.elaborate(data)]]],
                date: Date.now(),
                sender: user.selectUserName(getState()),
            } as CAIMessage
            collaboration.sendChatMessage(message, "user")
        } else if (dialogue.isDone()) {
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
        dispatch(curriculum.fetchContent({ url: link }))
        dispatch(layout.setEast({ open: true, kind: "CURRICULUM" }))
    }
)

export const closeCurriculum = createAsyncThunk<void, void, ThunkAPI>(
    "cai/closeCurriculum",
    (_, { getState }) => {
        if (FLAGS.SHOW_CHAT && !selectWizard(store.getState())) {
            collaboration.sendChatMessage({
                text: [["plaintext", ["the CAI Window"]]],
                sender: user.selectUserName(getState()),
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
            if (FLAGS.SHOW_CHAT && !selectWizard(store.getState())) {
                const page = title || location as unknown as string
                collaboration.sendChatMessage({
                    text: [["plaintext", ["Curriculum Page " + page]]],
                    sender: user.selectUserName(getState()),
                    date: Date.now(),
                } as CAIMessage, "curriculum")
            }
        }
    }
)

export const checkForCodeUpdates = createAsyncThunk<void, void, ThunkAPI>(
    "cai/checkForCodeUpdates",
    () => {
        dialogue.checkForCodeUpdates(editor.ace.getValue())
    }
)
