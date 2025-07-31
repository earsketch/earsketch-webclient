import { useEffect } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { Collapsed } from "../browser/Utils"

import "@webscopeio/react-textarea-autocomplete/style.css"

import * as appState from "../app/appState"
import * as curriculum from "../browser/curriculumState"
import * as layout from "../ide/layoutState"
import * as tabs from "../ide/tabState"
import { CaiBody, CaiHeader } from "./CAI"
import * as caiThunks from "./caiThunks"

export const Chat = () => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const activeScript = useSelector(tabs.selectActiveTabScript)?.name
    const curriculumLocation = useSelector(curriculum.selectCurrentLocation)
    const curriculumPage = useSelector(curriculum.selectPageTitle)
    const showCai = useSelector(layout.selectEastKind) === "CAI"

    useEffect(() => {
        dispatch(caiThunks.caiSwapTab(activeScript || ""))
    }, [activeScript])

    useEffect(() => {
        dispatch(caiThunks.curriculumPage([curriculumLocation, curriculumPage]))
    }, [curriculumPage])

    useEffect(() => {
        if (showCai) {
            dispatch(caiThunks.closeCurriculum())
        }
    }, [showCai])

    return paneIsOpen
        ? (
            <div className={`font-sans h-full flex flex-col ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}>
                <CaiHeader />
                <CaiBody />
            </div>
        )
        : <Collapsed title="CAI" position="east" />
}
