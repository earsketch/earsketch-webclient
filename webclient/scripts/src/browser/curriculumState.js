import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { selectScriptLanguage } from '../app/appState';

export const fetchContent = createAsyncThunk('curriculum/fetchContent', async ({ location, url }, { dispatch }) => {
    console.log("WOO", url, location)
    const {href: _url, loc: _location} = fixLocation(_url, location)
    console.log("hmm", _url, _location)
    dispatch(loadChapter({href: _url, loc: _location}))
    console.log(url, _location);
    console.log("YO")
    const response = await fetch(_url);
    console.log("HEY")
    const html = await response.text();
    console.log("HI")
    return { location: _location, html };
    // dispatch(...)
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
        loadChapter(state, { payload: { href, loc } }) {
            // let { href, loc } = payload
            // console.log("payload", payload)
            console.log("href", href)
            console.log("loc", loc)
            _loadChapter(state, href, loc)
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
    loadChapter,
} = curriculumSlice.actions;

export const selectSearchText = state => state.curriculum.searchText

export const selectCurrentLocation = state => state.curriculum.currentLocation

export const selectShowURLButton = state => state.curriculum.showURLButton

export const selectContent = state => state.curriculum.contentCache[state.curriculum.currentLocation]

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
    console.log("whee")
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

    console.log("woo", href, loc)
    const curriculumDir = 'curriculum/'
    return {href: curriculumDir + href, loc}
}

const _loadChapter = (state, href, loc) => {
    state.currentLocation = loc;

    // update the pageIdx for the pagination if necessary
    state.pageIdx = tocPages.map(function(v) {
        return v.toString();
    }).indexOf(loc.toString());

    state.popoverIsOpen = false;
    state.popover2IsOpen = false;
    state.showURLButton = true;
};