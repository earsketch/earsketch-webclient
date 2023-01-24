import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "../reducers"
import { isDone } from "./dialogue"
import { CodeFeatures } from "./complexityCalculator"
import { SoundProfile } from "./analysis"

interface caiState {
    activeProject: string
    messageList: { [key: string]: CAIMessage [] }
    inputOptions: CAIButton []
    errorOptions: CAIButton []
    dropupLabel: string
    highlight: string | null
    // For Wizard of Oz Studies
    wizard: boolean
    curriculumView: string
    responseOptions: CAIMessage []
    projectHistories: { [ key: string ]: CodeFeatures[] }
    soundHistories: { [ key: string ]: SoundProfile[] }
    recentProjects: CodeFeatures[]
}

const caiSlice = createSlice({
    name: "cai",
    initialState: {
        activeProject: "",
        messageList: { "": [] },
        inputOptions: [],
        errorOptions: [],
        dropupLabel: "",
        highlight: null,
        wizard: location.href.includes("wizard"),
        curriculumView: "",
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
                    { label: "i think we're close to done", value: "wrapup" },
                    { label: "can you help me code something?", value: "help" },
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
            if (!state.messageList[state.activeProject]) {
                state.messageList[state.activeProject] = []
            }
            state.messageList[state.activeProject] = payload
        },
        addToMessageList(state, { payload }) {
            if (!payload.activeProject) {
                payload.activeProject = state.activeProject
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
                messageList: { "": [] },
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

export const selectResponseOptions = (state: RootState) => state.cai.responseOptions
