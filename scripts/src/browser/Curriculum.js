import React, { useState, useEffect } from 'react'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'
import { Provider, useSelector, useDispatch } from 'react-redux'

import { usePopper } from 'react-popper';

import { SearchBar } from './Browser'
import * as curriculum from './curriculumState'
import * as appState from '../app/appState'


// TODO TEMP
const theme = 'light'
const currentSection = 'Table of Contents'
const toc = ESCurr_TOC

let clipboard = null

const getChNumberForDisplay = function(unitIdx, chIdx) {
    if (toc[unitIdx].chapters[chIdx] === undefined || toc[unitIdx].chapters[chIdx].displayChNum === -1) {
        return '';
    } else {
        return toc[unitIdx].chapters[chIdx].displayChNum;
    }
}

const copyURL = (language, currentLocation) => {
    const url = SITE_BASE_URI + '#?curriculum=' + currentLocation.join('-') + '&language=' + language
    clipboard.copyText(url)
    userNotification.show('Curriculum URL was copied to the clipboard')
};

const TableOfContents = () => {
    const dispatch = useDispatch()
    const focus = useSelector(curriculum.selectFocus)
    return (
        <ul id="toc">
        {Object.entries(toc).map(([unitIdx, unit]) => (
            <li key={unitIdx} className="toc-items" onClick={() => dispatch(curriculum.toggleFocus([unitIdx, null]))}>
                <div className="toc-item">
                    {unit.chapters.length > 0 &&
                     <span className="caret-container"><i className={`icon icon-arrow-${focus[0] === unitIdx ? 'down' : 'right'}`}></i></span>}
                    <a href="#" onClick={() => dispatch(curriculum.fetchContent({location: [unitIdx], url: unit.URL}))}>{unit.title}</a>
                </div>
                <ul>
                    {focus[0] === unitIdx &&
                    Object.entries(unit.chapters).map(([chIdx, ch]) => {
                        const chNumForDisplay = getChNumberForDisplay(unitIdx, chIdx, ch.title, unit.withIntro)
                        return (
                            <li key={chIdx} className="toc-chapters" onClick={(e) => { e.stopPropagation(); dispatch(curriculum.toggleFocus([unitIdx, chIdx])) }}>
                                <div className="toc-item">
                                    &emsp;
                                    {ch.sections.length > 0 ?
                                      <span className="caret-container"><i className={`icon icon-arrow-${focus[1] === chIdx ? 'down' : 'right'}`}></i></span>
                                    : <span className="empty-caret-container"><i className="icon icon-arrow-right"></i></span>}
                                    <a href="#" onClick={(e) => dispatch(curriculum.fetchContent({location: [unitIdx, chIdx], url: ch.URL}))}>
                                        {chNumForDisplay}{chNumForDisplay && <span>. </span>}{ch.title}
                                    </a>
                                </div>
                                <ul>
                                    {focus[1] == chIdx &&
                                    Object.entries(ch.sections).map(([secIdx, sec]) =>
                                        <li key={secIdx} className="toc-sections">
                                            <div className="toc-item">
                                                &emsp;&emsp;
                                                <a href="#" onClick={(e) => { e.stopPropagation(); dispatch(curriculum.fetchContent({location: [unitIdx, chIdx, secIdx], url: sec.URL}))}}>
                                                    {chNumForDisplay}{chNumForDisplay && <span>.</span>}{secIdx+1} {sec.title}
                                                </a>
                                            </div>
                                        </li>
                                    )}
                                </ul>
                            </li>
                        )
                    })}
                </ul>
            </li>
            ))}
        </ul>
    )
}

const CurriculumHeader = () => {
    const dispatch = useDispatch()
    const language = useSelector(appState.selectScriptLanguage)
    const currentLocation = useSelector(curriculum.selectCurrentLocation)
    const showURLButton = useSelector(curriculum.selectShowURLButton)
    const showPopover = useSelector(curriculum.selectPopoverIsOpen)

    const [referenceElement, setReferenceElement] = useState(null)
    const [popperElement, setPopperElement] = useState(null)
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, { placement: 'bottom-end' })

    return (
        <div id="curriculum-header">
            <div className="labels">
                <div id="layout-title">
                    <i className="icon icon-book3"></i><span> Curriculum</span>
                </div>

                <div id="header-buttons">
                    <span className="btn-toc">
                        <button ref={setReferenceElement} onClick={() => { update(); dispatch(curriculum.togglePopover()) }} className="btn btn-xs btn-action">
                            <i className="icon icon-menu3" title="Show Table of Contents"></i>
                        </button>
                    </span>

                    <span className="btn-fullscreen">
                        <button ng-click="toggleMaximization()">
                            <i className="icon-zoom-in" ng-show="!curriculumMaximized" title="Maximize curriculum"></i>
                            <i className="icon-zoom-out" ng-show="curriculumMaximized" title="Un-maximize curriculum"></i>
                        </button>
                    </span>

                    {/* copy-URL button */}
                    <span className="btn-copy-url">
                        {showURLButton &&
                        <button onClick={() => copyURL(language, currentLocation)} uib-popover="Curriculum URL Copied!" popover-placement="bottom" popover-animation="true" popover-trigger="outsideClick">
                            <i className="icon-share22" title="Copy the chapter URL to clipboard"></i>
                        </button>}
                    </span>

                    <span id="disp-lang" ng-click="toggleDisplayLanguage()">
                        {language === 'python' ? 'PY' : 'JS'}
                    </span>
                </div>

            </div>

            <div ref={setPopperElement}
                 style={{backgroundColor: "#333333", ...(showPopover ? styles.popper : { display: 'none' })}}
                 { ...attributes.popper }
                 className="border border-black p-5 z-50 rounded-lg">
                <TableOfContents></TableOfContents>
            </div>

            <div style={{clear: "both"}}></div>
            {/* The setTimeouts here are a hack to get the correct behavior wrt. focus, blur, and the children of this div.
              * The intent is to have search results disappear when neither the search bar nor the results themselves are focused. */}
            <div onFocus={() => setTimeout(() => dispatch(curriculum.showResults(true)), 0)} onBlur={() => setTimeout(() => dispatch(curriculum.showResults(false)), 0)}>
                <CurriculumSearchBar></CurriculumSearchBar>
                <CurriculumSearchResults></CurriculumSearchResults>
            </div>
        </div>
    )
}

const CurriculumSearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(curriculum.selectSearchText)
    const dispatchSearch = (event) => dispatch(curriculum.setSearchText(event.target.value))
    const dispatchReset = () => dispatch(curriculum.setSearchText(''))
    return <SearchBar {... {searchText, dispatchSearch, dispatchReset}}></SearchBar>
}

const CurriculumSearchResults = () => {
    const dispatch = useDispatch()
    const results = useSelector(curriculum.selectSearchResults)
    const showResults = useSelector(curriculum.selectShowResults) && (results.length > 0)
    return (showResults &&
        <div className="curriculum-search-results">
            {results.map(result =>
            <div key={result.id}>
                <a href="#" onClick={() => { dispatch(curriculum.fetchContent({ url: result.id })); setTimeout(() => dispatch(curriculum.showResults(false)), 0) }}>
                    <div className="search-item">
                        <span>{result.title}</span>
                    </div>
                </a>
            </div>)}
            <hr className="border-gray-600"></hr>
        </div>
    )
}

const CurriculumPane = () => {
    const currentLocation = useSelector(curriculum.selectCurrentLocation)
    const content = useSelector(curriculum.selectContent)
    return (
        <div style={{height: "inherit", padding: "61px 0 60px 0"}}>
            <CurriculumHeader></CurriculumHeader>

            <div id="curriculum-body">
                <div id="curriculum-atlas">
                    {currentLocation[0] === -1 ? <TableOfContents></TableOfContents> : <div dangerouslySetInnerHTML={{__html: (content || `Loading... ${currentLocation}`)}}></div>}
                </div>
            </div>

            <CurriculumFooter></CurriculumFooter>
        </div>
    )
}

const CurriculumFooter = () => {
    const dispatch = useDispatch()
    const showPopover = useSelector(curriculum.selectPopover2IsOpen)

    const [referenceElement, setReferenceElement] = useState(null)
    const [popperElement, setPopperElement] = useState(null)
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, { placement: 'top' })

    return (
        <>
            <div id="curriculum-footer">
                <div id="navigator" className="unselectable">
                    <span id="left-button" ng-click="prevPage()" title="Previous Page">&lt;</span>
                    <span ref={setReferenceElement} id="current-section" title={currentSection} onClick={() => { update(); dispatch(curriculum.togglePopover2()) }}>{currentSection}</span>
                    <span id="right-button" ng-click="nextPage()" title="Next Page">&gt;</span>
                </div>
            </div>
            <div ref={setPopperElement}
                 style={{backgroundColor: "#fff", ...(showPopover ? styles.popper : { display: 'none' })}}
                 { ...attributes.popper }
                 className="border border-black p-5 z-50 rounded-lg">
                <TableOfContents></TableOfContents>
            </div>
        </>
    )
}


const HotCurriculum = hot(props => {
    clipboard = props.clipboard
    return (
        <Provider store={props.$ngRedux}>
            <CurriculumPane></CurriculumPane>
        </Provider>
    )
})

app.component('curriculum', react2angular(HotCurriculum, null, ['$ngRedux', 'clipboard']))