import { createAsyncThunk } from "@reduxjs/toolkit"

import { DAWData, Language, Script } from "common"
import { chatListeners, sendChatMessage } from "../app/collaboration"
import { fetchContent } from "../browser/curriculumState"
import { selectRegularScripts } from "../browser/scriptsState"
import { parseLanguage } from "../esutils"
import { changeListeners, getContents, setReadOnly } from "../ide/Editor"
import { elaborate } from "../ide/console"
import { setEast } from "../ide/layoutState"
import { selectActiveTabScript } from "../ide/tabState"
import store, { ThunkAPI } from "../reducers"
import { selectUserName } from "../user/userState"
import { analyzeCode, analyzeMusic } from "./analysis"
import {
    CaiButton,
    CaiHighlight,
    CaiMessage,
    addToMessageList,
    combineMessageText,
    highlightLocations,
    selectActiveProject,
    selectHighlight,
    selectInputOptions,
    selectMessageList,
    selectResponseOptions,
    selectWizard,
    setActiveProject,
    setCurriculumView,
    setDropupLabel, setErrorOptions,
    setHighlight,
    setInputOptions, setMessageList,
    setProjectHistories, setRecentProjects,
    setResponseOptions,
    setSoundHistories,
} from "./caiState"
import * as dialogue from "./dialogue"
import { addEditPeriod, addScoreToAggregate, addTabSwitch, studentModel } from "./dialogue/student"
import { storeErrorInfo } from "./errorHandling"

export let firstEdit: number | null = null

// Listen for editor updates.
if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT || FLAGS.UPLOAD_CAI_HISTORY) {
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

// Listen for chat messages.
chatListeners.push(message => {
    const outputMessage = message.caiMessage!

    switch (message.caiMessageType) {
        case "cai":
            outputMessage.sender = "CAI"
            store.dispatch(addCaiMessage([outputMessage, { remote: true }]))
            break
        case "cai suggestion":
            outputMessage.sender = "CAI"
            store.dispatch(addCaiMessage([outputMessage, { remote: true, suggestion: true }]))
            break
        case "wizard":
            outputMessage.sender = "CAI"
            store.dispatch(addCaiMessage([outputMessage, { remote: true, wizard: true }]))
            break
        case "user":
            store.dispatch(addCaiMessage([outputMessage, { remote: true }]))
            break
        case "curriculum":
            store.dispatch(setCurriculumView(message.sender + " is viewing " + outputMessage.text[0][1][0]))
            break
    }
})

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
        if (!FLAGS.SHOW_CHAT || message.sender !== "CAI") {
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
                dialogue.addToNodeHistory(["chat", [combineMessageText(message), parameters.wizard ? "Wizard" : "CAI"]])
                dispatch(addToMessageList({ message, activeProject: parameters.project }))
                dispatch(autoScrollCai())
                newCaiMessage()
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

export const sendCaiMessage = createAsyncThunk<void, [CaiButton, boolean], ThunkAPI>(
    "cai/sendCaiMessage",
    async ([input, isDirect], { getState, dispatch }) => {
        dialogue.studentInteract()
        if (input.label.trim().replace(/(\r\n|\n|\r)/gm, "") === "") {
            return
        }
        const message = {
            text: [["plaintext", [input.label]]],
            date: Date.now(),
            sender: selectUserName(getState()),
        } as CaiMessage

        const text = getContents()

        dialogue.setCodeObj(text)
        dispatch(addToMessageList({ message }))
        dispatch(autoScrollCai())
        const msgText = await dialogue.generateOutput(input.value, isDirect)

        if (input.value === "error" || input.value === "debug") {
            dispatch(setErrorOptions([]))
        }
        dispatch(dialogue.isDone ? setInputOptions([]) : setInputOptions(dialogue.createButtons()))
        if (msgText.length > 0) {
            dispatch(caiOutput([[msgText]]))
            dispatch(setResponseOptions([]))
        } else if (!selectHighlight(getState()).zone) {
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
            if ((FLAGS.SHOW_CAI || FLAGS.UPLOAD_CAI_HISTORY) && !selectWizard(getState())) {
                // get ten most recent projects and push analyses
                const savedScripts: Script [] = []
                const savedNames: string[] = []
                let numberToRun = 1
                if (selectActiveProject(getState()) === "") {
                    numberToRun = 10
                }

                for (const script of Object.values(selectRegularScripts(store.getState()))) {
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

            if (selectWizard(getState()) && selectActiveTabScript(getState()).collaborative) {
                setReadOnly(true)
            }

            if (!selectMessageList(getState())[activeProject]) {
                dispatch(setMessageList([]))
                if (FLAGS.SHOW_CAI && !selectWizard(getState())) {
                    dispatch(introduceCai(activeProject.slice()))
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
        dispatch(autoScrollCai())
    }
)

export const compileCai = createAsyncThunk<void, [DAWData, Language, string], ThunkAPI>(
    "cai/compileCai",
    async (data, { getState, dispatch }) => {
        if (FLAGS.SHOW_CAI && FLAGS.SHOW_CHAT) {
            if (!selectWizard(getState())) {
                const message = {
                    text: [["plaintext", ["Compiled the script!"]]],
                    date: Date.now(),
                    sender: selectUserName(getState()),
                } as CaiMessage
                sendChatMessage(message, "user")
            }
        } else if (dialogue.isDone) {
            return
        }

        // call cai analysis here
        const language = data[1]
        const code = data[2]

        const results = analyzeCode(language, code)

        dispatch(setProjectHistories(results.codeFeatures))
        addScoreToAggregate(code, language)
        const musicAnalysis = analyzeMusic(data[0])

        dispatch(setSoundHistories(musicAnalysis))

        if (FLAGS.SHOW_CAI) {
            dispatch(setErrorOptions([]))

            const output = await dialogue.processCodeRun(code, results, musicAnalysis)
            if (output && output[0][0] !== "") {
                const message = {
                    text: output,
                    date: Date.now(),
                    sender: "CAI",
                } as CaiMessage

                dispatch(setInputOptions(dialogue.createButtons()))
                dispatch(setDropupLabel(dialogue.getDropup()))
                dispatch(addCaiMessage([message, { remote: false }]))
            }
            if (output[0][0] === "" && !dialogue.activeWaits() && dialogue.studentInteractedValue()) {
                dispatch(setInputOptions([]))
            }

            dispatch(autoScrollCai())
            newCaiMessage()
        } else if (FLAGS.UPLOAD_CAI_HISTORY) {
            dialogue.processCodeRun(code, results, musicAnalysis)
        }

        studentModel.preferences.compileTS.push(Date.now())
    }

)

export const compileError = createAsyncThunk<void, string | Error, ThunkAPI>(
    "cai/compileError",
    (data, { getState, dispatch }) => {
        const errorReturn = dialogue.handleError(data, getContents())
        storeErrorInfo(data, getContents(), getState().app.scriptLanguage)
        if (FLAGS.SHOW_CAI && FLAGS.SHOW_CHAT && !selectWizard(getState())) {
            const message = {
                text: [["plaintext", ["Compiled the script with error: " + elaborate(data)]]],
                date: Date.now(),
                sender: selectUserName(getState()),
            } as CaiMessage
            sendChatMessage(message, "user")
        } else if (dialogue.isDone) {
            return
        }

        if (FLAGS.SHOW_CAI) {
            if (errorReturn !== "") {
                dispatch(setInputOptions(dialogue.createButtons()))
                dispatch(setErrorOptions([{ label: "do you know anything about this error i'm getting", value: "error" }, { label: "can you walk me through debugging my code?", value: "debug" }]))
                dispatch(autoScrollCai())
            } else {
                dispatch(setErrorOptions([]))
            }
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
            } as CaiMessage, "curriculum")
        }
        dialogue.addToNodeHistory(["curriculum", "CAI window"])
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
    ([location, title], { getState }) => {
        dialogue.addCurriculumPageToHistory(location)
        const east = getState().layout.east
        if (!(east.open && east.kind === "CAI")) {
            if (FLAGS.SHOW_CAI && FLAGS.SHOW_CHAT && !selectWizard(getState())) {
                const page = title || location as unknown as string
                sendChatMessage({
                    text: [["plaintext", ["Curriculum Page " + page]]],
                    sender: selectUserName(getState()),
                    date: Date.now(),
                } as CaiMessage, "curriculum")
            }
        }
    }
)

const checkForCodeUpdates = createAsyncThunk<void, void, ThunkAPI>(
    "cai/checkForCodeUpdates",
    () => {
        dialogue.checkForCodeUpdates(getContents())
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
