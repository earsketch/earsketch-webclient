import React, { useState, useEffect } from 'react'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'
import { Provider, useSelector, useDispatch } from 'react-redux'

import { usePopper } from 'react-popper';

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
    return (
        <ul id="toc">
        {Object.entries(toc).map(([unitIdx, unit]) => (
            <li key={unitIdx} className="toc-items"  ng-click="toggleFocus($event);">
                <div className="toc-item">
                    <span ng-if="focus[0]!==unitIdx" ng-show="unit.chapters.length > 0" className="caret-container"><i className="icon icon-arrow-right"></i></span>
                    <span ng-if="focus[0]===unitIdx" ng-show="unit.chapters.length > 0" className="caret-container"><i className="icon icon-arrow-down"></i></span>
                    <a href="#" onClick={() => dispatch(curriculum.fetchContent({location: [unitIdx], url: unit.URL}))}>{unit.title}</a>
                </div>
                <ul>
                    {focus[0] === unitIdx &&
                    Object.entries(unit.chapters).map(([chIdx, ch]) => {
                        const chNumForDisplay = getChNumberForDisplay(unitIdx, chIdx, ch.title, unit.withIntro)
                        return (
                            <li className="toc-chapters" ng-show="focus[0]===unitIdx" ng-repeat="(chIdx, ch) in unit.chapters" ng-init="chNumForDisplay = getChNumberForDisplay(unitIdx, chIdx, ch.title, unit.withIntro)">
                                <div className="toc-item">
                                    &emsp;
                                    <span ng-if="focus[1]!==chIdx" ng-show="ch.sections.length > 0" className="caret-container"><i className="icon icon-arrow-right"></i></span>
                                    <span ng-if="focus[1]===chIdx" ng-show="ch.sections.length > 0" className="caret-container"><i className="icon icon-arrow-down"></i></span>
                                    <span ng-show="ch.sections.length == 0" className="empty-caret-container"><i className="icon icon-arrow-right"></i></span>
                                    <a href="#" ng-click="loadChapter(ch.URL, [unitIdx, chIdx]);">
                                        {chNumForDisplay}<span ng-show="chNumForDisplay">. </span>{ch.title}
                                    </a>
                                </div>
                                <ul>
                                    <li className="toc-sections" ng-show="focus[1]===chIdx" ng-repeat="(secIdx, sec) in ch.sections">
                                        <div className="toc-item">
                                            &emsp;&emsp;
                                            <a href="#" ng-click="loadChapter(sec.URL, [unitIdx, chIdx, secIdx]);">
                                                {chNumForDisplay}<span ng-show="chNumForDisplay">.</span>{secIdx+1} {sec.title}
                                            </a>
                                        </div>
                                    </li>
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
            <CurriculumSearch></CurriculumSearch>
        </div>
    )
}

// TODO: use the common component instead
const CurriculumSearch = () => {
    return (
        <div>
            <div className="input-group" style={{width: "100%", paddingLeft: "18px"}}>
                <form>
                    <i className="icon icon-search browser-icon-search"></i>
                    <input type="search" name="Search" placeholder="Search" className="search-bar ng-pristine ng-untouched ng-valid" style={{height: "2em"}} ng-model="query" ng-click="recallResults()" />
                </form>
                <button id="search-clear" className="btn btn-xs btn-primary" style={{position: "absolute", right: "-10px", top: "2px", width: "27px"}} ng-click="query=''">X</button>
            </div>
            <div className="curriculum-search-results">
                <div ng-repeat="result in results">
                    <a href="#" ng-click="loadChapter(result.id); closeSearchResults();">
                        <div className="search-item">
                            <span>TODO</span>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}

const CurriculumPane = () => {
    const currentLocation = useSelector(curriculum.selectCurrentLocation)
    const content = useSelector(curriculum.selectContent)
    return (
        <div style={{height: "inherit", padding: "61px 0 60px 0"}}>
            <CurriculumHeader></CurriculumHeader>

            <div id="curriculum-body">
                <div id="curriculum-atlas">
                    <div ng-include="templateURL" /*onload="chapterLoaded()"*/ dangerouslySetInnerHTML={{__html: (content || `Loading... ${currentLocation}`)}}></div>
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