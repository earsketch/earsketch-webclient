import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import store, { RootState, ThunkAPI } from "../reducers"
import * as layout from "../ide/layoutState"
import * as curriculum from "../browser/curriculumState"
import * as editor from "../ide/Editor"
import * as userProject from "../app/userProject"
import * as analysis from "./analysis"
import * as recommender from "../app/recommender"
import * as codeSuggestion from "./codeSuggestion"
import * as dialogue from "./dialogue"
import * as studentPreferences from "./studentPreferences"
import * as studentHistory from "./studentHistory"
import * as errorHandling from "./errorHandling"
import { analyzePython } from "./complexityCalculatorPY"
import { analyzeJavascript } from "./complexityCalculatorJS"
import * as collaboration from "../app/collaboration"
import * as console from "../ide/console"

export interface CAIButton {
    label: string
    value: string
}

export interface CAIMessage {
    sender: string
    text: [string, string[]][]
    date: number
}

interface caiState {
    activeProject: string
    messageList: { [key: string]: CAIMessage[] }
    inputOptions: CAIButton[]
    errorOptions: CAIButton[]
    dropupLabel: string
    wizard: boolean
    curriculumView: string
    responseOptions: CAIMessage[]
}

const defaultInputOptions = [
    { label: "what do you think we should do next?", value: "suggest" },
    { label: "do you want to come up with some sound ideas?", value: "sound_select" },
    { label: "i think we're close to done", value: "wrapup" },
    { label: "i have some ideas about our project", value: "properties" },
]

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
            if (!state.activeProject || state.activeProject === "") {
                state.inputOptions = []
                state.dropupLabel = ""
            } else if (payload.length === 0 && !dialogue.isDone()) {
                state.inputOptions = defaultInputOptions
                state.dropupLabel = ""
            } else {
                state.inputOptions = payload
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
                if (!payload.activeProject) {
                    payload.activeProject = state.activeProject
                }
                state.messageList[payload.activeProject].push(payload.message)
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

export const addCAIMessage = createAsyncThunk<void, [CAIMessage, boolean, boolean?, boolean?, string?], ThunkAPI>(
    "cai/addCAIMessage",
    ([message, remote = false, wizard = false, suggestion = false, project = undefined], { getState, dispatch }) => {
        if (!FLAGS.SHOW_CHAT || message.sender !== "CAI") {
            dispatch(addToMessageList({ message: message, activeProject: project }))
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
                dispatch(addToMessageList({ message: message, activeProject: project }))
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

            dispatch(addCAIMessage([outputMessage, false, false, false, project]))
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
        if (Object.keys(recommender.getKeyDict("genre")).length < 1) {
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
            sender: userProject.getUsername(),
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
        const language = data[1]
        const code = data[2]

        const results = language === "python" ? analyzePython(code) : analyzeJavascript(code)

        codeSuggestion.generateResults(code, language)
        studentHistory.addScoreToAggregate(code, language)

        dispatch(setErrorOptions([]))

        const output = dialogue.processCodeRun(code, results, {})
        if (output && output[0][0] !== "") {
            const message = {
                text: output,
                date: Date.now(),
                sender: "CAI",
            } as CAIMessage

            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setDropupLabel(dialogue.getDropup()))
            dispatch(addCAIMessage([message, false]))
        }
        if (output[0][0] === "" && !dialogue.activeWaits() && dialogue.studentInteractedValue()) {
            dispatch(setInputOptions([]))
        }

        dispatch(autoScrollCAI())
        newCAIMessage()

        studentPreferences.addCompileTS()
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
                sender: userProject.getUsername(),
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
