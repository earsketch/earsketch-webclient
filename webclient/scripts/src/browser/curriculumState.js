import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';

export const fetchContent = createAsyncThunk('curriculum/fetchContent', async ({ location, url }, { dispatch }) => {
    const {href: _url, loc: _location} = fixLocation(_url, location)
    dispatch(loadChapter({href: _url, loc: _location}))
    console.log(url, _location);
    const response = await fetch(_url);
    const html = await response.text();
    return { location: _location, html };
})

const curriculumSlice = createSlice({
    name: 'curriculum',
    initialState: {
        searchText: '',
        currentLocation: [-1],
        showURLButton: false,
        focus: [null, null], // unit, chapter
        popoverIsOpen: false,
        popover2IsOpen: false,
        pageIdx: -1,
        contentCache: {},
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
        loadChapter(state, { payload: { href, loc } }) {
            state.currentLocation = loc;

            // update the pageIdx for the pagination if necessary
            state.pageIdx = tocPages.map(function(v) {
                return v.toString();
            }).indexOf(loc.toString());

            state.popoverIsOpen = false;
            state.popover2IsOpen = false;
            state.showURLButton = true;
        }
    },
    extraReducers: {
        [fetchContent.fulfilled]: (state, action) => {
            console.log(action.payload)
            state.contentCache[action.payload.location] = action.payload.html;
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
} = curriculumSlice.actions;

export const selectSearchText = state => state.curriculum.searchText

export const selectCurrentLocation = state => state.curriculum.currentLocation

export const selectShowURLButton = state => state.curriculum.showURLButton

export const selectContent = state => state.curriculum.contentCache[state.curriculum.currentLocation]

export const selectPopoverIsOpen = state => state.curriculum.popoverIsOpen

export const selectPopover2IsOpen = state => state.curriculum.popover2IsOpen

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
    // pageIdx = i;
    return loc;
}

const fixLocation = (href, loc) => {
    if (typeof(loc) === 'undefined') {
        var url = href.split('/').slice(-1)[0].split('#').slice(0, 1)[0];
        var sectionDiv = href.split('/').slice(-1)[0].split('#')[1];
        loc = findLocFromTocUrl(href);
    }

    if (loc.length === 1) {
        if (toc[loc[0]].chapters.length > 0) {
            if (toc[loc[0]].chapters[0].length > 0) {
                loc = [loc[0], 0, 0];
            } else {
                loc.push(0);
            }
        }
    }

    if (loc.length === 2) {
        var currChapter = toc[loc[0]].chapters[loc[1]];

        if (currChapter.sections.length > 0) {
            if (typeof(sectionDiv) === 'undefined') {
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