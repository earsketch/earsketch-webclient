import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { Script } from "common"
import * as editor from "../ide/Editor"
import * as layout from "../ide/layoutState"
import * as tabs from "../ide/tabState"
import * as userProject from "../app/userProject"
import { sampleScript } from "./bubbleData"
import { RootState, ThunkAPI } from "../reducers"
import { BrowserTabType } from "../ide/layoutState"
import i18n from "i18next"

interface BubbleState {
    active: boolean
    currentPage: number,
    readyToProceed: true,
    language: "Python" | "JavaScript"
}

const bubbleSlice = createSlice({
    name: "bubble",
    initialState: {
        active: false,
        currentPage: 0,
        readyToProceed: true,
        language: "Python",
    } as BubbleState,
    reducers: {
        reset(state) {
            state.active = false
            state.currentPage = 0
            state.readyToProceed = true
            state.language = "Python"
        },
        resume(state) { state.active = true },
        suspend(state) { state.active = false },
        increment(state) { state.currentPage++ },
        setReady(state, { payload }) { state.readyToProceed = payload },
        setLanguage(state, { payload }) { state.language = payload },
    },
})

export default bubbleSlice.reducer
export const { reset, resume, suspend, increment, setReady, setLanguage } = bubbleSlice.actions

const createSampleScript = createAsyncThunk(
    "bubble/createSampleScript",
    (_, { getState, dispatch }) => {
        const { bubble: { language } } = getState() as { bubble: BubbleState }
        const fileName = `${i18n.t("bubble:script.name")}.${language === "Python" ? "py" : "js"}`
        const code = sampleScript[language.toLowerCase()]
        return userProject.saveScript(fileName, code, true)
            .then((script: Script) => {
                dispatch(tabs.setActiveTabAndEditor(script.shareid))
            })
    }
)

// TODO: Should be an action in the editor reducer.
const setEditorReadOnly = createAsyncThunk(
    "bubble/setEditorWritable",
    async (payload: boolean) => {
        return new Promise(resolve => {
            editor.setReadOnly(payload)
            setTimeout(resolve, 100)
        })
    }
)

export const dismissBubble = createAsyncThunk<void, void, ThunkAPI>(
    "bubble/dismissBubble",
    (_, { dispatch, getState }) => {
        if (getState().bubble.currentPage !== 0) {
            dispatch(setEditorReadOnly(false))
        }
        dispatch(suspend())
    }
)

export const proceed = createAsyncThunk(
    "bubble/proceed",
    async (payload, { getState, dispatch }) => {
        const { bubble: { currentPage, readyToProceed } } = getState() as { bubble: BubbleState }

        if (!readyToProceed) {
            return
        }

        switch (currentPage) {
            case 0:
                await dispatch(layout.setWest({ open: false }))
                await dispatch(layout.setEast({ open: false }))
                await dispatch(createSampleScript())
                await dispatch(setEditorReadOnly(true))
                break
            case 1:
                dispatch(setReady(false))
                break
            case 2:
            case 3:
            case 4:
                break
            case 5:
                await dispatch(layout.setWest({ open: true, kind: BrowserTabType.Sound }))
                break
            case 6:
                await dispatch(layout.setWest({ open: true, kind: BrowserTabType.Script }))
                break
            case 7:
                await dispatch(layout.setEast({ open: true }))
                break
            case 8:
                await dispatch(setEditorReadOnly(false))
                break
            default:
                return
        }

        dispatch(increment())
    }
)

export const selectActive = (state: RootState) => state.bubble.active
export const selectCurrentPage = (state: RootState) => state.bubble.currentPage
export const selectReadyToProceed = (state: RootState) => state.bubble.readyToProceed
