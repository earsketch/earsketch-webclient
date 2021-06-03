import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { RootState, ThunkAPI } from '../reducers'
import angular from 'angular';
import * as helpers from '../helpers'
import * as curriculum from '../browser/curriculumState'

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
            const caiDialogue = helpers.getNgService('caiDialogue')
            if (state.inputOptions.length === 0 && !caiDialogue.isDone()) {
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

const introduceCAI = createAsyncThunk<void, void, ThunkAPI>(
    'cai/introduceCAI',
    (_, { getState, dispatch }) => {
        const caiDialogue = helpers.getNgService('caiDialogue')
        const rootScope = helpers.getNgRootScope()

        const msgText = caiDialogue.generateOutput("Chat with CAI");
        caiDialogue.studentInteract(false);
        dispatch(setInputOptions(caiDialogue.createButtons()))
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
                rootScope.$broadcast('newCAIMessage')
            }
        }
    }
);

export const sendCAIMessage = createAsyncThunk<void, CAIButton, ThunkAPI>(
    'cai/sendCAIMessage',
    (input, { getState, dispatch }) => {
        const caiDialogue = helpers.getNgService('caiDialogue')
        const codeSuggestion = helpers.getNgService('codeSuggestion')
        const userProject = helpers.getNgService('userProject')
        const ideScope = helpers.getNgController('ideController').scope()
        const rootScope = helpers.getNgRootScope()

        caiDialogue.studentInteract()
        if (input.label.trim().replace(/(\r\n|\n|\r)/gm, '') === '') {
            return
        }
        const message = {
            text: [input.label,"","","",""], 
            keyword: ["","","","",""], 
            date: Date.now(), 
            sender: userProject.getUsername()
        } as CAIMessage

        const text = ideScope.editor.ace.getValue();
        const lang = ideScope.currentLanguage;
        codeSuggestion.generateResults(text, lang)
        caiDialogue.setCodeObj(ideScope.editor.ace.session.doc.$lines.join("\n"))
        dispatch(addToMessageList(message))
        let msgText = caiDialogue.generateOutput(input.value)

        if (input.value === 'error') {
            dispatch(setErrorOptions([]))
        }
        if (msgText.includes("[ERRORFIX")) {
            const errorS = msgText.substring(msgText.indexOf("[ERRORFIX") + 10, msgText.lastIndexOf("|"))
            const errorF = msgText.substring(msgText.lastIndexOf("|") + 1, msgText.length - 1)
            msgText = msgText.substring(0, msgText.indexOf("[ERRORFIX"))
            caiDialogue.setSuccessFail(parseInt(errorS), parseInt(errorF))
            const actionOutput = caiDialogue.attemptErrorFix()
            msgText += "|" + actionOutput ? caiDialogue.errorFixSuccess() : caiDialogue.errorFixFail()
        }
        dispatch(caiDialogue.isDone() ? setInputOptions([]) : setInputOptions(caiDialogue.createButtons()))
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
                    rootScope.$broadcast('newCAIMessage')
                }
            }
        }            
        // With no options available to user, default to tree selection.
        dispatch(setDefaultInputOptions())
        dispatch(setDropupLabel(caiDialogue.getDropup()))
    }
);

export const caiSwapTab = createAsyncThunk<void, string, ThunkAPI>(
    'cai/caiSwapTab',
    (activeProject, { getState, dispatch }) => {
        const caiDialogue = helpers.getNgService('caiDialogue')

        if (activeProject === "" || activeProject === null || activeProject === undefined) {
            dispatch(setActiveProject(""))
            dispatch(clearMessageList())
            dispatch(setInputOptions([]))
            dispatch(setDropupLabel(""))
            dispatch(setErrorOptions([]))

            caiDialogue.clearNodeHistory()
        }
        else {
            dispatch(setActiveProject(activeProject))
            caiDialogue.setActiveProject(activeProject)

            if (!selectMessageList(getState())[activeProject]) {
                dispatch(setMessageList([]))
                dispatch(introduceCAI())
            }
            dispatch(setInputOptions(caiDialogue.createButtons()))
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

        const complexityCalculator = helpers.getNgService('complexityCalculator')
        const caiDialogue = helpers.getNgService('caiDialogue')
        const codeSuggestion = helpers.getNgService('codeSuggestion')
        const caiStudentHistoryModule = helpers.getNgService('caiStudentHistoryModule')
        const caiStudentPreferenceModule = helpers.getNgService('caiStudentHistoryModule')
        const rootScope = helpers.getNgRootScope()

        if (caiDialogue.isDone()) {
            return
        }

        //call cai analysis here
        const result = data[0]
        const language = data[1]
        const code = data[2]

        const results = language === "python" ? complexityCalculator.analyzePython(code) : complexityCalculator.analyzeJavascript(code)

        codeSuggestion.generateResults(code, language)
        caiStudentHistoryModule.addScoreToAggregate(code, language)

        const output = caiDialogue.processCodeRun(code, complexityCalculator.userFunctionReturns, complexityCalculator.allVariables, results)
        if (output !== null && output !== "" && output[0][0] !== "") {
            const message = {
                text: output[0], 
                keyword: output[1], 
                date: Date.now(), 
                sender: "CAI"
            } as CAIMessage
            dispatch(addToMessageList(message))
            dispatch(setInputOptions(caiDialogue.createButtons()))
            dispatch(setErrorOptions([]))
            dispatch(setDefaultInputOptions())
        }
        if (output !== null && output === "" && !caiDialogue.activeWaits() && caiDialogue.studentInteractedValue()) {
            dispatch(setDefaultInputOptions())
        }
        dispatch(setDropupLabel(caiDialogue.getDropup()))
        dispatch(autoScrollCAI())
        rootScope.$broadcast('newCAIMessage')

        var t = Date.now()
        caiStudentPreferenceModule.addCompileTS(t)
    }

);

export const compileError = createAsyncThunk<void, any, ThunkAPI>(
    'cai/compileError',
    (data, { getState, dispatch }) => {
        const caiDialogue = helpers.getNgService('caiDialogue')
        const errorReturn = caiDialogue.handleError(data)

        if (caiDialogue.isDone()) {
            return
        }

        if (errorReturn !== "") {
            dispatch(setInputOptions(caiDialogue.createButtons()))
            dispatch(setDefaultInputOptions())
            dispatch(setErrorOptions([{ label: "do you know anything about this error i'm getting", value: "error" }]))
            dispatch(autoScrollCAI())
        }
        else {
            dispatch(setErrorOptions([]))
        }
    }
);

export const openCurriculum = createAsyncThunk<void, [CAIMessage, number], ThunkAPI>(
    'cai/openCurriculum',
    ([message, location], { getState, dispatch }) => {
        const mainControllerScope = helpers.getNgMainController().scope()
        dispatch(curriculum.fetchContent({location: message.keyword[location][1].split('-')}))
        mainControllerScope.toggleCAIWindow()
    }
);

export const autoScrollCAI = createAsyncThunk<void, void, ThunkAPI>(
    'cai/autoScrollCAI',
    (_, { getState, dispatch }) => {
        // Auto scroll to the bottom (set on a timer to happen after message updates).
        const caiBody = angular.element('#cai-body')[0]
        setTimeout(function(){
            if (caiBody) {
                caiBody.scrollTop = caiBody.scrollHeight
            }
        })
    }
)

export const curriculumPage = createAsyncThunk<void, number[], ThunkAPI>(
    'cai/curriculumPage',
    (location, { getState, dispatch }) => {
        const caiDialogue = helpers.getNgService('caiDialogue')
        caiDialogue.addCurriculumPageToHistory(location)
    }
);

export const checkForCodeUpdates = createAsyncThunk<void, ThunkAPI>(
    'cai/checkForCodeUpdates',
    (_, { getState, dispatch }) => {
        const ideScope = helpers.getNgController('ideController').scope()
        const caiDialogue = helpers.getNgService('caiDialogue')
        caiDialogue.checkForCodeUpdates(ideScope.editor.ace.getValue())
    }
);

export const userOnPage = createAsyncThunk<void, number, ThunkAPI>(
    'cai/userOnPage',
    (time: number, {getState, dispatch}) => {
        const caiStudentPreferenceModule = helpers.getNgService('caiStudentPreferenceModule')
        caiStudentPreferenceModule.addOnPageStatus(1,time)
    }
);

export const userOffPage = createAsyncThunk<void, number, ThunkAPI>(
    'cai/userOffPage',
    (time: number, {getState, dispatch}) => {
        const caiStudentPreferenceModule = helpers.getNgService('caiStudentPreferenceModule')
        caiStudentPreferenceModule.addOnPageStatus(0,time)
    }
);

export const keyStroke = createAsyncThunk<void, [any, any, number], ThunkAPI>(
    'cai/keyStroke',
    ([action, content, time], {getState, dispatch}) => {
        const caiStudentPreferenceModule = helpers.getNgService('caiStudentPreferenceModule')
        caiStudentPreferenceModule.addKeystroke(action, content, time)
    }
);

export const mousePosition = createAsyncThunk<void, [number, number], ThunkAPI>(
    'cai/mousePosition',
    ([x,y], {getState, dispatch}) => {
        const caiStudentPreferenceModule = helpers.getNgService('caiStudentPreferenceModule')
        caiStudentPreferenceModule.addMousePos({x,y})
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