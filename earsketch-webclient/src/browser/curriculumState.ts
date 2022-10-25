import ReactDOM from "react-dom"
import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit"
import lunr from "lunr"

import esconsole from "../esconsole"
import * as layout from "../ide/layoutState"
import type { RootState, ThunkAPI, AppDispatch } from "../reducers"
import { BrowserTabType } from "./BrowserTab"
import { highlight } from "../ide/highlight"

const CURRICULUM_DIR = "../curriculum"

// TODO: Make these selectors instead.
let locationToPage: { [location: string]: number } = {}
let locationToUrl: { [key: string]: string } = {}
let urlToLocation: { [key: string]: number[] } = {}
let idx: lunr.Index | null = null

export const callbacks = {
    import: (_: string) => {},
    redirect: () => {},
}

// Generate sequence of valid locations: [[0], [1,0,0], [1,0,1], ...]
// This allows us to define the meaning of "previous" and "next" easily.
function generatePages(toc: TOCItem[]) {
    const pages = []
    for (const [unitIdx, unit] of toc.entries()) {
        pages.push([unitIdx])
        for (const [chIdx, ch] of unit.chapters.entries()) {
            if (ch.sections.length === 0) {
                pages.push([unitIdx, chIdx])
            }
            for (const secIdx of ch.sections.keys()) {
                pages.push([unitIdx, chIdx, secIdx])
            }
        }
    }
    return pages
}

export const fetchLocale = createAsyncThunk<any, any, ThunkAPI>("curriculum/fetchLocale", async ({ location, url }, { dispatch, getState }) => {
    dispatch(curriculumSlice.actions.setContentCache({}))
    const locale = getState().app.locale

    const [tocData, searchData] = await Promise.all(["toc", "searchdoc"].map(
        async res => (await fetch(`${CURRICULUM_DIR}/${locale}/curr_${res}.json`)).json()))

    const pagesData = generatePages(tocData)

    dispatch(setSearchDoc(searchData))
    idx = lunr(function () {
        this.ref("id")
        this.field("title")
        this.field("text")

        searchData.forEach(function (doc: SearchDoc) {
            this.add(doc)
        }, this)
    })

    locationToPage = {}
    locationToUrl = {}
    urlToLocation = {}

    pagesData.forEach((location: any[], pageIdx: number) => (locationToPage[location.join(",")] = pageIdx))
    dispatch(setPages(pagesData))

    tocData.forEach((unit: TOCItem, unitIdx: number) => {
        urlToLocation[unit.URL] = [unitIdx]
        locationToUrl[[unitIdx].join(",")] = unit.URL
        unit.chapters?.forEach((ch, chIdx) => {
            urlToLocation[ch.URL] = [unitIdx, chIdx]
            locationToUrl[[unitIdx, chIdx].join(",")] = ch.URL
            ch.sections?.forEach((sec, secIdx) => {
                urlToLocation[sec.URL] = [unitIdx, chIdx, secIdx]
                locationToUrl[[unitIdx, chIdx, secIdx].join(",")] = sec.URL
            })
        })
    })
    const currentLocation = getState().curriculum.currentLocation
    // Temporarily switch to a safe location (every version of the curriculum has a welcome page),
    // so that the location-TOC mismatch doesn't break anything between now and fetchContent.
    dispatch(setCurrentLocation([0]))
    dispatch(setTableOfContents(tocData))
    if (location === undefined && url === undefined) {
        location = currentLocation
    }
    dispatch(fetchContent({ location, url }))
})

export const fetchContent = createAsyncThunk<{ [key: string]: any }, { location?: number[], url?: string }, ThunkAPI>(
    "curriculum/fetchContent",
    async ({ location, url }, { dispatch, getState }) => {
        const state = getState()
        // check that locale is loaded
        if (state.curriculum.tableOfContents.length === 0) {
            dispatch(fetchLocale({ location, url }))
            return
        }
        const { href: _url, loc: _location } = fixLocation(state.curriculum.tableOfContents, url, location)
        dispatch(setFocus([_location[0], _location.length > 1 ? _location[1] : null]))
        dispatch(loadChapter({ location: _location }))
        // Check cache before fetching.
        if (state.curriculum.contentCache[_location.join(",")] !== undefined) {
            esconsole(`${_location} is in the cache, nothing else to do.`, "debug")
            return {}
        }

        const urlWithoutAnchor = _url.split("#", 1)[0]
        esconsole(`${_location} not in cache, fetching ${urlWithoutAnchor}.`, "debug")
        const response = await fetch(urlWithoutAnchor)
        // Add artificial latency; useful for testing:
        // await new Promise(r => setTimeout(r, 1000))
        return processContent(_location, await response.text(), dispatch)
    }
)

const processContent = (location: number[], html: string, dispatch: AppDispatch) => {
    const doc = new DOMParser().parseFromString(html, "text/html")

    // Bring these nodes into our document context, but replace the <body> with a <div>.
    const root = document.createElement("div")
    while (doc.body.firstChild) {
        root.appendChild(document.adoptNode(doc.body.firstChild))
    }

    // Connect copy buttons.
    root.querySelectorAll(".copy-btn-python,.copy-btn-javascript").forEach((button: HTMLButtonElement) => {
        // NOTE: We do this before highlighting to ensure that `textContent` is not altered by the highlighter.
        const source = button.nextSibling!.textContent!
        button.onclick = () => callbacks.import(source)
    })

    // Highlight code blocks.
    root.querySelectorAll("pre code").forEach(block => {
        const language = block.classList.contains("python") ? "python" : "javascript"
        const darkBlock = block.cloneNode(true) as Element
        const { light, dark } = highlight(block.textContent!, language)
        ReactDOM.render(light, block)
        block.classList.add("whitespace-pre-wrap", "block", "overflow-x-auto", "dark:hidden")
        ReactDOM.render(dark, darkBlock)
        darkBlock.classList.add("whitespace-pre-wrap", "hidden", "overflow-x-auto", "dark:block")
        block.parentElement!.append(darkBlock)
    })

    // Fix internal cross-references.
    root.querySelectorAll('a[href^="#"]').forEach((el: HTMLLinkElement) => {
        el.onclick = (e) => {
            e.preventDefault()
            dispatch(fetchContent({ url: locationToUrl[location.slice(0, 2).join(",")] + el.getAttribute("href") }))
        }
    })
    root.querySelectorAll('a[data-es-internallink="true"]').forEach((el: HTMLLinkElement) => {
        el.onclick = (e) => {
            e.preventDefault()
            dispatch(fetchContent({ url: el.getAttribute("href") ?? undefined }))
        }
    })

    // Used in 4.1, 27.
    root.querySelectorAll('a[href="<api>"]').forEach((el: HTMLLinkElement) => {
        el.onclick = (e) => {
            e.preventDefault()
            dispatch(layout.setWest({ open: true, kind: BrowserTabType.API }))
        }
    })

    root.querySelectorAll('div[class*="openblock question"]').forEach((questionDiv: HTMLDivElement, questionIndex) => {
        const icon = document.createElement("i")
        icon.classList.add("icon", "icon-checkmark")
        // add icon to questions
        questionDiv.querySelectorAll("div.paragraph > p").forEach(question => question.prepend(icon))

        questionDiv.querySelectorAll("ul.answers > li > p").forEach((answerParagraph: HTMLParagraphElement, i) => {
            const label = document.createElement("label")
            const input = document.createElement("input")
            const control = document.createElement("span")
            const span = document.createElement("span")

            answerParagraph.prepend(label)
            answerParagraph.append(span)
            label.appendChild(input)
            label.appendChild(control)

            input.type = "radio"
            input.name = "q" + questionIndex
            input.onclick = () => {
                if (i === 0) {
                    answerParagraph.classList.add("correct")
                    questionDiv.classList.add("complete")
                    questionDiv.querySelectorAll("input").forEach((el) => { el.disabled = true })
                    questionDiv.querySelectorAll(".incorrect").forEach(el => el.classList.remove("incorrect"))
                } else {
                    answerParagraph.classList.add("incorrect")
                    questionDiv.querySelectorAll(".try-again").forEach(el => el.classList.remove("try-again"))
                    span.classList.add("try-again")
                }
            }
            control.classList.add("control")
        })

        const answers = Array.from(questionDiv.querySelectorAll("ul.answers > li"))
        const answerList = questionDiv.querySelector("ul.answers")
        answers.forEach(a => a.remove())
        while (answers.length) {
            const index = Math.floor(Math.random() * answers.length)
            answerList!.appendChild(answers[index])
            answers.splice(index, 1)
        }
    })

    if (/WebKit/.test(navigator.userAgent)) {
        // Apparent WebKit (including Safari) bug: adopted <video> and <audio> elements are missing their controls.
        // (This does not occur in Chrome or Firefox.)
        // Workaround: clone the element.
        root.querySelectorAll("video").forEach(video => video.replaceWith(video.cloneNode(true)))
        root.querySelectorAll("audio").forEach(audio => audio.replaceWith(audio.cloneNode()))
    }

    if (location.length < 3) {
        // No sections, leave as-is.
        return { [location.join(",")]: root }
    }

    // Chop the chapter up into sections.
    const sect1 = root.querySelector("div.sect1")
    const body = sect1 ? sect1.parentNode : null
    // Special case: first section (sect2) should come with the opening blurb (sect1).
    // So, we put the body (with later sections removed) in the first slot, and skip the first sect2 in this for loop.
    const chapterLocation = location.slice(0, 2)
    const map: { [key: string]: any } = {}
    const sect2 = Array.from(root.querySelectorAll("div.sect2"))
    for (const [idx, el] of sect2.slice(1).entries()) {
        map[chapterLocation.concat([idx + 1]).join(",")] = el
        el.remove()
    }
    map[chapterLocation.concat([0]).join(",")] = body
    return map
}

interface CurriculumState {
    searchText: string
    showResults: boolean
    currentLocation: number[]
    focus: [number | null, number | null]
    showTableOfContents: boolean
    contentCache: any,
    tableOfContents: TOCItem[],
    pages: number[][],
    searchDoc: SearchDoc[]
}

const curriculumSlice = createSlice({
    name: "curriculum",
    initialState: {
        searchText: "",
        showResults: false,
        currentLocation: [0],
        focus: [null, null], // unit, chapter
        showTableOfContents: false,
        contentCache: {},
        tableOfContents: [],
        pages: [],
        searchDoc: [],
    } as CurriculumState,
    reducers: {
        setSearchText(state, { payload }) {
            state.searchText = payload
        },
        setCurrentLocation(state, { payload }) {
            state.currentLocation = payload
        },
        setTableOfContents(state, { payload }) {
            state.tableOfContents = payload
        },
        setPages(state, { payload }) {
            state.pages = payload
        },
        setSearchDoc(state, { payload }) {
            state.searchDoc = payload
        },
        showTableOfContents(state, { payload }) {
            state.showTableOfContents = payload
        },
        setFocus(state, { payload }: { payload: CurriculumState["focus"] }) {
            state.focus = payload
        },
        toggleFocus(state, { payload }) {
            const [unitIdx, chIdx] = payload
            if (chIdx !== null) {
                if (state.focus[1] === chIdx) {
                    state.focus[1] = null
                } else {
                    state.focus[1] = chIdx
                }
            } else if (unitIdx !== null) {
                if (state.focus[0] === unitIdx) {
                    state.focus[0] = null
                } else {
                    state.focus[1] = null
                    state.focus[0] = unitIdx
                }
            }
        },
        loadChapter(state, { payload: { location } }) {
            state.currentLocation = location
            state.showTableOfContents = false
        },
        showResults(state, { payload }) {
            state.showResults = payload
        },
        setContentCache(state, { payload }) {
            state.contentCache = payload
        },
    },
    extraReducers: builder => {
        builder.addCase(fetchContent.fulfilled, (state: CurriculumState, action: { payload: any }) => {
            // Update the cache.
            state.contentCache = { ...state.contentCache, ...action.payload }
        })

        builder.addCase(fetchContent.rejected, (...args) => {
            esconsole("Fetch failed! " + JSON.stringify(args), "error")
        })
    },
})

export default curriculumSlice.reducer
export const {
    setSearchText,
    setCurrentLocation,
    setTableOfContents,
    setPages,
    setSearchDoc,
    showTableOfContents,
    loadChapter,
    setFocus,
    toggleFocus,
    showResults,
} = curriculumSlice.actions

export const selectTableOfContents = (state: RootState) => state.curriculum.tableOfContents

export const selectPages = (state: RootState) => state.curriculum.pages

export const selectSearchDoc = (state: RootState) => state.curriculum.searchDoc

export const selectSearchText = (state: RootState) => state.curriculum.searchText

export const selectShowResults = (state: RootState) => state.curriculum.showResults

export const selectCurrentLocation = (state: RootState) => state.curriculum.currentLocation

export const selectContent = (state: RootState) => state.curriculum.contentCache[state.curriculum.currentLocation.join(",")]

export const selectShowTableOfContents = (state: RootState) => state.curriculum.showTableOfContents

export const selectFocus = (state: RootState) => state.curriculum.focus

export interface SearchDoc {
    title: string
    id: string
    text: string
}

export interface SearchResult {
    id: lunr.Index.Result["ref"],
    title: string
}

export const selectSearchResults = createSelector(
    [selectSearchText, selectSearchDoc],
    (searchText, searchDoc): SearchResult[] => {
        if (!searchText || !idx) { return [] }
        try {
            return idx.search(searchText).map((res) => {
                // @ts-ignore: TODO: handle not-found cases.
                const title = searchDoc.find((doc) => {
                    return doc.id === res.ref
                }).title
                return {
                    id: res.ref,
                    title: title,
                }
            })
        } catch (error) {
            // Not very concerning; searching for 'foo:', for example, causes a parse error.
            esconsole(`lunr parse error on "${searchText}"`, "debug")
            return []
        }
    }
)

export const getChNumberForDisplay = (toc: TOCItem[], unitIdx: number|string, chIdx: number|string) => {
    unitIdx = typeof (unitIdx) === "number" ? unitIdx : parseInt(unitIdx)
    chIdx = typeof (chIdx) === "number" ? chIdx : parseInt(chIdx)

    const unit = toc[unitIdx]
    if (unit.chapters && (unit.chapters[chIdx] === undefined || unit.chapters[chIdx].displayChNum === -1)) {
        return ""
    } else {
        return unit.chapters && unit.chapters[chIdx].displayChNum
    }
}

export const selectPageTitle = createSelector(
    [selectCurrentLocation, selectContent, selectTableOfContents],
    (location, content, toc) => {
        if (location[0] === -1) {
            return "Table of Contents"
        } else if (content === undefined) {
            return "Loading..."
        }

        let title = ""

        if (location.length === 1) {
            return toc[location[0]].title
        } else if (location.length === 2) {
            const h2 = content.querySelector("h2")
            if (h2) {
                title = h2.textContent
            }
            const chNumForDisplay = getChNumberForDisplay(toc, location[0], location[1])
            if (chNumForDisplay) {
                title = chNumForDisplay + ": " + title
            }
            return title
        } else if (location.length === 3) {
            const h3 = content.querySelector("h3")
            if (h3) {
                title = (+location[2] + 1) + ": " + h3.textContent
            }
            const chNumForDisplay = getChNumberForDisplay(toc, location[0], location[1])
            if (chNumForDisplay) {
                title = chNumForDisplay + "." + title
            }
            return title
        }
    }
)

export interface TOCItem {
    URL: string
    title: string
    sections: TOCItem[]
    chapters: TOCItem[]
    displayChNum?: number
}

export const adjustLocation = (tocPages: number[][], location: number[], delta: number) => {
    let pageIdx = locationToPage[location.join(",")] + delta
    if (pageIdx < 0) {
        pageIdx = 0
    } else if (pageIdx >= tocPages.length) {
        pageIdx = tocPages.length - 1
    }

    return tocPages[pageIdx]
}

export function getChapterForError(errorMessage: string) {
    const aliases: any = { referenceerror: "nameerror", rangeerror: "valueerror" }
    const types = ["importerror", "indentationerror", "indexerror", "nameerror", "parseerror", "syntaxerror", "typeerror", "valueerror"]
    let type = errorMessage.split(" ")[3].slice(0, -1).toLowerCase()
    type = aliases[type] || type
    const anchor = types.includes(type) ? "#" + type : ""
    return { url: `/en/v1/every-error-explained-in-detail.html${anchor}` }
}

export const getURLForLocation = (location: number[]) => {
    return locationToUrl[location.join(",")]
}

function fixLocation(toc: TOCItem[], href?: string, loc?: number[]) {
    if (loc === undefined && href !== undefined) {
        loc = urlToLocation[href]
    }

    if (loc === undefined || locationToUrl[loc.join(",")] === undefined) {
        // if loc is still undefined then this is a request for an un-indexed page, default them to the welcome page
        loc = [0]
        href = undefined as any
        callbacks.redirect()
    }
    href = href ?? locationToUrl[loc.join(",")]

    if (loc.length === 2 && toc[loc[0]].chapters) {
        const currChapter = toc[loc[0]].chapters![loc[1]]

        if (currChapter.sections && currChapter.sections.length > 0) {
            const sectionDiv = href.split("#")[1]
            if (sectionDiv === undefined) {
                // when opening a chapter-level page, also present the first section
                loc = [...loc, 0] // add the first section (index 0)
                href = currChapter.sections[0].URL
            } else {
                // section id was sent in href, present the corresponding section
                for (let i = 0; i < currChapter.sections.length; i++) {
                    if (sectionDiv === currChapter.sections[i].URL.split("#")[1]) {
                        loc = [...loc, i]
                        href = currChapter.sections[i].URL
                        break
                    }
                }
            }
        } else {
            href = currChapter.URL
        }
    }

    return { href: CURRICULUM_DIR + href, loc }
}
