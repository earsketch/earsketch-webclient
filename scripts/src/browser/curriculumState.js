import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';

export const fetchContent = createAsyncThunk('curriculum/fetchContent', async ({ location, url }, { dispatch, getState }) => {
    const state = getState()
    const {href: _url, loc: _location} = fixLocation(url, location)
    dispatch(loadChapter({location: _location}))
    // Check cache before fetching. Note that the location [-1] indicates the Table of Contents.
    if (_location[0] === -1 || state.curriculum.contentCache[_location] !== undefined) {
        console.log(`${_location} is in the cache, nothing else to do.`)
        return { cached: true }
    }
    const urlWithoutAnchor = _url.split('#', 1)[0]
    console.log(`${_location} not in cache, fetching ${urlWithoutAnchor}.`)
    const response = await fetch(urlWithoutAnchor)
    const html = await response.text()
    return { location: _location, html, cached: false }
})

export const adjustLocation = (location, delta) => {
    // TODO: just construct reverse map once
    let pageIdx = tocPages.map(v => v.toString()).indexOf(location.toString()) + delta
    if (pageIdx < -1) {
        pageIdx = -1
    } else if (pageIdx >= tocPages.length) {
        pageIdx = tocPages.length - 1
    }

    const newLocation = pageIdx > -1 ? tocPages[pageIdx] : [-1]
    return newLocation
}

const curriculumSlice = createSlice({
    name: 'curriculum',
    initialState: {
        searchText: '',
        showResults: false,
        currentLocation: [-1],
        showURLButton: false,
        focus: [null, null], // unit, chapter
        popoverIsOpen: false,
        popover2IsOpen: false,
        pageIdx: -1,
        contentCache: {},
        maximized: false,
    },
    reducers: {
        setSearchText(state, { payload }) {
            state.searchText = payload
        },
        setCurrentLocation(state, { payload }) {
            state.currentLocation = payload
        },
        togglePopover(state) {
            state.popoverIsOpen = !state.popoverIsOpen
        },
        togglePopover2(state) {
            state.popover2IsOpen = !state.popover2IsOpen
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
            state.popoverIsOpen = false
            state.popover2IsOpen = false
            state.showURLButton = location[0] !== -1
        },
        showResults(state, { payload }) {
            state.showResults = payload
        },
        toggleMaximized(state) {
            state.maximized = !state.maximized
            // TODO: Update this when we replace the layoutController.
            angular.element('[ng-controller=layoutController]').scope().toggleCurriculumMaximization()
        }
    },
    extraReducers: {
        [fetchContent.fulfilled]: (state, action) => {
            if (action.payload.cached) {
                // HTML has already been previously fetched, processed, and cached - nothing to do.
                return
            }
            const document = new DOMParser().parseFromString(action.payload.html, "text/html")
            if (action.payload.location.length < 3) {
                // No sections, just cache the content directly.
                state.contentCache[action.payload.location] = document.body
            } else {
                // Chop the chapter up into sections.
                const body = document.querySelector('div.sect1').parentNode
                // Special case: first section (sect2) should come with the opening blurb (sect1).
                // So, we put the body (with later sections removed) in the first slot, and skip the first sect2 in this for loop.
                const chapterLocation = action.payload.location.slice(0, 2)
                for (let [idx, el] of [...document.querySelectorAll('div.sect2')].slice(1).entries()) {
                    state.contentCache[chapterLocation.concat([idx + 1])] = el
                    el.remove()
                }
                state.contentCache[chapterLocation.concat([0])] = body
            }
        },
        [fetchContent.rejected]: (...args) => {
            console.log("Fetch failed!", args)
        }
    }
})

export default curriculumSlice.reducer;
export const {
    setSearchText,
    setCurrentLocation,
    togglePopover,
    togglePopover2,
    loadChapter,
    toggleFocus,
    showResults,
    toggleMaximized,
} = curriculumSlice.actions;

export const selectSearchText = state => state.curriculum.searchText

export const selectShowResults = state => state.curriculum.showResults

export const selectCurrentLocation = state => state.curriculum.currentLocation

export const selectShowURLButton = state => state.curriculum.showURLButton

export const selectContent = state => state.curriculum.contentCache[state.curriculum.currentLocation]

export const selectPopoverIsOpen = state => state.curriculum.popoverIsOpen

export const selectPopover2IsOpen = state => state.curriculum.popover2IsOpen

export const selectFocus = state => state.curriculum.focus

export const selectMaximized = state => state.curriculum.maximized

// Search through chapter descriptions.
const documents = ESCurr_SearchDoc;

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
        return idx.search(searchText).map((res) => {
            const title = documents.find((doc) => {
                return doc.id === res.ref
            }).title
            return {
                id: res.ref,
                title: title
            }
        })
    }
)

export const getChNumberForDisplay = (unitIdx, chIdx) => {
    if (toc[unitIdx].chapters[chIdx] === undefined || toc[unitIdx].chapters[chIdx].displayChNum === -1) {
        return '';
    } else {
        return toc[unitIdx].chapters[chIdx].displayChNum;
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
            return toc[location[0]].title;
        } else if (location.length === 2) {
            const h2 = content.querySelector("h2")
            if (h2) {
                title = h2.textContent;
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

// TODO: clean up the ugly incr stuff
const findLocFromTocUrl = (url) => {
    var incr = true;
    var i = 0;
    var loc = [0];
    toc.forEach(function (unit, unitIdx) {
        unit.chapters.forEach(function (ch, chIdx) {
            if (ch.URL === url) {
                loc = [unitIdx, chIdx];
                incr = false;
            }
            if (incr) {
                i++;
            }

            ch.sections.forEach(function (sec, secIdx) {
                if (sec.URL === url) {
                    loc = [unitIdx, chIdx, secIdx];
                    incr = false;
                }
                if (incr) {
                    i++;
                }
            });
        });
    });

    return loc;
}

const fixLocation = (href, loc) => {
    if (loc[0] === -1) {
        // Special case: Table of Contents
        return { href: null, loc: [-1] }
    }

    if (loc === undefined) {
        var url = href.split('/').slice(-1)[0].split('#').slice(0, 1)[0];
        var sectionDiv = href.split('/').slice(-1)[0].split('#')[1];
        loc = findLocFromTocUrl(href);
    } else if (href === undefined) {
        if (loc.length === 1) {
            href = toc[loc[0]].URL
        } else if (loc.length === 2) {
            href = toc[loc[0]].chapters[loc[1]].URL
        } else if (loc.length === 3) {
            href = toc[loc[0]].chapters[loc[1]].sections[loc[2]].URL
        }
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
        var currChapter = toc[loc[0]].chapters[loc[1]];

        if (currChapter.sections.length > 0) {
            if (sectionDiv === undefined) {
                // when opening a chapter-level page, also present the first section
                loc.push(0); // add the first section (index 0)
                href = currChapter.sections[0].URL;
            } else {
                //section id was sent in href, present the corresponding section
                for (var i = 0; i < currChapter.sections.length; ++i) {
                    if (sectionDiv === currChapter.sections[i].URL.split('#')[1]) {
                        loc.push(i);
                        href = currChapter.sections[i].URL;
                        break;
                    }
                }
            }
        } else {
            href = currChapter.URL;
        }
    }

    const curriculumDir = 'curriculum/'
    return {href: curriculumDir + href, loc}
}