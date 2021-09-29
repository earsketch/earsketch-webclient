import React, { useEffect, useState, useRef, ChangeEvent } from "react"
import { hot } from "react-hot-loader/root"
import { useSelector, useDispatch } from "react-redux"

import * as appState from "../app/appState"
import { SearchBar, Collapsed } from "./Browser"
import * as curriculum from "./curriculumState"
import * as ESUtils from "../esutils"
import { importScript } from "../ide/IDE"
import * as layout from "../ide/layoutState"
import * as userNotification from "../user/notification"
import { OLD_CURRICULUM_LOCATIONS } from "../data/old_curriculum"
import { useHeightLimiter } from "../Utils"
import { useTranslation } from "react-i18next"

const SECTION_URL_CHARACTER = ":"

const copyURL = (language: string, currentLocation: number[]) => {
    const page = urlToPermalink(curriculum.getURLForLocation(currentLocation))
    const url = `${SITE_BASE_URI}/?curriculum=${page}&language=${language}`
    navigator.clipboard.writeText(url)
    userNotification.show("Curriculum URL was copied to the clipboard")
}

const urlToPermalink = (url: string) => {
    return url
        .replace(".html", "")
        .replace("#", SECTION_URL_CHARACTER)
}

const getPermalinkParts = (permalink: string) => {
    return permalink.split(SECTION_URL_CHARACTER)
}

const permalinkToURL = (permalink: string) => {
    const linkParts = getPermalinkParts(permalink)
    linkParts[0] += ".html"
    if (linkParts.length === 2) {
        linkParts[0] += "#"
    }
    return linkParts.join("")
}

const checkLegacyURLs = (permalink: string) => {
    const linkParts = getPermalinkParts(permalink)
    // first check to see if the full permalink exists in our legacy mapping
    let url = OLD_CURRICULUM_LOCATIONS[permalink]
    if (url !== undefined) {
        return url
    }
    // if not, and if the permalink includes a section hash,
    // then check if just the portion to the left of the hash exists in our legacy mapping
    if (linkParts.length === 2) {
        url = OLD_CURRICULUM_LOCATIONS[linkParts[0]]
        if (url !== undefined) {
            url += "#" + linkParts[1]
        }
    }
    // url will be undefined if we don't have a legacy mapping for it, and then we attempt to load url as-is
    return url
}

const TableOfContentsChapter = ({ unitIdx, ch, chIdx }: { unitIdx: string, ch: curriculum.TOCItem, chIdx: string }) => {
    const dispatch = useDispatch()
    const focus = useSelector(curriculum.selectFocus)
    const theme = useSelector(appState.selectColorTheme)
    const textClass = "text-" + (theme === "light" ? "black" : "white")
    const chNumForDisplay = curriculum.getChNumberForDisplay(unitIdx, chIdx)
    return (
        <li className="toc-chapters py-1" onClick={(e) => { e.stopPropagation(); dispatch(curriculum.toggleFocus([unitIdx, chIdx])) }}>
            <div className="toc-item">
                &emsp;
                {ch.sections && ch.sections.length > 0 &&
                <button><i className={`pr-1 icon icon-arrow-${focus[1] === chIdx ? "down" : "right"}`} /></button>}
                <a href="#" className={textClass} onClick={e => { e.preventDefault(); dispatch(curriculum.fetchContent({ location: [unitIdx, chIdx], url: ch.URL })) }}>
                    {chNumForDisplay}{chNumForDisplay && <span>. </span>}{ch.title}
                </a>
            </div>
            <ul>
                {focus[1] === chIdx && ch.sections &&
                Object.entries(ch.sections).map(([secIdx, sec]: [string, curriculum.TOCItem]) =>
                    <li key={secIdx} className="toc-sections py-1">
                        <div className="toc-item">
                            &emsp;&emsp;
                            <a href="#" className={textClass} onClick={(e) => { e.preventDefault(); e.stopPropagation(); dispatch(curriculum.fetchContent({ location: [unitIdx, chIdx, secIdx], url: sec.URL })) }}>
                                {chNumForDisplay}{chNumForDisplay && <span>.</span>}{+secIdx + 1} {sec.title}
                            </a>
                        </div>
                    </li>
                )}
            </ul>
        </li>
    )
}

const TableOfContents = () => {
    const dispatch = useDispatch()
    const focus = useSelector(curriculum.selectFocus)
    const theme = useSelector(appState.selectColorTheme)
    const toc = useSelector(curriculum.selectTableOfContents)
    const { t } = useTranslation()
    const textClass = "text-" + (theme === "light" ? "black" : "white")
    return (
        <>
            <div className="inline-block font-bold text-center w-full">{t("curriculum.toc")}</div>
            <hr className={`border-1 my-2 ${theme === "light" ? " border-black" : "border-white"}`} />
            <ul id="toc" className="select-none">
                {Object.entries(toc).map(([unitIdx, unit]: [string, curriculum.TOCItem]) => (
                    <li key={unitIdx} className="p-2" onClick={() => dispatch(curriculum.toggleFocus([unitIdx, null]))}>
                        <div className="toc-item">
                            {unit.chapters && unit.chapters.length > 0 &&
                            <button><i className={`pr-1 icon icon-arrow-${focus[0] === unitIdx ? "down" : "right"}`} /></button>}
                            <a href="#" className={textClass} onClick={e => { e.preventDefault(); dispatch(curriculum.fetchContent({ location: [unitIdx], url: unit.URL })) }}>{unit.title}</a>
                        </div>
                        <ul>
                            {focus[0] === unitIdx && unit.chapters &&
                        Object.entries(unit.chapters).map(([chIdx, ch]) => <TableOfContentsChapter key={chIdx} {...{ unit, unitIdx, ch, chIdx }} />)}
                        </ul>
                    </li>
                ))}
            </ul>
        </>
    )
}

const CurriculumHeader = () => {
    const dispatch = useDispatch()

    return (
        <div id="curriculum-header" style={{ position: "relative" }}>
            <TitleBar />
            <NavigationBar />

            <div onFocus={() => dispatch(curriculum.showResults(true))}
                onBlur={(e: React.FocusEvent<HTMLDivElement>) => (!e.currentTarget.contains(e.relatedTarget as Node)) && dispatch(curriculum.showResults(false))}>
                <CurriculumSearchBar />
                <CurriculumSearchResults />
            </div>
        </div>
    )
}

const CurriculumSearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(curriculum.selectSearchText)
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(curriculum.setSearchText(event.target.value))
    const dispatchReset = () => dispatch(curriculum.setSearchText(""))
    return <SearchBar {... { searchText, dispatchSearch, dispatchReset }} />
}

const CurriculumSearchResults = () => {
    const dispatch = useDispatch()
    const results = useSelector(curriculum.selectSearchResults)
    const showResults = useSelector(curriculum.selectShowResults) && (results.length > 0)
    const theme = useSelector(appState.selectColorTheme)
    const [resultsRef, resultsStyle] = useHeightLimiter(showResults)

    return showResults
        ? (
            <div ref={resultsRef} className={`absolute z-50 bg-white w-full border-b border-black ${theme === "light" ? "bg-white" : "bg-gray-900"}`} style={resultsStyle}>
                {results.map(result =>
                    <a tabIndex={0} key={result.id} href="#" onClick={e => { e.preventDefault(); dispatch(curriculum.fetchContent({ url: result.id })); dispatch(curriculum.showResults(false)) }}>
                        <div className={`px-5 py-2 search-item ${theme === "light" ? "text-black" : "text-white"}`}>{result.title}</div>
                    </a>)}
            </div>
        )
        : null
}

export const TitleBar = () => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const language = useSelector(appState.selectScriptLanguage)
    const location = useSelector(curriculum.selectCurrentLocation)
    const { t } = useTranslation()

    return (
        <div className="flex items-center p-3 text-2xl">
            <div className="pl-3 pr-4 font-semibold truncate">
                {t("curriculum.title").toLocaleUpperCase()}
            </div>
            <div>
                <div
                    className={`flex justify-end w-12 h-7 p-1 rounded-full cursor-pointer ${theme === "light" ? "bg-black" : "bg-gray-700"}`}
                    onClick={() => dispatch(layout.setEast({ open: false }))}
                >
                    <div className="w-5 h-5 bg-white rounded-full">&nbsp;</div>
                </div>
            </div>
            <div className="ml-auto">
                <button className="px-2 -my-1 align-middle text-3xl" onClick={() => copyURL(language, location)} title={t("curriculum.copyURL")}>
                    <i className="icon icon-link" />
                </button>
                <button className={`border-2 -my-1 ${theme === "light" ? "border-black" : "border-white"} w-16 px-3 rounded-lg text-xl font-bold mx-3 align-text-bottom`}
                    title={t("curriculum.switchScriptLanguage")}
                    onClick={() => {
                        const newLanguage = (language === "python" ? "javascript" : "python")
                        dispatch(appState.setScriptLanguage(newLanguage))
                    }}>
                    {language === "python" ? "PY" : "JS"}
                </button>
            </div>
        </div>
    )
}

const CurriculumPane = () => {
    const { t } = useTranslation()
    const language = useSelector(appState.selectScriptLanguage)
    const fontSize = useSelector(appState.selectFontSize)
    const theme = useSelector(appState.selectColorTheme)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const content = useSelector(curriculum.selectContent)
    const curriculumBody = useRef<HTMLElement>(null)

    useEffect(() => {
        if (content && curriculumBody.current) {
            curriculumBody.current.appendChild(content)
            curriculumBody.current.scrollTop = 0
            return () => content.remove()
        }
    }, [content, paneIsOpen])

    useEffect(() => {
        // <script> tags in the content may add elements to the DOM,
        // so we wrap this in a useEffect() and run it after inserting the content.
        if (content) {
            // Filter content by language.
            const p = (language === "python")
            content.querySelectorAll(".curriculum-python,.copy-btn-python").forEach((e: HTMLElement) => (e.hidden = !p))
            content.querySelectorAll(".curriculum-javascript,.copy-btn-javascript").forEach((e: HTMLElement) => (e.hidden = p))

            // Apply color theme to code blocks.
            if (theme === "light") {
                content.querySelectorAll(".listingblock.curriculum-javascript").forEach((el: HTMLElement) => el.classList.add("default-pygment"))
                content.querySelectorAll(".listingblock.curriculum-python").forEach((el: HTMLElement) => el.classList.add("default-pygment"))
            } else {
                content.querySelectorAll(".listingblock.curriculum-javascript").forEach((el: HTMLElement) => el.classList.remove("default-pygment"))
                content.querySelectorAll(".listingblock.curriculum-python").forEach((el: HTMLElement) => el.classList.remove("default-pygment"))
            }
        }
    }, [content, language, paneIsOpen])

    // GrooveMachine integration, for the "Intro to GrooveMachine" chapter.
    useEffect(() => {
        const frame: HTMLIFrameElement = content?.querySelector("#gmFrame")
        if (!frame) return
        const handleMessage = (message: MessageEvent) => {
            if (message.isTrusted) {
                if (message.data === "langrequest") {
                    frame.contentWindow!.postMessage({ lang: language }, "*")
                } else if (typeof message.data === "string") {
                    importScript(message.data)
                }
            }
        }
        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [content])

    useEffect(() => {
        const frame: HTMLIFrameElement = content?.querySelector("#gmFrame")
        if (frame) frame.contentWindow!.postMessage({ lang: language }, "*")
    }, [language])

    // Highlight search text matches found in the curriculum.
    const hilitor = new Hilitor("curriculum-body")
    const searchText = useSelector(curriculum.selectSearchText)
    hilitor.setMatchType("left")
    useEffect(() => {
        hilitor.apply(searchText)
        return () => hilitor.remove()
    }, [content, searchText])

    return paneIsOpen
        ? (
            <div className={`font-sans h-full flex flex-col ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}>
                <CurriculumHeader />

                <div id="curriculum" className={theme === "light" ? "curriculum-light" : "dark"} style={{ fontSize }}>
                    {content
                        ? <article ref={curriculumBody} id="curriculum-body" className="prose dark:prose-dark px-8 h-full max-w-none overflow-y-auto" style={{ fontSize }} />
                        : <div className="flex flex-col items-center">
                            <div className="text-4xl text-center py-16">Loading curriculum...</div>
                            <div className="animate-spin es-spinner" style={{ width: "90px", height: "90px" }} />
                        </div>}
                </div>
            </div>
        )
        : <Collapsed title={t("curriculum.title").toLocaleUpperCase()} position="east" />
}

const NavigationBar = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const location = useSelector(curriculum.selectCurrentLocation)
    const toc = useSelector(curriculum.selectTableOfContents)
    const tocPages = useSelector(curriculum.selectPages)

    const progress = (location[2] === undefined ? 0 : (+location[2] + 1) / (toc[location[0]]!.chapters?.[location[1]].sections?.length ?? 1))
    const showTableOfContents = useSelector(curriculum.selectShowTableOfContents)
    const pageTitle = useSelector(curriculum.selectPageTitle)
    const theme = useSelector(appState.selectColorTheme)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const [highlight, setHighlight] = useState(false)
    const [dropdownRef, tocStyle] = useHeightLimiter(showTableOfContents, "46px")

    const handleClick = (event: Event & { target: HTMLElement }) => {
        if (!dropdownRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
            dispatch(curriculum.showTableOfContents(false))
        }
    }

    useEffect(() => {
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    return (
        <>
            <div id="curriculum-navigation" className="w-full flex justify-between items-stretch cursor-pointer select-none"
                style={{ backgroundColor: highlight ? "#334657" : "#223546", color: "white" }}
                onMouseEnter={() => setHighlight(true)}
                onMouseLeave={() => setHighlight(false)}>
                {((location + "") === (tocPages[0] + ""))
                    ? <span />
                    : <button className="text-2xl p-3" onClick={() => dispatch(curriculum.fetchContent({ location: curriculum.adjustLocation(location, -1) }))} title={t("curriculum.previousPage")}>
                        <i className="icon icon-arrow-left2" />
                    </button>}
                <button ref={triggerRef} className="w-full" title={t("curriculum.showTOC")} onClick={() => dispatch(curriculum.showTableOfContents(!showTableOfContents))}>
                    {pageTitle}
                    <i className="icon icon-arrow-down2 text-lg p-2" />
                </button>
                {((location + "") === (tocPages[tocPages.length - 1] + ""))
                    ? <span />
                    : <button className="text-2xl p-3" onClick={() => dispatch(curriculum.fetchContent({ location: curriculum.adjustLocation(location, +1) }))} title={t("curriculum.nextPage")}>
                        <i className="icon icon-arrow-right2" />
                    </button>}
            </div>
            <div className={`z-50 pointer-events-none absolute w-full px-4 py-3 ${showTableOfContents ? "" : "hidden"}`}>
                <div ref={dropdownRef} style={tocStyle}
                    className={`w-full pointer-events-auto p-5 border border-black bg-${theme === "light" ? "white" : "black"}`}>
                    <TableOfContents />
                </div>
            </div>
            <div className="w-full" style={{ height: "7px" }}>
                <div className="h-full" style={{ width: progress * 100 + "%", backgroundColor: "#5872AD" }} />
            </div>
        </>
    )
}

let initialized = false

const HotCurriculum = hot(() => {
    const dispatch = useDispatch()

    if (!initialized) {
        // Handle URL parameters.
        const curriculumParam = ESUtils.getURLParameter("curriculum")

        if (curriculumParam !== null) {
            // check if this value exists in our old locations file first
            const url = checkLegacyURLs(curriculumParam)
            if (url !== undefined) {
                dispatch(curriculum.fetchContent({ url }))
            } else {
                dispatch(curriculum.fetchContent({ url: permalinkToURL(curriculumParam) }))
            }
        }

        if (curriculumParam === null) {
            // Load welcome page initially.
            dispatch(curriculum.fetchContent({ location: [0] }))
        }

        const languageParam = ESUtils.getURLParameter("language")
        if (languageParam && ["python", "javascript"].includes(languageParam)) {
            // If the user has a script open, that language overwrites this one due to ideController
            // this is probably a bug, but the old curriculumPaneController has the same behavior.
            dispatch(appState.setScriptLanguage(languageParam))
        }

        initialized = true
    }

    return <CurriculumPane />
})

export { HotCurriculum as Curriculum }
