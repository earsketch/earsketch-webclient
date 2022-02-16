import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import store, { RootState, ThunkAPI } from "../reducers"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import * as editor from "../ide/Editor"
import * as userProject from "../app/userProject"
import * as analysis from "./analysis"
import * as codeSuggestion from "./codeSuggestion"
import * as dialogue from "./dialogue"
import * as studentPreferences from "./studentPreferences"
import * as studentHistory from "./studentHistory"
import { getUserFunctionReturns, getAllVariables } from "./complexityCalculator"
import { analyzePython } from "./complexityCalculatorPY"
import { analyzeJavascript } from "./complexityCalculatorJS"
import * as collaboration from "../app/collaboration"
import * as console from "../ide/console"

interface caiState {
    activeProject: string
    messageList: { [key: string]: CAIMessage[] }
    inputOptions: { label: string, value: string }[]
    errorOptions: { label: string, value: string }[]
    dropupLabel: string
    wizard: boolean
    curriculumView: string
    responseOptions: CAIMessage[]
}

const caiSlice = createSlice({
    name: "cai",
    initialState: {
        activeProject: "",
        messageList: { "": [] },
        inputOptions: [],
        errorOptions: [],
        dropupLabel: "",
        wizard: location.href.includes("wizard"),
        curriculumView: "",
        responseOptions: [],
    } as caiState,
    reducers: {
        setActiveProject(state, { payload }) {
            state.activeProject = payload
        },
        setInputOptions(state, { payload }) {
            state.inputOptions = payload
        },
        setDefaultInputOptions(state) {
            if (state.inputOptions.length === 0 && !dialogue.isDone()) {
                state.inputOptions = [
                    { label: "what do you think we should do next?", value: "suggest" },
                    { label: "do you want to come up with some sound ideas?", value: "sound_select" },
                    { label: "i think we're close to done", value: "wrapup" },
                    { label: "i have some ideas about our project", value: "properties" },
                ]
            }
        },
        setErrorOptions(state, { payload }) {
            state.errorOptions = payload
        },
        setMessageList(state, { payload }) {
            if (!state.messageList[state.activeProject]) {
                state.messageList[state.activeProject] = []
            }
            state.messageList[state.activeProject] = payload
        },
        addToMessageList(state, { payload }) {
            if (state.activeProject) {
                state.messageList[state.activeProject].push(payload)
            }
        },
        clearMessageList(state) {
            state.messageList = {}
        },
        setDropupLabel(state, { payload }) {
            state.dropupLabel = payload
        },
        setResponseOptions(state, { payload }) {
            state.responseOptions = payload
        },
        setCurriculumView(state, { payload }) {
            state.curriculumView = payload
        },
        resetState(state) {
            Object.assign(state, {
                activeProject: "",
                messageList: { "": [] },
                inputOptions: [],
                errorOptions: [],
                dropupLabel: "",
                wizard: location.href.includes("wizard"),
                curriculumView: "",
            })
        },
    },
})

export interface CAIButton {
    label: string
    value: string
}

export interface CAIMessage {
    sender: string
    text: any[]
    date: number
}

// TODO: Avoid DOM manipulation.
export const newCAIMessage = () => {
    const east = store.getState().layout.east
    if (!(east.open && east.kind === "CAI")) {
        document.getElementById("caiButton")!.classList.add("flashNavButton")
    }
}

export const combineMessageText = (input: CAIMessage) => {
    let output = ""
    for (const subText of input.text) {
        output = output + subText[1][0]
    }
    return output
}

export const addCAIMessage = createAsyncThunk<void, [CAIMessage, boolean, boolean?, boolean?], ThunkAPI>(
    "cai/addCAIMessage",
    ([message, remote = false, wizard = false, suggestion = false], { getState, dispatch }) => {
        if (!FLAGS.SHOW_CHAT || message.sender !== "CAI") {
            dispatch(addToMessageList(message))
            dispatch(autoScrollCAI())
            newCAIMessage()
        } else if (remote) {
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
            } else if (!suggestion) {
                // Message from CAI/wizard to user. Remove suggestion messages.
                dialogue.addToNodeHistory(["chat", [combineMessageText(message), wizard ? "Wizard" : "CAI"]])
                dispatch(addToMessageList(message))
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

const caiOutput = createAsyncThunk<void, any, ThunkAPI>(
    "cai/caiOutput",
    (messages, { dispatch }) => {
        for (const msg in messages) {
            const outputMessage = {
                text: messages[msg],
                date: Date.now(),
                sender: "CAI",
            } as CAIMessage

            dispatch(addCAIMessage([outputMessage, false]))
        }
    }
)

const introduceCAI = createAsyncThunk<void, void, ThunkAPI>(
    "cai/introduceCAI",
    (_, { dispatch }) => {
        // reinitialize recommendation dictionary
        analysis.fillDict().then(() => {
            const msgText = dialogue.generateOutput("Chat with CAI")
            dialogue.studentInteract(false)
            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setErrorOptions([]))
            dispatch(setResponseOptions([]))
            if (msgText !== "") {
                const messages = msgText.includes("|") ? msgText.split("|") : [msgText]
                dispatch(caiOutput(messages))
            }
        })
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
            sender: userProject.getUsername(),
        } as CAIMessage

        const text = editor.ace.getValue()
        const lang = getState().app.scriptLanguage
        codeSuggestion.generateResults(text, lang)
        dialogue.setCodeObj(editor.ace.session.getDocument().getAllLines().join("\n"))
        dispatch(addToMessageList(message))
        dispatch(autoScrollCAI())
        let msgText = dialogue.generateOutput(input.value)

        if (input.value === "error") {
            dispatch(setErrorOptions([]))
        }
        if (msgText.includes("[ERRORFIX")) {
            const errorSuccess = msgText.substring(msgText.includes("[ERRORFIX") + 10, msgText.lastIndexOf("|"))
            const errorFail = msgText.substring(msgText.lastIndexOf("|") + 1, msgText.length - 1)
            msgText = msgText.substring(0, msgText.indexOf("[ERRORFIX"))
            dialogue.setSuccessFail(parseInt(errorSuccess), parseInt(errorFail))
            const actionOutput = dialogue.attemptErrorFix()
            msgText += "|" + actionOutput ? dialogue.errorFixSuccess() : dialogue.errorFixFail()
        }
        dispatch(dialogue.isDone() ? setInputOptions([]) : setInputOptions(dialogue.createButtons()))
        if (msgText !== "") {
            const messages = msgText.includes("|") ? msgText.split("|") : [msgText]
            dispatch(caiOutput(messages))
            dispatch(setResponseOptions([]))
        }
        // With no options available to user, default to tree selection.
        dispatch(setDefaultInputOptions())
        dispatch(setDropupLabel(dialogue.getDropup()))
    }
)

export const caiSwapTab = createAsyncThunk<void, string, ThunkAPI>(
    "cai/caiSwapTab",
    (activeProject, { getState, dispatch }) => {
        if (activeProject === "" || activeProject === null || activeProject === undefined) {
            dispatch(setActiveProject(""))
            dispatch(clearMessageList())
            dispatch(setInputOptions([]))
            dispatch(setDropupLabel(""))
            dispatch(setErrorOptions([]))

            dialogue.clearNodeHistory()
        } else {
            dispatch(setActiveProject(activeProject))
            dialogue.setActiveProject(activeProject)

            if (!selectMessageList(getState())[activeProject]) {
                dispatch(setMessageList([]))
                if (!selectWizard(getState())) {
                    dispatch(introduceCAI())
                }
            }
            dispatch(setInputOptions(dialogue.createButtons()))
            if (selectInputOptions(getState()).length === 0) {
                dispatch(setDefaultInputOptions())
            }
        }
        dispatch(autoScrollCAI())
    }
)

export const compileCAI = createAsyncThunk<void, any, ThunkAPI>(
    "cai/compileCAI",
    (data, { getState, dispatch }) => {
        if (FLAGS.SHOW_CHAT) {
            if (!selectWizard(getState())) {
                const message = {
                    text: [["plaintext", ["Compiled the script!"]]],
                    date: Date.now(),
                    sender: userProject.getUsername(),
                } as CAIMessage
                collaboration.sendChatMessage(message, "user")
            }
        } else if (dialogue.isDone()) {
            return
        }

        // call cai analysis here
        // const result = data[0]
        const language = data[1]
        const code = data[2]

        const results = language === "python" ? analyzePython(code) : analyzeJavascript(code)

        codeSuggestion.generateResults(code, language)
        studentHistory.addScoreToAggregate(code, language)

        dispatch(setErrorOptions([]))

        const output: any = dialogue.processCodeRun(code, getUserFunctionReturns(), getAllVariables(), results, {})
        if (output !== null && output !== "" && output[0][0] !== "") {
            const message = {
                text: output,
                date: Date.now(),
                sender: "CAI",
            } as CAIMessage

            dispatch(addCAIMessage([message, false]))
        }
        if (output !== null && output === "" && !dialogue.activeWaits() && dialogue.studentInteractedValue()) {
            dispatch(setDefaultInputOptions())
        }
        dispatch(setDropupLabel(dialogue.getDropup()))
        dispatch(autoScrollCAI())
        newCAIMessage()

        studentPreferences.addCompileTS()
    }

)

export const compileError = createAsyncThunk<void, string | Error, ThunkAPI>(
    "cai/compileError",
    (data, { getState, dispatch }) => {
        const errorReturn = dialogue.handleError(data)

        if (FLAGS.SHOW_CHAT && !selectWizard(getState())) {
            const message = {
                text: [["plaintext", ["Compiled the script with error: " + console.elaborate(data)]]],
                date: Date.now(),
                sender: userProject.getUsername(),
            } as CAIMessage
            collaboration.sendChatMessage(message, "user")
        } else if (dialogue.isDone()) {
            return
        }

        if (errorReturn !== "") {
            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setDefaultInputOptions())
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
    () => {
        if (FLAGS.SHOW_CHAT && !selectWizard(store.getState())) {
            collaboration.sendChatMessage({
                text: [["plaintext", ["the CAI Window"]]],
                sender: userProject.getUsername(),
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
    ([location, title]) => {
        dialogue.addCurriculumPageToHistory(location)
        const east = store.getState().layout.east
        if (!(east.open && east.kind === "CAI")) {
            if (FLAGS.SHOW_CHAT && !selectWizard(store.getState())) {
                const page = title || location as unknown as string
                collaboration.sendChatMessage({
                    text: [["plaintext", ["Curriculum Page " + page]]],
                    sender: userProject.getUsername(),
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

export default caiSlice.reducer
export const {
    setActiveProject,
    setInputOptions,
    setDefaultInputOptions,
    setErrorOptions,
    setMessageList,
    addToMessageList,
    clearMessageList,
    setDropupLabel,
    setResponseOptions,
    setCurriculumView,
    resetState,
} = caiSlice.actions

export const selectActiveProject = (state: RootState) => state.cai.activeProject

export const selectInputOptions = (state: RootState) => state.cai.inputOptions

export const selectErrorOptions = (state: RootState) => state.cai.errorOptions

export const selectDropupLabel = (state: RootState) => state.cai.dropupLabel

export const selectMessageList = (state: RootState) => state.cai.messageList

export const selectWizard = (state: RootState) => state.cai.wizard

export const selectCurriculumView = (state: RootState) => state.cai.curriculumView

export const selectResponseOptions = (state: RootState) => state.cai.responseOptions
