import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "../reducers"
import { isDone } from "./dialogue"

interface caiState {
    activeProject: string
    messageList: { [key: string]: CAIMessage [] }
    inputOptions: CAIButton []
    errorOptions: CAIButton []
    dropupLabel: string
    // For Wizard of Oz Studies
    wizard: boolean
    curriculumView: string
    responseOptions: CAIMessage []
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
            } else if (payload.length === 0 && state.messageList[state.activeProject].length > 0 && !isDone) {
                state.inputOptions = [
                    { label: "what do you think we should do next?", value: "suggest" },
                    { label: "do you want to come up with some sound ideas?", value: "sound_select" },
                    { label: "i think we're close to done", value: "wrapup" },
                    { label: "i have some ideas about our project", value: "properties" },
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
