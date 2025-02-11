import React, { useState, useRef, useEffect, ChangeEvent } from "react"

import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as caiState from "../cai/caiState"
import * as caiThunks from "../cai/caiThunks"
import { SoundBrowser } from "../browser/Sounds"
import { ScriptBrowser } from "../browser/Scripts"
import { APIBrowser } from "../browser/API"
import type { RootState } from "../reducers"
import { Collapsed } from "../browser/Utils"
import { BrowserTabType } from "../browser/BrowserTab"
import * as tabState from "../ide/tabState"
import { addUIClick } from "../cai/dialogue/student"
import * as soundsThunks from "../browser/soundsThunks"
import store, { persistor } from "../reducers"

import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"


import { ListOnScrollProps, VariableSizeList as List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import classNames from "classnames"


import * as sounds from "./soundsState"

import { reloadRecommendations } from "../app/reloadRecommender"
import * as editor from "../ide/Editor"
import * as user from "../user/userState"
import * as tabs from "../ide/tabState"

import type { SoundEntity } from "common"

import { SearchBar } from "../browser/Utils"
import { createAsyncThunk } from "@reduxjs/toolkit"

import context from "../audio/context"
import * as audioLibrary from "../app/audiolibrary"
import { SoundEntity } from "common"
import { fillDict } from "../app/recommender"
import { ThunkAPI } from "../reducers"
import { get, postAuth } from "../request"
import {
    addFavorite,
    deleteUserSound,
    removeFavorite,
    renameUserSound,
    resetPreview,
    selectAllEntities,
    selectPreview,
    setStandardSounds,
    setFavorites,
    setPreviewNodes,
    setUserSounds,
    setPreview,
    Preview,
} from "../browser/soundsState"
import { beatStringToArray } from "../esutils"
import _ from "lodash"

import { createSlice, createSelector } from "@reduxjs/toolkit"
import { createSelectorCreator, defaultMemoize } from "reselect"
import { pickBy, isEqual } from "lodash"

import { fromEntries } from "../esutils"

import { keyLabelToNumber, keyNumberToLabel, splitEnharmonics } from "../app/recommender"

store.dispatch(soundsThunks.getStandardSounds())
export const Companion = () => {
    useEffect(() => {
        document.getElementById("loading-screen")!.style.display = "none"
    })
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const theme = useSelector(appState.selectColorTheme)
    const open = useSelector((state: RootState) => state.layout.west.open)
    let kind: BrowserTabType = useSelector(layout.selectWestKind)
    if (!Object.values(BrowserTabType).includes(kind)) {
        kind = BrowserTabType.Sound
    }

    return <div
        className={`flex flex-col h-full w-full text-left font-sans ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}
        id="content-manager">
        <div className={"flex flex-col h-full" + (open ? "" : " hidden")}>
            <TitleBar />
            <BrowserTabs />
            {Object.entries(BrowserComponents).map(([type, TabBody]) =>
                <div key={type} className={"flex flex-col grow min-h-0" + (+type === kind ? "" : " hidden")}><TabBody /></div>)}
        </div>
        {!open && <Collapsed title={t("contentManager.title").toLocaleUpperCase()} position="west" />}
    </div>
}
export const TitleBar = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div
            className="flex justify-between text-center text-white bg-blue"
            id="browser-tabs"
            role="tablist"
            aria-label="Content manager tabs"
            style={{
                minHeight: "fit-content", // Safari-specific issue
            }}
        >
        </div>
    )
}

const BrowserTab = ({ name, type, children }: { name: string, type: BrowserTabType, children: React.ReactNode }) => {
    const dispatch = useDispatch()
    const isSelected = useSelector(layout.selectWestKind) === type
    const highlight = useSelector(caiState.selectHighlight).zone === name.toLowerCase()
    const activeProject = useSelector(tabState.selectActiveTabID)

    const { t } = useTranslation()

    return (
        <button
            id={name}
            className={`px-1 py-2 w-1/3 cursor-pointer ${isSelected ? "text-amber border-amber border-b-4" : (highlight ? "border-yellow-400 border-4" : "border-b-4 border-transparent")} truncate`}
            style={isSelected
                ? {
                    color: "#F5AE3C",
                    borderColor: "#F5AE3C",
                }
                : {}}
            onClick={() => {
                dispatch(layout.setWest({
                    open: true,
                    kind: type,
                }))
                if (!isSelected) { addUIClick(name + " tab") }
                if (highlight) {
                    if (type === 1) {
                        dispatch(caiThunks.highlight({ zone: "script", id: activeProject || undefined }))
                    } else {
                        dispatch(caiThunks.highlight({ zone: "apiSearchBar" }))
                    }
                }
            }}
            title={t("contentManager.openTab", { name })}
            aria-label={t("contentManager.openTab", { name })}
            role="tab"
            aria-selected={isSelected ? "true" : "false"}
            aria-controls={"panel-" + type}
        >
            <h3 className="text-sm truncate">
                {children}
                {name}
            </h3>
        </button>
    )
}

export const BrowserTabs = () => {
    const { t } = useTranslation()
    return (
        <div
            className="flex justify-center text-center text-white bg-blue"
            id="browser-tabs"
            role="tablist"
            aria-label="Content manager tabs"
            style={{
                minHeight: "fit-content", // Safari-specific issue
            }}
        >
            <BrowserTab name={t("soundBrowser.title").toLocaleUpperCase()} type={BrowserTabType.Sound}>
                <i className="icon-headphones pr-2" />
            </BrowserTab>

            <BrowserTab name="API" type={BrowserTabType.API}>
                <i className="icon-book pr-2" />
            </BrowserTab>
        </div>
    )
}
export const Header = ({ title }: { title: string }) => (
    <div className="p-1 hidden">{title}</div>
)


// Keys are weirdly all caps because of the shared usage in the layout reducer as well as component's title-bar prop.
const BrowserComponents: { [key in BrowserTabType]: React.FC } = {
    [BrowserTabType.Sound]: SoundBrowser,
    [BrowserTabType.Script]: ScriptBrowser,
    [BrowserTabType.API]: APIBrowser,
}




