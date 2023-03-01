import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "../reducers"
import { isDone } from "./dialogue"
import { CodeFeatures } from "./complexityCalculator"
import { Report } from "./analysis"

interface caiState {
    activeProject: string
    messageList: { [key: string]: CAIMessage [] }
    inputOptions: CAIButton []
    errorOptions: CAIButton []
    inputDisabled: boolean
    dropupLabel: string
    highlight: string | null
    // For Wizard of Oz Studies
    wizard: boolean
    curriculumView: string
    switchedToCurriculum: boolean
    switchedToCAI: boolean
    responseOptions: CAIMessage []
    projectHistories: { [ key: string ]: CodeFeatures[] }
    soundHistories: { [ key: string ]: Report[] }
    recentProjects: CodeFeatures[]
}

const caiSlice = createSlice({
    name: "cai",
    initialState: {
        activeProject: "",
        messageList: { NLU: [] },
        inputOptions: [],
        errorOptions: [],
        inputDisabled: FLAGS.SHOW_NLU,
        dropupLabel: "",
        highlight: null,
        wizard: location.href.includes("wizard"),
        curriculumView: "",
        switchedToCurriculum: false,
        switchedToCAI: false,
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
        setErrorOptions(state, { payload }) {
            state.errorOptions = payload
        },
        setMessageList(state, { payload }) {
            const activeProject = FLAGS.SHOW_NLU ? "NLU" : state.activeProject
            if (!state.messageList[activeProject]) {
                state.messageList[activeProject] = []
            }
            state.messageList[activeProject] = payload
        },
        addToMessageList(state, { payload }) {
            payload.activeProject = FLAGS.SHOW_NLU ? "NLU" : payload.activeProject || state.activeProject

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
        setInputDisabled(state, { payload }) {
            state.inputDisabled = payload
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
        setSwitchedToCurriculum(state, { payload }) {
            state.switchedToCurriculum = payload
        },
        setSwitchedToCAI(state, { payload }) {
            state.switchedToCAI = payload
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
                messageList: { NLU: [] },
                inputOptions: [],
                errorOptions: [],
                inputDisabled: false,
                dropupLabel: "",
                wizard: location.href.includes("wizard"),
                curriculumView: "",
                projectHistories: {},
                recentProjects: [],
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

export const combineMessageText = (input: CAIMessage) => {
    let output = ""
    for (const subText of input.text) {
        output = output + subText[1][0]
    }
    return output
}

export default caiSlice.reducer
export const {
    setActiveProject,
    setInputOptions,
    setErrorOptions,
    setMessageList,
    addToMessageList,
    clearMessageList,
    setDropupLabel,
    setHighlight,
    setResponseOptions,
    setCurriculumView,
    setInputDisabled,
    setSwitchedToCurriculum,
    setSwitchedToCAI,
    resetState,
    setProjectHistories,
    setSoundHistories,
    setRecentProjects,
} = caiSlice.actions

export const selectActiveProject = (state: RootState) => state.cai.activeProject

export const selectInputOptions = (state: RootState) => state.cai.inputOptions

export const selectErrorOptions = (state: RootState) => state.cai.errorOptions

export const selectDropupLabel = (state: RootState) => state.cai.dropupLabel

export const selectHighlight = (state: RootState) => state.cai.highlight

export const selectMessageList = (state: RootState) => state.cai.messageList

export const selectProjectHistories = (state: RootState) => state.cai.projectHistories

export const selectSoundHistories = (state: RootState) => state.cai.soundHistories

export const selectRecentProjects = (state: RootState) => state.cai.recentProjects

export const selectWizard = (state: RootState) => state.cai.wizard

export const selectCurriculumView = (state: RootState) => state.cai.curriculumView

export const selectSwitchedToCurriculum = (state: RootState) => state.cai.switchedToCurriculum

export const selectSwitchedToCAI = (state: RootState) => state.cai.switchedToCAI

export const selectResponseOptions = (state: RootState) => state.cai.responseOptions

export const selectInputDisabled = (state: RootState) => state.cai.inputDisabled
