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

interface caiState {
    activeProject: string
    messageList: { [key: string]: CAIMessage[] }
    inputOptions: { label: string, value: string }[]
    errorOptions: { label: string, value: string }[]
    dropupLabel: string
    wizard: false
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
        resetState(state) {
            Object.assign(state, {
                activeProject: "",
                messageList: { "": [] },
                inputOptions: [],
                errorOptions: [],
                dropupLabel: "",
                wizard: location.href.includes("wizard"),
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
    keyword: string[]
    text: string[]
    date: number
}

// TODO: Avoid DOM manipulation.
export const newCAIMessage = () => {
    const east = store.getState().layout.east
    if (!(east.open && east.kind === "CAI")) {
        document.getElementById("caiButton")!.classList.add("flashNavButton")
    }
}

export const addCAIMessage = createAsyncThunk<void, [CAIMessage, boolean], ThunkAPI>(
    "cai/addCAIMessage",
    ([message, remote = false], { getState, dispatch }) => {
        if (message.sender !== "CAI") {
            dispatch(addToMessageList(message))
            dispatch(autoScrollCAI())
            newCAIMessage()
        } else if (remote) {
            if (selectWizard(getState())) {
                dispatch(setResponseOptions([...selectResponseOptions(getState()), message]))
            } else {
                dispatch(addToMessageList(message))
                dispatch(autoScrollCAI())
                newCAIMessage()
            }
        } else {
            collaboration.sendChatMessage(message, true)
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
                for (const msg in messages) {
                    const outputMessage = {
                        text: messages[msg][0],
                        keyword: messages[msg][1],
                        date: Date.now(),
                        sender: "CAI",
                    } as CAIMessage

                    dispatch(addCAIMessage([outputMessage, false]))
                }
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
            text: [input.label, "", "", "", ""],
            keyword: ["", "", "", "", ""],
            date: Date.now(),
            sender: userProject.getUsername(),
        } as CAIMessage

        const text = editor.ace.getValue()
        const lang = getState().app.scriptLanguage
        codeSuggestion.generateResults(text, lang)
        dialogue.setCodeObj(editor.ace.session.getDocument().getAllLines().join("\n"))
        dispatch(addToMessageList(message))
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
            dispatch(setResponseOptions([]))
            for (const msg in messages) {
                if (messages[msg] !== "") {
                    const outputMessage = {
                        text: messages[msg][0],
                        keyword: messages[msg][1],
                        date: Date.now(),
                        sender: "CAI",
                    } as CAIMessage

                    dispatch(addCAIMessage([outputMessage, false]))
                }
            }
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
                dispatch(introduceCAI())
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
    (data, { dispatch }) => {
        if (dialogue.isDone()) {
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
                text: output[0],
                keyword: output[1],
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

export const compileError = createAsyncThunk<void, any, ThunkAPI>(
    "cai/compileError",
    (data, { dispatch }) => {
        const errorReturn = dialogue.handleError(data)

        if (dialogue.isDone()) {
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

export const openCurriculum = createAsyncThunk<void, [CAIMessage, number], ThunkAPI>(
    "cai/openCurriculum",
    ([message, location], { dispatch }) => {
        dispatch(curriculum.fetchContent({ location: message.keyword[location][1].split("-") }))
        dispatch(layout.setEast({ open: true, kind: "CURRICULUM" }))
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

export const curriculumPage = createAsyncThunk<void, number[], ThunkAPI>(
    "cai/curriculumPage",
    (location) => {
        dialogue.addCurriculumPageToHistory(location)
    }
)

export const checkForCodeUpdates = createAsyncThunk<void, void, ThunkAPI>(
    "cai/checkForCodeUpdates",
    () => {
        dialogue.checkForCodeUpdates(editor.ace.getValue())
    }
)

export const userOnPage = () => {
    studentPreferences.addOnPageStatus(1)
}

export const userOffPage = () => {
    studentPreferences.addOnPageStatus(0)
}

export const userUnloadPage = () => {
    studentPreferences.addPageLoad(0)
}

export const userLoadPage = () => {
    studentPreferences.addPageLoad(1)
}

export const userUIClick = (ui: string) => {
    studentPreferences.addUIClick(ui)
}

export const keyStroke = (action: string, content: any) => {
    studentPreferences.addKeystroke(action, content)
}

export const mousePosition = (x: number, y: number) => {
    studentPreferences.addMousePos({ x, y })
}

export const editTime = (startTime: number | null, endTime: number) => {
    studentPreferences.addEditPeriod(startTime, endTime)
}

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
    resetState,
} = caiSlice.actions

export const selectActiveProject = (state: RootState) => state.cai.activeProject

export const selectInputOptions = (state: RootState) => state.cai.inputOptions

export const selectErrorOptions = (state: RootState) => state.cai.errorOptions

export const selectDropupLabel = (state: RootState) => state.cai.dropupLabel

export const selectMessageList = (state: RootState) => state.cai.messageList

export const selectWizard = (state: RootState) => state.cai.wizard

export const selectResponseOptions = (state: RootState) => state.cai.responseOptions
