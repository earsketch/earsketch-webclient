import React, { useEffect, useRef, ChangeEvent } from "react"
import { hot } from "react-hot-loader/root"
import { useSelector, useDispatch } from "react-redux"
import { Hilitor } from "../../lib/hilitor"

import * as appState from "../app/appState"
import { Collapsed, SearchBar } from "./Utils"
import * as curriculum from "./curriculumState"
import * as ESUtils from "../esutils"
import * as layout from "../ide/layoutState"
import * as userNotification from "../user/notification"
import { OLD_CURRICULUM_LOCATIONS } from "../data/old_curriculum"
import { useHeightLimiter } from "../Utils"
import { useTranslation } from "react-i18next"
import * as caiThunks from "../cai/caiThunks"

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

const TableOfContentsChapter = ({ unitIdx, ch, chIdx }: { unitIdx: number, ch: curriculum.TOCItem, chIdx: number }) => {
    const dispatch = useDispatch()
    const focus = useSelector(curriculum.selectFocus)
    const toc = useSelector(curriculum.selectTableOfContents)
    const chNumForDisplay = curriculum.getChNumberForDisplay(toc, unitIdx, chIdx)
    const location = useSelector(curriculum.selectCurrentLocation)
    const isCurrentChapter = location[0] === unitIdx && location[1] === chIdx
    const { t } = useTranslation()
    return (
        <li
            className="ltr:pl-5 rtl:pr-5 py-0.5"
            onClick={(e) => { e.stopPropagation(); dispatch(curriculum.toggleFocus([unitIdx, chIdx])) }}
        >
            <span className="inline-grid grid-flow-col "
                style={{ gridTemplateColumns: "17px 1fr" }}>
                <span>
                    {ch.sections && ch.sections.length > 0 &&
                    <button className="text-sm" aria-label={`${focus[1] === chIdx ? t("curriculum.collapseChapterDescriptive", { title: ch.title }) : t("curriculum.expandChapterDescriptive", { title: ch.title })}`} title={`${focus[1] === chIdx ? t("curriculum.collapseChapter") : t("curriculum.expandChapter")}`}><i className={`ltr:pr-1 rtl:pl-1 icon icon-arrow-${focus[1] === chIdx ? "down" : "right"}`} /></button>}
                </span>
                <a href="#"
                    className="text-sm text-black dark:text-white flex"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); dispatch(curriculum.fetchContent({ location: [unitIdx, chIdx], url: ch.URL })) }}>
                    <span>{chNumForDisplay}{chNumForDisplay && <>.</>}</span>
                    <span className="ltr:pl-1 rtl:pr-1">{ch.title}</span>
                </a>
            </span>
            <ul>
                {focus[1] === chIdx && ch.sections &&
                ch.sections.map((sec, secIdx) =>
                    <li role="button" aria-label={t("curriculum.openSection", { section: sec.title })} key={secIdx}
                        className={"py-1" + (isCurrentChapter && location[2] === secIdx ? " bg-blue-100" : "")}
                    >
                        <span className="ltr:pl-10 rtl:pr-10 flex">
                            <a href="#"
                                className="text-sm text-black dark:text-white flex"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); dispatch(curriculum.fetchContent({ location: [unitIdx, chIdx, secIdx], url: sec.URL })) }}
                                aria-current={isCurrentChapter && location[2] === secIdx ? "page" : "false"}
                            >
                                <span>{chNumForDisplay}.{secIdx + 1} </span>
                                <span className="ltr:pl-1 rtl:pr-1">{sec.title}</span>
                            </a>
                        </span>
                    </li>
                )}
            </ul>
        </li>
    )
}

const TableOfContents = () => {
    const dispatch = useDispatch()
    const focus = useSelector(curriculum.selectFocus)
    const toc = useSelector(curriculum.selectTableOfContents)
    const currentLocation = useSelector(curriculum.selectCurrentLocation)
    const { t } = useTranslation()
    return (
        <>
            <div className="inline-block text-sm font-bold text-center w-full">{t("curriculum.toc")}</div>
            <hr className="border-1 my-1 border-black dark:border-white" />
            <ul id="toc" className="select-none">
                {toc.map((unit, unitIdx) => (
                    <li key={unitIdx}
                        className=""
                        onClick={() => dispatch(curriculum.toggleFocus([unitIdx, null]))}>
                        <div className={"p-1 flex items-start" + (currentLocation[0] === unitIdx && currentLocation.length === 1 ? " bg-blue-100" : "")}>
                            {unit.chapters && unit.chapters.length > 0 &&
                            <button aria-label={focus[0] === unitIdx ? t("curriculum.collapseUnitDescriptive", { title: unit.title }) : t("curriculum.expandUnitDescriptive", { title: unit.title })}
                                title={focus[0] === unitIdx ? t("curriculum.collapseUnit") : t("curriculum.expandUnit")}>
                                <i className={`text-sm ltr:pr-1 rtl:pl-1 icon icon-arrow-${focus[0] === unitIdx ? "down" : "right"}`} />
                            </button>}
                            <a href="#" className="text-black text-sm dark:text-white"
                                aria-current={currentLocation.length === 1 && currentLocation[0] === unitIdx ? "page" : "false"}
                                onClick={e => { e.preventDefault(); e.stopPropagation(); dispatch(curriculum.fetchContent({ location: [unitIdx], url: unit.URL })) }}>{unit.title}
                            </a>
                        </div>
                        <ul>
                            {focus[0] === unitIdx && unit.chapters &&
                        unit.chapters.map((ch, chIdx) => <TableOfContentsChapter key={chIdx} {...{ unit, unitIdx, ch, chIdx }} />)}
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
    const [resultsRef, resultsStyle] = useHeightLimiter(showResults)

    return showResults
        ? (
            <div ref={resultsRef} className="absolute z-50 bg-white w-full border-b border-black bg-white dark:bg-gray-900" style={resultsStyle}>
                {results.map(result =>
                    <a key={result.id} href="#" onClick={e => { e.preventDefault(); dispatch(curriculum.fetchContent({ url: result.id })); dispatch(curriculum.showResults(false)) }}>
                        <div className="px-2.5 py-1 text-sm search-item text-black dark:text-white">{result.title}</div>
                    </a>)}
            </div>
        )
        : null
}

export const TitleBar = () => {
    const dispatch = useDispatch()
    const language = useSelector(appState.selectScriptLanguage)
    const currentLocale = useSelector(appState.selectLocale)
    const location = useSelector(curriculum.selectCurrentLocation)
    const pageTitle = useSelector(curriculum.selectPageTitle)
    const { t } = useTranslation()

    if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT) {
        useEffect(() => {
            if (!pageTitle?.includes("Loading")) {
                dispatch(caiThunks.curriculumPage([location, pageTitle]))
            }
        }, [location, pageTitle])
    }

    return (
        <div className="flex items-center p-2">
            <div className="ltr:pl-3 ltr:pr-4 rtl:pl-4 rtl:pr-3 font-semibold truncate">
                <h2>{t("curriculum.title").toLocaleUpperCase()}</h2>
            </div>
            <div>
                <button
                    className="flex justify-end w-7 h-4 p-0.5 rounded-full cursor-pointer bg-black dark:bg-gray-700"
                    onClick={() => dispatch(layout.setEast({ open: false }))}
                    title={t("curriculum.close")}
                    aria-label={t("curriculum.close")}
                >
                    <div className="w-3 h-3 bg-white rounded-full">&nbsp;</div>
                </button>
            </div>
            {/* TODO: upgrade to tailwind 3 for rtl modifiers to remove ternary operator */}
            <div className={currentLocale.direction === "rtl" ? "mr-auto" : "ml-auto"}>
                <button className="px-2 -my-1 align-middle text-lg" onClick={() => copyURL(language, location)} title={t("curriculum.copyURL")}>
                    <i className="icon icon-link" />
                </button>
                <button className="border-2 -my-1 border-black dark:border-white text-sm px-2.5 rounded-lg font-bold mx-1.5 align-text-bottom"
                    title={t("ariaDescriptors:curriculum.switchScriptLanguage", { language: language === "python" ? "javascript" : "python" })}
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
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const language = useSelector(appState.selectScriptLanguage)
    const currentLocale = useSelector(appState.selectLocale)
    const fontSize = useSelector(appState.selectFontSize)
    const theme = useSelector(appState.selectColorTheme)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const content = useSelector(curriculum.selectContent)
    const curriculumBody = useRef<HTMLElement>(null)

    useEffect(() => {
        dispatch(curriculum.fetchLocale({ }))
    }, [currentLocale])

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

    useEffect(() => {
        const frame: HTMLIFrameElement = content?.querySelector("#gmFrame")
        if (frame) frame.contentWindow!.postMessage({ lang: language }, "*")
    }, [language])

    // Highlight search text matches found in the curriculum.
    const hilitor = new Hilitor("curriculum")
    const searchText = useSelector(curriculum.selectSearchText)
    hilitor.setMatchType("left")
    useEffect(() => {
        hilitor.apply(searchText)
        return () => hilitor.remove()
    }, [content, searchText])

    return paneIsOpen
        ? (
            <div dir={currentLocale.direction} className={`font-sans h-full flex flex-col bg-white text-black dark:bg-gray-900 dark:text-white ${currentLocale.direction === "rtl" ? "curriculum-rtl" : ""}`}>
                <CurriculumHeader />

                <div id="curriculum" className={theme === "light" ? "curriculum-light" : "dark"} style={{ fontSize }}>
                    {content
                        ? <article ref={curriculumBody} id="curriculum-body" className="prose dark:prose-dark px-5 h-full max-w-none overflow-y-auto" style={{ fontSize }} />
                        : <div className="flex flex-col items-center">
                            <div className="text-2xl text-center py-8">Loading curriculum...</div>
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
    const currentLocale = useSelector(appState.selectLocale)

    const progress = (location[2] === undefined ? 0 : (location[2] + 1) / (toc[location[0]]!.chapters?.[location[1]].sections?.length ?? 1))
    const showTableOfContents = useSelector(curriculum.selectShowTableOfContents)
    const pageTitle = useSelector(curriculum.selectPageTitle)
    const triggerRef = useRef<HTMLButtonElement>(null)
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
            <div id="curriculum-navigation" className="w-full flex justify-between items-stretch cursor-pointer select-none text-white bg-blue hover:bg-gray-700">
                {((location + "") === (tocPages[0] + ""))
                    ? <span />
                    : <button aria-label={t("curriculum.previousPage")} className="p-1.5" onClick={() => dispatch(curriculum.fetchContent({ location: curriculum.adjustLocation(tocPages, location, -1) }))} title={t("curriculum.previousPage")}>
                        <i className={`icon icon-arrow-${currentLocale.direction === "rtl" ? "right2" : "left2"}`} />
                    </button>}
                <button ref={triggerRef} className="w-full" title={t("curriculum.showTOC")} onClick={() => dispatch(curriculum.showTableOfContents(!showTableOfContents))}>
                    <h3 className="text-sm" aria-label={t("curriculum.showTOC")} title={t("curriculum.showTOC")}>
                        {pageTitle}
                        <i className="icon icon-arrow-down2 text-xs p-1" />
                    </h3>
                </button>
                {((location + "") === (tocPages[tocPages.length - 1] + ""))
                    ? <span />
                    : <button aria-label={t("curriculum.nextPage")} className="p-1.5" onClick={() => dispatch(curriculum.fetchContent({ location: curriculum.adjustLocation(tocPages, location, +1) }))} title={t("curriculum.nextPage")}>
                        <i className={`icon icon-arrow-${currentLocale.direction === "rtl" ? "left2" : "right2"}`} />
                    </button>}
            </div>
            <div className={`z-50 pointer-events-none absolute w-full px-2 py-1.5 ${showTableOfContents ? "" : "hidden"}`}>
                <div ref={dropdownRef} style={tocStyle}
                    className="w-full pointer-events-auto p-2.5 border border-black bg-white dark:bg-black">
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
