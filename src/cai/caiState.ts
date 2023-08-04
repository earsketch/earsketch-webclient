import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "../reducers"
import { Report } from "./analysis"
import { CodeFeatures } from "./complexityCalculator"
import { isDone } from "./dialogue"

interface caiState {
    activeProject: string
    messageList: { [key: string]: CaiMessage [] }
    inputOptions: CaiButton []
    // for Error Handling
    currentError: any
    errorText: string
    textArray: string []
    errorLine: string
    errorOptions: CaiButton []
    dropupLabel: string
    highlight: CaiHighlight
    // For Wizard of Oz Studies
    wizard: boolean
    curriculumView: string
    hasSwitchedToCurriculum: boolean
    hasSwitchedToCai: boolean
    responseOptions: CaiMessage []
    projectHistories: { [ key: string ]: CodeFeatures[] }
    soundHistories: { [ key: string ]: Report[] }
    recentProjects: CodeFeatures[]
}

const caiSlice = createSlice({
    name: "cai",
    initialState: {
        activeProject: "",
        messageList: { },
        inputOptions: [],
        currentError: null,
        errorText: "",
        textArray: [],
        errorLine: "",
        errorOptions: [],
        dropupLabel: "",
        highlight: { zone: null },
        wizard: location.href.includes("wizard"),
        curriculumView: "",
        hasSwitchedToCurriculum: false,
        hasSwitchedToCai: false,
        responseOptions: [],
        showMenu: false,
        projectHistories: {},
        soundHistories: {},
        recentProjects: [],
    } as caiState,
    reducers: {
        setActiveProject(state, { payload }) {
            state.activeProject = payload
        },
        setInputOptions(state, { payload }) {
            if (!state.activeProject || state.activeProject === "") {
                state.inputOptions = []
                state.dropupLabel = ""
            } else if (payload.length === 0 && state.messageList[state.activeProject].length > 0 && !isDone) {
                state.inputOptions = [
                    { label: "what do you think we should do next?", value: "suggest" },
                    { label: "do you want to come up with some sound ideas?", value: "sound_select" },
                    { label: "i have a genre in mind", value: "genre" },
                    { label: "i think we're close to done", value: "wrapup" },
                ]
                state.dropupLabel = ""
            } else {
                state.inputOptions = payload
            }
        },
        setCurrentError(state, { payload }) {
            state.currentError = payload
        },
        setErrorText(state, { payload }) {
            state.errorText = payload
        },
        setTextArray(state, { payload }) {
            state.textArray = payload
        },
        setErrorLine(state, { payload }) {
            state.errorLine = payload
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
            if (!payload.activeProject) {
                payload.activeProject = state.activeProject
            }
            if (!state.messageList[payload.activeProject]) {
                state.messageList[payload.activeProject] = []
            }
            state.messageList[payload.activeProject].push(payload.message)
        },
        clearMessageList(state) {
            state.messageList = {}
        },
        setDropupLabel(state, { payload }) {
            state.dropupLabel = payload
        },
        setHighlight(state, { payload }) {
            state.highlight = payload
        },
        setResponseOptions(state, { payload }) {
            state.responseOptions = payload
        },
        setCurriculumView(state, { payload }) {
            state.curriculumView = payload
        },
        setHasSwitchedToCurriculum(state, { payload }) {
            state.hasSwitchedToCurriculum = payload
        },
        setHasSwitchedToCai(state, { payload }) {
            state.hasSwitchedToCai = payload
        },
        setProjectHistories(state, { payload }) {
            if (!state.projectHistories[state.activeProject]) {
                state.projectHistories[state.activeProject] = []
            }
            state.projectHistories[state.activeProject].push(payload)
        },
        setSoundHistories(state, { payload }) {
            if (!state.soundHistories[state.activeProject]) {
                state.soundHistories[state.activeProject] = []
            }
            state.soundHistories[state.activeProject].push(payload)
        },
        setRecentProjects(state, { payload }) {
            if (payload && state.recentProjects.length > 9) {
                state.recentProjects.pop()
            }
            state.recentProjects.unshift(payload)
        },
        resetState(state) {
            Object.assign(state, {
                activeProject: "",
                messageList: {},
                inputOptions: [],
                errorOptions: [],
                dropupLabel: "",
                wizard: location.href.includes("wizard"),
                curriculumView: "",
                projectHistories: {},
                recentProjects: [],
            })
        },
    },
})

export interface CaiButton {
    label: string
    value: string
}

export interface CaiMessage {
    sender: string
    text: any[]
    date: number
}

export const combineMessageText = (input: CaiMessage) => {
    let output = ""
    for (const subText of input.text) {
        output = output + subText[1][0]
    }
    return output
}

export const highlightLocations = {
    scripts: "first, open the scripts tab",
    api: "first, open the API tab",
    script: "select your current project: ",
    history: "now select the history for ",
    apiSearchBar: "you can use the API search bar to look up EarSketch functions",
    curriculumButton: "press the chat bubble icon at the top of the page to switch to the curriculum and back",
    curriculumSearchBar: "you can use the curriculum search bar to look up what you need",
}

type HighlightOption = keyof typeof highlightLocations | null

export interface CaiHighlight {
    zone: HighlightOption | null,
    id?: string,
}

export default caiSlice.reducer
export const {
    setActiveProject,
    setInputOptions,
    setCurrentError,
    setErrorText,
    setTextArray,
    setErrorLine,
    setErrorOptions,
    setMessageList,
    addToMessageList,
    clearMessageList,
    setDropupLabel,
    setHighlight,
    setResponseOptions,
    setCurriculumView,
    setHasSwitchedToCurriculum,
    setHasSwitchedToCai,
    resetState,
    setProjectHistories,
    setSoundHistories,
    setRecentProjects,
} = caiSlice.actions

export const selectActiveProject = (state: RootState) => state.cai.activeProject

export const selectInputOptions = (state: RootState) => state.cai.inputOptions

export const selectCurrentError = (state: RootState) => state.cai.currentError

export const selectErrorText = (state: RootState) => state.cai.errorText

export const selectTextArray = (state: RootState) => state.cai.textArray

export const selectErrorLine = (state: RootState) => state.cai.errorLine

export const selectErrorOptions = (state: RootState) => state.cai.errorOptions

export const selectDropupLabel = (state: RootState) => state.cai.dropupLabel

export const selectHighlight = (state: RootState) => state.cai.highlight

export const selectMessageList = (state: RootState) => state.cai.messageList

export const selectProjectHistories = (state: RootState) => state.cai.projectHistories

export const selectSoundHistories = (state: RootState) => state.cai.soundHistories

export const selectRecentProjects = (state: RootState) => state.cai.recentProjects

export const selectWizard = (state: RootState) => state.cai.wizard

export const selectCurriculumView = (state: RootState) => state.cai.curriculumView

export const selectSwitchedToCurriculum = (state: RootState) => state.cai.hasSwitchedToCurriculum

export const selectSwitchedToCai = (state: RootState) => state.cai.hasSwitchedToCai

export const selectResponseOptions = (state: RootState) => state.cai.responseOptions
