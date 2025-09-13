import { createAsyncThunk } from "@reduxjs/toolkit"

import { DAWData, Language, Script } from "common"
import * as app from "../app/appState"
import * as scripts from "../browser/scriptsState"
import * as tabs from "../ide/tabState"
import { parseLanguage } from "../esutils"
import { changeListeners } from "../ide/Editor"
import store, { ThunkAPI } from "../reducers"
import { selectUserName } from "../user/userState"
import { analyzeCode, analyzeMusic } from "./analysis"
import {
    CaiButton,
    CaiHighlight,
    CaiMessage,
    addToMessageList,
    addToProjectHistory,
    addToSoundHistory,
    combineMessageText,
    highlightLocations,
    selectActiveProject,
    selectHighlight,
    selectInputOptions,
    selectMessageList,
    selectResponseOptions,
    selectWizard,
    setActiveProject,
    setDropupLabel,
    setErrorOptions,
    setHighlight,
    setInputOptions,
    setMessageList,
    setRecentProjects,
    setResponseOptions,
} from "./caiState"
import * as dialogue from "./dialogue"
import { state as dialogueState } from "./dialogue/state"
import { addEditPeriod, addScoreToAggregate, addTabSwitch, studentModel } from "./dialogue/student"
import { addToNodeHistory } from "./dialogue/upload"
import { storeErrorInfo } from "./errorHandling"
import { state as errorHandlingState } from "./errorHandling/state"

export let firstEdit: number | null = null

// Listen for editor updates.
if (ES_WEB_SHOW_CAI || ES_WEB_SHOW_CHAT || ES_WEB_UPLOAD_CAI_HISTORY) {
    let caiTimer = 0

    if (changeListeners) {
        // Code edit timestamps
        changeListeners.push(() => {
            if (firstEdit === null) {
                firstEdit = Date.now()
                addToNodeHistory(["Begin Code Edit", firstEdit])
            }

            clearTimeout(caiTimer)
            caiTimer = window.setTimeout(() => {
                store.dispatch(checkForCodeUpdates())
                const lastEdit = Date.now()
                addToNodeHistory(["End Code Edit", lastEdit])
                if (dialogue.studentEditedCode()) {
                    store.dispatch(promptCodeRun(selectActiveProject(store.getState())))
                }
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

// TODO: Avoid DOM manipulation.
export const newCaiMessage = () => {
    const east = store.getState().layout.east
    if (!(east.open && east.kind === "CAI")) {
        store.dispatch(highlight({ zone: "curriculumButton" }))
    }
}

interface MessageParameters {
    remote?: boolean
    wizard?: boolean
    suggestion?: boolean
    project?: string
}

const addCaiMessage = createAsyncThunk<void, [CaiMessage, MessageParameters], ThunkAPI>(
    "cai/addCaiMessage",
    ([message, parameters], { getState, dispatch }) => {
        if (!ES_WEB_SHOW_CHAT || message.sender !== "CAI") {
            dispatch(addToMessageList({ message, activeProject: parameters.project }))
            dispatch(autoScrollCai())
            newCaiMessage()
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
                addToNodeHistory(["chat", [combineMessageText(message), parameters.wizard ? "Wizard" : "CAI"]])
                dispatch(addToMessageList({ message, activeProject: parameters.project }))
                dispatch(autoScrollCai())
                newCaiMessage()
            }
        } else {
            // Messages from CAI: save as suggestion and send to wizard.
            addToNodeHistory(["chat", [combineMessageText(message), "CAI Suggestion"]])
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
            } as CaiMessage

            dispatch(addCaiMessage([outputMessage, { project }]))
        }
    }
)

const promptCodeRun = createAsyncThunk<void, string, ThunkAPI>(
    "cai/promptCodeRun",
    (activeProject, { dispatch }) => {
        const runMessage = async () => {
            const msgText = await dialogue.generateOutput("promptRun", true, activeProject)
            if (msgText.length > 0) {
                dispatch(caiOutput([[msgText], activeProject]))
            }
        }

        runMessage()
    }
)

const introduceCai = createAsyncThunk<void, string, ThunkAPI>(
    "cai/introduceCai",
    (activeProject, { dispatch }) => {
        const introductionMessage = async () => {
            const msgText = await dialogue.generateOutput("Chat with CAI", false, activeProject)
            dialogue.studentInteract(false)
            dispatch(setInputOptions({ options: dialogue.createButtons(), activeProject }))
            dispatch(setErrorOptions({ options: [], activeProject }))
            dispatch(setResponseOptions([]))
            if (msgText.length > 0) {
                dispatch(caiOutput([[msgText], activeProject]))
            }
        }

        introductionMessage()
    }
)

export const sendCaiMessage = createAsyncThunk<void, [CaiButton, boolean], ThunkAPI>(
    "cai/sendCaiMessage",
    async ([input, isDirect], { getState, dispatch }) => {
        const state = getState()
        const activeProject = selectActiveProject(state)
        dialogue.studentInteract()
        if (input.label.trim().replace(/(\r\n|\n|\r)/gm, "") === "") {
            return
        }
        const message = {
            text: [["plaintext", [input.label]]],
            date: Date.now(),
            sender: selectUserName(getState()),
        } as CaiMessage

        const text = tabs.selectActiveTabScript(state)!.source_code

        dialogue.setCodeObj(text)
        dispatch(addToMessageList({ message }))
        dispatch(autoScrollCai())
        const msgText = await dialogue.generateOutput(input.value, isDirect)

        if (input.value === "error" || input.value === "debug") {
            dispatch(setErrorOptions({ options: [], activeProject }))
        }
        dispatch(dialogueState[activeProject].isDone ? setInputOptions({ options: [], activeProject }) : setInputOptions({ options: dialogue.createButtons(), activeProject }))
        if (msgText.length > 0) {
            dispatch(caiOutput([[msgText]]))
            dispatch(setResponseOptions([]))
        } else if (!selectHighlight(getState()).zone) {
            // With no options available to user, default to tree selection.
            dispatch(setInputOptions({ options: [], activeProject }))
        }
        // set CAI dropup label to match available ones in current dialogue state.
        dispatch(setDropupLabel({ label: dialogueState[activeProject].dropup, activeProject }))
    }
)

export const caiSwapTab = createAsyncThunk<void, string, ThunkAPI>(
    "cai/caiSwapTab",
    (activeProject, { getState, dispatch }) => {
        if (!activeProject || activeProject === "") {
            dispatch(setActiveProject(""))
            dispatch(setInputOptions({ options: [], activeProject }))
            dispatch(setDropupLabel({ label: "", activeProject }))
            dispatch(setErrorOptions({ options: [], activeProject }))
            dialogue.setActiveProject("")
        } else {
            if ((ES_WEB_SHOW_CAI || ES_WEB_UPLOAD_CAI_HISTORY) && !selectWizard(getState())) {
                // get ten most recent projects and push analyses
                const savedScripts: Script [] = []
                const savedNames: string[] = []
                let numberToRun = 1
                if (selectActiveProject(getState()) === "") {
                    numberToRun = 10
                }

                for (const script of Object.values(scripts.selectRegularScripts(store.getState()))) {
                    if (!savedNames.includes(script.name)) {
                        savedNames.push(script.name)
                        savedScripts.push(script)
                    }
                }
                let numberSaved = 0
                for (const script of savedScripts) {
                    let output
                    try {
                        output = analyzeCode(parseLanguage(script.name), script.source_code)
                    } catch (error) {
                        output = null
                    }
                    if (output) {
                        numberSaved += 1
                        dispatch(setRecentProjects(output.codeFeatures))
                    }
                    if (numberSaved >= numberToRun) {
                        break
                    }
                }
            }
            dispatch(setActiveProject(activeProject))
            dialogue.setActiveProject(activeProject)

            if (!selectMessageList(getState()).length) {
                dispatch(setMessageList([]))
                if (ES_WEB_SHOW_CAI && !selectWizard(getState())) {
                    dispatch(introduceCai(activeProject.slice()))
                }
            }

            dispatch(setInputOptions({ options: dialogue.createButtons(), activeProject }))
            dispatch(setDropupLabel({ label: dialogueState[activeProject].dropup, activeProject }))
            if (selectInputOptions(getState()).length === 0) {
                dispatch(setInputOptions({ options: [], activeProject }))
            }
        }
        addTabSwitch(activeProject)
        dispatch(autoScrollCai())
    }
)

export const compileCai = createAsyncThunk<void, [DAWData, Language, string], ThunkAPI>(
    "cai/compileCai",
    async (data, { getState, dispatch }) => {
        if (dialogueState[selectActiveProject(getState())].isDone) {
            return
        }

        // call cai analysis here
        const language = data[1]
        const code = data[2]

        const results = analyzeCode(language, code)

        dispatch(addToProjectHistory(results.codeFeatures))
        addScoreToAggregate(code, language)
        const musicAnalysis = analyzeMusic(data[0])

        dispatch(addToSoundHistory(musicAnalysis))

        if (ES_WEB_SHOW_CAI) {
            dispatch(setErrorOptions({ options: [] }))

            const output = await dialogue.processCodeRun(code, results, musicAnalysis)
            if (output && output[0][0] !== "") {
                const message = {
                    text: output,
                    date: Date.now(),
                    sender: "CAI",
                } as CaiMessage

                dispatch(setInputOptions({ options: dialogue.createButtons() }))
                dispatch(setDropupLabel({ label: dialogueState[selectActiveProject(getState())].dropup }))
                dispatch(addCaiMessage([message, { remote: false }]))
            }
            if (output[0][0] === "" && !dialogue.activeWaits() && dialogue.studentInteracted) {
                dispatch(setInputOptions({ options: [] }))
            }

            dispatch(autoScrollCai())
            newCaiMessage()
        } else if (ES_WEB_UPLOAD_CAI_HISTORY) {
            dialogue.processCodeRun(code, results, musicAnalysis)
        }

        studentModel.preferences.compileTS.push(Date.now())
    }

)

export const compileError = createAsyncThunk<void, string | Error, ThunkAPI>(
    "cai/compileError",
    (data, { getState, dispatch }) => {
        const state = getState()
        const contents = tabs.selectActiveTabScript(state)!.source_code
        const errorReturn = dialogue.handleError(data, contents)
        const activeProject = selectActiveProject(state)
        errorHandlingState[activeProject].errorMessage = storeErrorInfo(data, contents, app.selectScriptLanguage(state))
        if (dialogueState[activeProject].isDone) {
            return
        }

        if (ES_WEB_SHOW_CAI) {
            if (errorReturn !== "") {
                dispatch(setInputOptions({ options: dialogue.createButtons(), activeProject }))
                dispatch(setErrorOptions({
                    options: [{ label: "do you know anything about this error i'm getting", value: "error" }, { label: "can you walk me through debugging my code?", value: "debug" }],
                    activeProject,
                }))
                dispatch(autoScrollCai())
            } else {
                dispatch(setErrorOptions({ options: [], activeProject }))
            }
        }
    }
)

export const closeCurriculum = createAsyncThunk<void, void, ThunkAPI>(
    "cai/closeCurriculum",
    () => {
        addToNodeHistory(["curriculum", "CAI window"])
    }
)

export const autoScrollCai = createAsyncThunk<void, void, ThunkAPI>(
    "cai/autoScrollCai",
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
    ([location, _]) => {
        dialogue.addCurriculumPageToHistory(location)
    }
)

const checkForCodeUpdates = createAsyncThunk<void, void, ThunkAPI>(
    "cai/checkForCodeUpdates",
    (_, { getState }) => {
        dialogue.checkForCodeUpdates(tabs.selectActiveTabScript(getState())!.source_code)
    }
)

export const highlight = createAsyncThunk<void, CaiHighlight, ThunkAPI>(
    "cai/highlight",
    (location, { getState, dispatch }) => {
        if (location.zone && highlightLocations[location.zone]) {
            if (location.zone === selectHighlight(getState()).zone) { return }
            let text = highlightLocations[location.zone]
            if (location.id) {
                text = text + selectActiveProject(getState())
            }
            dispatch(addCaiMessage([{
                text: [["plaintext", [text]]],
                date: Date.now(),
                sender: "CAI",
            } as CaiMessage, { remote: false }]))
        }
        dispatch(setHighlight(location))
        dispatch(autoScrollCai())
    }
)
