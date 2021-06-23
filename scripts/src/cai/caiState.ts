import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import store, { RootState, ThunkAPI } from '../reducers'
import * as layout from '../layout/layoutState'
import * as curriculum from '../browser/curriculumState'
import * as editor from '../ide/Editor'
import * as userProject from '../app/userProject'
import * as analysis from './analysis'
import * as codeSuggestion from './codeSuggestion'
import * as dialogue from './dialogue'
import * as studentPreferences from './studentPreferences'
import * as studentHistory from './studentHistory'
import { getUserFunctionReturns, getAllVariables } from './complexityCalculator'
import { analyzePython } from './complexityCalculatorPY'
import { analyzeJavascript } from './complexityCalculatorJS'

interface caiState {
    activeProject: string
    messageList: { [key:string]: CAIMessage[] }
    inputOptions: {label: string; value: string}[]
    errorOptions: {label: string; value: string}[]
    dropupLabel: string
}

const caiSlice = createSlice({
    name: 'cai',
    initialState: {
        activeProject: "",
        messageList: {"": []},
        inputOptions: [],
        errorOptions: [],
        dropupLabel: "",
    } as caiState,
    reducers: {
        setActiveProject(state, {payload}) {
            state.activeProject = payload
        },
        setInputOptions(state, {payload}) {
            state.inputOptions = payload
        },
        setDefaultInputOptions(state) {
            if (state.inputOptions.length === 0 && !dialogue.isDone()) {
                state.inputOptions = [
                    { label: "what do you think we should do next?", value: "suggest" }, 
                    { label: "do you want to come up with some sound ideas?", value: "sound_select" }, 
                    { label: "i think we're close to done", value: 'wrapup' }, 
                    { label: "i have some ideas about our project", value: "properties"}
                ]
            }
        },
        setErrorOptions(state, {payload}) {
            state.errorOptions = payload
        },
        setMessageList(state, {payload}) {
            if (!state.messageList[state.activeProject]) {
                state.messageList[state.activeProject] = []
            }
            state.messageList[state.activeProject] = payload
        },
        addToMessageList(state, {payload}) {
            if (state.activeProject) {
                state.messageList[state.activeProject].push(payload)
            }
        },
        clearMessageList(state) {
            state.messageList = {}
        },
        setDropupLabel(state, {payload}) {
            state.dropupLabel = payload
        },
        resetState(state) {
            state = {
                activeProject: "",
                messageList: {"": []},
                inputOptions: [],
                errorOptions: [],
                dropupLabel: "",
            } as caiState
        }
    }
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
function newCAIMessage() {
    const east = store.getState().layout.east
    if (!(east.open && east.kind === "CAI")) {
        document.getElementById("caiButton")!.classList.add("flashNavButton")
    }
}

const introduceCAI = createAsyncThunk<void, void, ThunkAPI>(
    'cai/introduceCAI',
    (_, { getState, dispatch }) => {
        // reinitialize recommendation dictionary
        analysis.fillDict().then(function() {
            const msgText = dialogue.generateOutput("Chat with CAI");
            dialogue.studentInteract(false);
            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setErrorOptions([]))
            if (msgText !== "") {
                const messages = msgText.includes('|') ? msgText.split('|') : [msgText]
                for (let msg in messages) {
                    const outputMessage = {
                        text: messages[msg][0],
                        keyword: messages[msg][1],
                        date: Date.now(),
                        sender: "CAI"
                    } as CAIMessage

                    dispatch(addToMessageList(outputMessage))
                    dispatch(autoScrollCAI())
                    newCAIMessage()
                }
            }
        })
    }
);

export const sendCAIMessage = createAsyncThunk<void, CAIButton, ThunkAPI>(
    'cai/sendCAIMessage',
    (input, { getState, dispatch }) => {
        dialogue.studentInteract()
        if (input.label.trim().replace(/(\r\n|\n|\r)/gm, '') === '') {
            return
        }
        const message = {
            text: [input.label,"","","",""], 
            keyword: ["","","","",""], 
            date: Date.now(), 
            sender: userProject.getUsername()
        } as CAIMessage

        const text = editor.ace.getValue();
        const lang = getState().app.scriptLanguage
        codeSuggestion.generateResults(text, lang)
        dialogue.setCodeObj(editor.ace.session.getDocument().getAllLines().join("\n"))
        dispatch(addToMessageList(message))
        let msgText = dialogue.generateOutput(input.value)

        if (input.value === 'error') {
            dispatch(setErrorOptions([]))
        }
        if (msgText.includes("[ERRORFIX")) {
            const errorS = msgText.substring(msgText.indexOf("[ERRORFIX") + 10, msgText.lastIndexOf("|"))
            const errorF = msgText.substring(msgText.lastIndexOf("|") + 1, msgText.length - 1)
            msgText = msgText.substring(0, msgText.indexOf("[ERRORFIX"))
            dialogue.setSuccessFail(parseInt(errorS), parseInt(errorF))
            const actionOutput = dialogue.attemptErrorFix()
            msgText += "|" + actionOutput ? dialogue.errorFixSuccess() : dialogue.errorFixFail()
        }
        dispatch(dialogue.isDone() ? setInputOptions([]) : setInputOptions(dialogue.createButtons()))
        if (msgText !== "") {
            const messages = msgText.includes('|') ? msgText.split('|') : [msgText]
            for (let msg in messages) {
                if (messages[msg] !== "") {
                    const outputMessage = {
                        text: messages[msg][0], 
                        keyword: messages[msg][1], 
                        date: Date.now(), 
                        sender: "CAI"
                    } as CAIMessage
                    dispatch(addToMessageList(outputMessage))
                    dispatch(autoScrollCAI())
                    newCAIMessage()
                }
            }
        }            
        // With no options available to user, default to tree selection.
        dispatch(setDefaultInputOptions())
        dispatch(setDropupLabel(dialogue.getDropup()))
    }
);

export const caiSwapTab = createAsyncThunk<void, string, ThunkAPI>(
    'cai/caiSwapTab',
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
);

export const compileCAI = createAsyncThunk<void, any, ThunkAPI>(
    'cai/compileCAI',
    (data, { getState, dispatch }) => {
        if (dialogue.isDone()) {
            return
        }

        //call cai analysis here
        const result = data[0]
        const language = data[1]
        const code = data[2]

        const results = language === "python" ? analyzePython(code) : analyzeJavascript(code)

        codeSuggestion.generateResults(code, language)
        studentHistory.addScoreToAggregate(code, language)

        dispatch(setErrorOptions([]))

        const output : any = dialogue.processCodeRun(code, getUserFunctionReturns(), getAllVariables(), results, {})
        if (output !== null && output !== "" && output[0][0] !== "") {
            const message = {
                text: output[0], 
                keyword: output[1], 
                date: Date.now(), 
                sender: "CAI"
            } as CAIMessage
            dispatch(addToMessageList(message))
            dispatch(setInputOptions(dialogue.createButtons()))
            dispatch(setDefaultInputOptions())
        }
        if (output !== null && output === "" && !dialogue.activeWaits() && dialogue.studentInteractedValue()) {
            dispatch(setDefaultInputOptions())
        }
        dispatch(setDropupLabel(dialogue.getDropup()))
        dispatch(autoScrollCAI())
        newCAIMessage()

        var t = Date.now()
        studentPreferences.addCompileTS(t)
    }

);

export const compileError = createAsyncThunk<void, any, ThunkAPI>(
    'cai/compileError',
    (data, { getState, dispatch }) => {
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
);

export const openCurriculum = createAsyncThunk<void, [CAIMessage, number], ThunkAPI>(
    'cai/openCurriculum',
    ([message, location], { getState, dispatch }) => {
        dispatch(curriculum.fetchContent({location: message.keyword[location][1].split('-')}))
        dispatch(layout.openEast("CURRICULUM"))
    }
);

export const autoScrollCAI = createAsyncThunk<void, void, ThunkAPI>(
    'cai/autoScrollCAI',
    (_, { getState, dispatch }) => {
        // Auto scroll to the bottom (set on a timer to happen after message updates).
        const caiBody = document.getElementById('cai-body')
        setTimeout(() => {
            if (caiBody) {
                caiBody.scrollTop = caiBody.scrollHeight
            }
        })
    }
)

export const curriculumPage = createAsyncThunk<void, number[], ThunkAPI>(
    'cai/curriculumPage',
    (location, { getState, dispatch }) => {
        dialogue.addCurriculumPageToHistory(location)
    }
);

export const checkForCodeUpdates = createAsyncThunk<void, void, ThunkAPI>(
    'cai/checkForCodeUpdates',
    (_, { getState, dispatch }) => {
        dialogue.checkForCodeUpdates(editor.ace.getValue())
    }
);

export const userOnPage = createAsyncThunk<void, number, ThunkAPI>(
    'cai/userOnPage',
    (time: number, {getState, dispatch}) => {
        studentPreferences.addOnPageStatus(1,time)
    }
);

export const userOffPage = createAsyncThunk<void, number, ThunkAPI>(
    'cai/userOffPage',
    (time: number, {getState, dispatch}) => {
        studentPreferences.addOnPageStatus(0,time)
    }
);

export const keyStroke = createAsyncThunk<void, [any, any, number], ThunkAPI>(
    'cai/keyStroke',
    ([action, content, time], {getState, dispatch}) => {
        studentPreferences.addKeystroke(action, content, time)
    }
);

export const mousePosition = createAsyncThunk<void, [number, number], ThunkAPI>(
    'cai/mousePosition',
    ([x,y], {getState, dispatch}) => {
        studentPreferences.addMousePos({x,y})
    }
);

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
    resetState
} = caiSlice.actions

export const selectActiveProject = (state: RootState) => state.cai.activeProject

export const selectInputOptions = (state: RootState) => state.cai.inputOptions

export const selectErrorOptions = (state: RootState) => state.cai.errorOptions

export const selectDropupLabel = (state: RootState) => state.cai.dropupLabel

export const selectMessageList = (state: RootState) => state.cai.messageList