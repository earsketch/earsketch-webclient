import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "../reducers"
import { Report } from "./analysis"
import { CodeFeatures } from "./complexityCalculator"
import { state as dialogueState } from "./dialogue/state"

interface ProjectState {
    messageList: CaiMessage []
    inputOptions: CaiButton []
    errorOptions: CaiButton []
    dropupLabel: string
    projectHistory: CodeFeatures []
    soundHistory: Report []
}

interface caiState {
    activeProject: string
    // for Dialogue
    highlight: CaiHighlight
    project: { [key: string]: ProjectState }
    // For Wizard of Oz Studies
    wizard: boolean
    curriculumView: string
    hasSwitchedToCurriculum: boolean
    hasSwitchedToCai: boolean
    responseOptions: CaiMessage []
    recentProjects: CodeFeatures []
}

const initialState: caiState = {
    activeProject: "",
    highlight: { zone: null },
    project: {},
    wizard: location.href.includes("wizard"),
    curriculumView: "",
    hasSwitchedToCurriculum: false,
    hasSwitchedToCai: false,
    responseOptions: [],
    recentProjects: [],
}

const caiSlice = createSlice({
    name: "cai",
    initialState,
    reducers: {
        setActiveProject(state, { payload }) {
            if (!state.project[payload]) {
                state.project[payload] = {
                    messageList: [],
                    inputOptions: [],
                    errorOptions: [],
                    dropupLabel: "",
                    projectHistory: [],
                    soundHistory: [],
                }
            }
            state.activeProject = payload
        },
        setInputOptions(state, { payload }) {
            if (!payload.activeProject) {
                payload.activeProject = state.activeProject
            }
            if (payload.activeProject === "") {
                state.project[payload.activeProject].inputOptions = []
                state.project[payload.activeProject].dropupLabel = ""
            } else if (payload.options.length === 0 && state.project[payload.activeProject].messageList.length > 0 && !dialogueState[payload.activeProject].isDone) {
                state.project[payload.activeProject].inputOptions = [
                    { label: "what do you think we should do next?", value: "suggest" },
                    { label: "do you want to come up with some sound ideas?", value: "sound_select" },
                    { label: "i have a genre in mind", value: "genre" },
                    { label: "i think we're close to done", value: "wrapup" },
                ]
                state.project[payload.activeProject].dropupLabel = ""
            } else {
                state.project[payload.activeProject].inputOptions = payload.options
            }
        },
        setErrorOptions(state, { payload }) {
            if (!payload.activeProject) {
                payload.activeProject = state.activeProject
            }
            state.project[payload.activeProject].errorOptions = payload.options
        },
        addToMessageList(state, { payload }) {
            if (!payload.activeProject) {
                payload.activeProject = state.activeProject
            }
            state.project[payload.activeProject].messageList.push(payload.message)
        },
        setMessageList(state, { payload }) {
            if (!state.project[state.activeProject].messageList) {
                state.project[state.activeProject].messageList = []
            }
            state.project[state.activeProject].messageList = payload
        },
        setDropupLabel(state, { payload }) {
            if (!payload.activeProject) {
                payload.activeProject = state.activeProject
            }
            state.project[payload.activeProject].dropupLabel = payload.label
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
        addToProjectHistory(state, { payload }) {
            state.project[state.activeProject].projectHistory.push(payload)
        },
        addToSoundHistory(state, { payload }) {
            state.project[state.activeProject].soundHistory.push(payload)
        },
        setRecentProjects(state, { payload }) {
            if (payload && state.recentProjects.length > 9) {
                state.recentProjects.pop()
            }
            state.recentProjects.unshift(payload)
        },
        resetState(state) {
            Object.assign(state, { ...initialState })
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
    setErrorOptions,
    setMessageList,
    addToMessageList,
    setDropupLabel,
    setHighlight,
    setResponseOptions,
    setCurriculumView,
    setHasSwitchedToCurriculum,
    setHasSwitchedToCai,
    resetState,
    addToProjectHistory,
    addToSoundHistory,
    setRecentProjects,
} = caiSlice.actions

export const selectActiveProject = (state: RootState) => state.cai.activeProject

export const selectHighlight = (state: RootState) => state.cai.highlight

export const selectMessageList = (state: RootState) => state.cai.activeProject ? state.cai.project[state.cai.activeProject].messageList : []

export const selectInputOptions = (state: RootState) => state.cai.activeProject ? state.cai.project[state.cai.activeProject].inputOptions : []

export const selectDropupLabel = (state: RootState) => state.cai.activeProject ? state.cai.project[state.cai.activeProject].dropupLabel : ""

export const selectErrorOptions = (state: RootState) => state.cai.activeProject ? state.cai.project[state.cai.activeProject].errorOptions : []

export const selectProjectHistory = (state: RootState, project?: string) => state.cai.project[project || state.cai.activeProject].projectHistory || []

export const selectSoundHistory = (state: RootState, project?: string) => state.cai.project[project || state.cai.activeProject].soundHistory || []

export const selectRecentProjects = (state: RootState) => state.cai.recentProjects

export const selectWizard = (state: RootState) => state.cai.wizard

export const selectCurriculumView = (state: RootState) => state.cai.curriculumView

export const selectSwitchedToCurriculum = (state: RootState) => state.cai.hasSwitchedToCurriculum

export const selectSwitchedToCai = (state: RootState) => state.cai.hasSwitchedToCai

export const selectResponseOptions = (state: RootState) => state.cai.responseOptions
