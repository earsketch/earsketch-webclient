import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import * as layout from '../layout/layoutState'

export const fetchContent = createAsyncThunk('curriculum/fetchContent', async ({ location, url }, { dispatch, getState }) => {
    const state = getState()
    const {href: _url, loc: _location} = fixLocation(url, location)
    dispatch(loadChapter({location: _location}))
    // Check cache before fetching.
    if (state.curriculum.contentCache[_location] !== undefined) {
        esconsole(`${_location} is in the cache, nothing else to do.`, 'debug')
        return {}
    }
    const urlWithoutAnchor = _url.split('#', 1)[0]
    esconsole(`${_location} not in cache, fetching ${urlWithoutAnchor}.`, 'debug')
    const response = await fetch(urlWithoutAnchor)
    // Add artificial latency; useful for testing:
    // await new Promise(r => setTimeout(r, 1000))
    return processContent(_location, await response.text(), dispatch)
})

const processContent = (location, html, dispatch) => {
    const doc = new DOMParser().parseFromString(html, "text/html")

    // Bring these nodes into our document context, but replace the <body> with a <div>.
    const root = document.createElement('div')
    while (doc.body.firstChild) {
        root.appendChild(document.adoptNode(doc.body.firstChild))
    }

    // Highlight code blocks.
    root.querySelectorAll('pre code').forEach(block => hljs.highlightBlock(block))

    // Fix internal cross-references.
    root.querySelectorAll('a[href^="#"]').forEach(el => {
        el.onclick = (e) => {
            e.preventDefault()
            dispatch(fetchContent({ url: locationToUrl[location.slice(0, 2)] + el.getAttribute("href") }))
        }
    })
    root.querySelectorAll('a[data-es-internallink="true"]').forEach(el => {
        el.onclick = (e) => {
            e.preventDefault()
            dispatch(fetchContent({ url: el.getAttribute("href") }))
        }
    })

    // Used in 4.1, 27.
    root.querySelectorAll('a[href="<api>"]').forEach(el => {
        el.onclick = (e) => {
            e.preventDefault()
            dispatch(layout.openWest("API"))
        }
    })

    // Run scripts.
    root.querySelectorAll("script").forEach(script => {
        // Adopting the <script> node marks it as "already started", such that it will not execute.
        // (See https://html.spec.whatwg.org/multipage/scripting.html#script-processing-model.)
        // To get around this, we create a new <script> element and copy over the details.
        const copy = document.createElement("script")
        if (script.src) copy.src = script.src
        copy.async = script.async
        copy.innerText = script.innerText
        script.replaceWith(copy)
    })

    if (/WebKit/.test(navigator.userAgent)) {
        // Apparent WebKit (including Safari) bug: adopted <video> elements are missing their controls.
        // (This does not occur in Chrome or Firefox.)
        // Workaround: clone the element.
        root.querySelectorAll("video").forEach(video => video.replaceWith(video.cloneNode()))
    }

    if (location.length < 3) {
        // No sections, leave as-is.
        return {[location]: root}
    }

    // Chop the chapter up into sections.
    const body = root.querySelector('div.sect1').parentNode
    // Special case: first section (sect2) should come with the opening blurb (sect1).
    // So, we put the body (with later sections removed) in the first slot, and skip the first sect2 in this for loop.
    const chapterLocation = location.slice(0, 2)
    const map = {}
    for (let [idx, el] of [...root.querySelectorAll('div.sect2')].slice(1).entries()) {
        map[chapterLocation.concat([idx + 1])] = el
        el.remove()
    }
    map[chapterLocation.concat([0])] = body
    return map
}

const curriculumSlice = createSlice({
    name: 'curriculum',
    initialState: {
        searchText: '',
        showResults: false,
        currentLocation: [0],
        focus: [null, null], // unit, chapter
        showTableOfContents: false,
        contentCache: {},
    },
    reducers: {
        setSearchText(state, { payload }) {
            state.searchText = payload
        },
        setCurrentLocation(state, { payload }) {
            state.currentLocation = payload
        },
        showTableOfContents(state, { payload }) {
            state.showTableOfContents = payload
        },
        toggleFocus(state, { payload }) {
            let [unitIdx, chIdx] = payload
            if (chIdx) {
                if (state.focus[1] === chIdx) {
                    state.focus[1] = null
                } else {
                    state.focus[1] = chIdx
                }
            } else if (unitIdx) {
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
    },
    extraReducers: {
        [fetchContent.fulfilled]: (state, action) => {
            // Update the cache.
            state.contentCache = {...state.contentCache, ...action.payload}   
        },
        [fetchContent.rejected]: (...args) => {
            esconsole("Fetch failed! " + JSON.stringify(args), 'error')
        }
    }
})

export default curriculumSlice.reducer
export const {
    setSearchText,
    setCurrentLocation,
    showTableOfContents,
    loadChapter,
    toggleFocus,
    showResults,
} = curriculumSlice.actions

export const selectSearchText = state => state.curriculum.searchText

export const selectShowResults = state => state.curriculum.showResults

export const selectCurrentLocation = state => state.curriculum.currentLocation

export const selectContent = state => state.curriculum.contentCache[state.curriculum.currentLocation]

export const selectShowTableOfContents = state => state.curriculum.showTableOfContents

export const selectFocus = state => state.curriculum.focus

// Search through chapter descriptions.
const documents = ESCurr_SearchDoc

const idx = lunr(function () {
    this.ref('id')
    this.field('title')
    this.field('text')

    documents.forEach(function (doc) {
        this.add(doc)
    }, this)
})

export const selectSearchResults = createSelector(
    [selectSearchText],
    (searchText) => {
        if (!searchText)
            return []
        try {
            return idx.search(searchText).map((res) => {
                const title = documents.find((doc) => {
                    return doc.id === res.ref
                }).title
                return {
                    id: res.ref,
                    title: title
                }
            })
        } catch (error) {
            // Not very concerning; searching for 'foo:', for example, causes a parse error.
            esconsole(`lunr parse error on "${searchText}"`, 'debug')
            return []
        }
    }
)

export const getChNumberForDisplay = (unitIdx, chIdx) => {
    if (toc[unitIdx].chapters[chIdx] === undefined || toc[unitIdx].chapters[chIdx].displayChNum === -1) {
        return ''
    } else {
        return toc[unitIdx].chapters[chIdx].displayChNum
    }
}

export const selectPageTitle = createSelector(
    [selectCurrentLocation, selectContent],
    (location, content) => {
        if (location[0] === -1) {
            return 'Table of Contents'
        } else if (content === undefined) {
            return 'Loading...'
        }

        let title = ''

        if (location.length === 1) {
            return toc[location[0]].title
        } else if (location.length === 2) {
            const h2 = content.querySelector("h2")
            if (h2) {
                title = h2.textContent
            }
            const chNumForDisplay = getChNumberForDisplay(location[0], location[1])
            if (chNumForDisplay) {
                title = chNumForDisplay + ': ' + title
            }
            return title
        } else if (location.length === 3) {
            const h3 = content.querySelector("h3")
            if (h3) {
                title = (+location[2]+1) + ': ' + h3.textContent
            }
            const chNumForDisplay = getChNumberForDisplay(location[0], location[1])
            if (chNumForDisplay) {
                title = chNumForDisplay + '.' + title
            }
            return title
        }
    }
)


const toc = ESCurr_TOC
const tocPages = ESCurr_Pages

const locationToPage = {}
tocPages.forEach((location, pageIdx) => locationToPage[location] = pageIdx)

export const adjustLocation = (location, delta) => {
    let pageIdx = locationToPage[location] + delta
    if (pageIdx < 0) {
        pageIdx = 0
    } else if (pageIdx >= tocPages.length) {
        pageIdx = tocPages.length - 1
    }

    return tocPages[pageIdx]
}


const urlToLocation = {}
const locationToUrl = {}
toc.forEach((unit, unitIdx) => {
    urlToLocation[unit.URL] = [unitIdx]
    locationToUrl[[unitIdx]] = unit.URL
    unit.chapters.forEach((ch, chIdx) => {
        urlToLocation[ch.URL] = [unitIdx, chIdx]
        locationToUrl[[unitIdx, chIdx]] = ch.URL
        ch.sections.forEach((sec, secIdx) => {
            urlToLocation[sec.URL] = [unitIdx, chIdx, secIdx]
            locationToUrl[[unitIdx, chIdx, secIdx]] = sec.URL
        })
    })
})

const fixLocation = (href, loc) => {
    if (loc === undefined) {
        loc = urlToLocation[href]
    } else if (href === undefined) {
        href = locationToUrl[loc]
    }

    if (loc.length === 1) {
        if (toc[loc[0]].chapters.length > 0) {
            if (toc[loc[0]].chapters[0].length > 0) {
                loc = [loc[0], 0, 0]
            } else {
                loc.push(0)
            }
        }
    }

    if (loc.length === 2) {
        var currChapter = toc[loc[0]].chapters[loc[1]]

        if (currChapter.sections.length > 0) {
            const sectionDiv = href.split('#')[1]
            if (sectionDiv === undefined) {
                // when opening a chapter-level page, also present the first section
                loc.push(0) // add the first section (index 0)
                href = currChapter.sections[0].URL
            } else {
                //section id was sent in href, present the corresponding section
                for (let i = 0; i < currChapter.sections.length; i++) {
                    if (sectionDiv === currChapter.sections[i].URL.split('#')[1]) {
                        loc.push(i)
                        href = currChapter.sections[i].URL
                        break
                    }
                }
            }
        } else {
            href = currChapter.URL
        }
    }

    const curriculumDir = '../curriculum/'
    return {href: curriculumDir + href, loc}
}