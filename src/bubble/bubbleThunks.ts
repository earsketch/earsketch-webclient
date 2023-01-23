import { createAsyncThunk } from "@reduxjs/toolkit"
import i18n from "i18next"

import * as editor from "../ide/Editor"
import * as layout from "../ide/layoutState"
import * as scriptsThunks from "../browser/scriptsThunks"
import { setActiveTabAndEditor } from "../ide/tabThunks"
import { sampleScript } from "./bubbleData"
import { ThunkAPI } from "../reducers"
import { BrowserTabType } from "../browser/BrowserTab"
import { BubbleState, suspend, setReady, increment } from "./bubbleState"

const createSampleScript = createAsyncThunk(
    "bubble/createSampleScript",
    async (_, { getState, dispatch }) => {
        const { bubble: { language } } = getState() as { bubble: BubbleState }
        const fileName = `${i18n.t("bubble:script.name")}.${language === "Python" ? "py" : "js"}`
        const code = sampleScript[language.toLowerCase()]
        const script = await dispatch(scriptsThunks.saveScript({ name: fileName, source: code, creator: "earsketch" })).unwrap()
        dispatch(setActiveTabAndEditor(script.shareid))
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

export const dismiss = createAsyncThunk<void, void, ThunkAPI>(
    "bubble/dismiss",
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
        const { bubble: { currentPage, readyToProceed } } = getState() as { bubble: BubbleState; }

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
