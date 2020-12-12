import React, { useState } from 'react'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'
import { Provider, useSelector, useDispatch } from 'react-redux'
import * as curriculum from './curriculumState'

import * as helpers from 'helpers'
import { selectScriptLanguage } from '../app/appState'

const theme = 'light'

// TODO TEMP
const currentSection = 'Table of Contents'
const language = 'python'
const toc = ESCurr_TOC

let clipboard = null

const getChNumberForDisplay = function(unitIdx, chIdx) {
    if (toc[unitIdx].chapters[chIdx] === undefined || toc[unitIdx].chapters[chIdx].displayChNum === -1) {
        return '';
    } else {
        return toc[unitIdx].chapters[chIdx].displayChNum;
    }
}

const chNumForDisplay = getChNumberForDisplay(0, 0)

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
            <li class="toc-items"  ng-click="toggleFocus($event);">
                <div class="toc-item">
                    <span ng-if="focus[0]!==unitIdx" ng-show="unit.chapters.length > 0" class="caret-container"><i class="icon icon-arrow-right"></i></span>
                    <span ng-if="focus[0]===unitIdx" ng-show="unit.chapters.length > 0" class="caret-container"><i class="icon icon-arrow-down"></i></span>
                    <a href="#" onClick={() => dispatch(curriculum.fetchContent({location: [unitIdx], url: unit.URL}))}>{unit.title}</a>
                </div>
                <ul>
                    {focus[0] === unitIdx &&
                    Object.entries(unit.chapters).map(([chIdx, ch]) => {
                        const chNumForDisplay = getChNumberForDisplay(unitIdx, chIdx, ch.title, unit.withIntro)
                        return (
                            <li class="toc-chapters" ng-show="focus[0]===unitIdx" ng-repeat="(chIdx, ch) in unit.chapters" ng-init="chNumForDisplay = getChNumberForDisplay(unitIdx, chIdx, ch.title, unit.withIntro)">
                                <div class="toc-item">
                                    &emsp;
                                    <span ng-if="focus[1]!==chIdx" ng-show="ch.sections.length > 0" class="caret-container"><i class="icon icon-arrow-right"></i></span>
                                    <span ng-if="focus[1]===chIdx" ng-show="ch.sections.length > 0" class="caret-container"><i class="icon icon-arrow-down"></i></span>
                                    <span ng-show="ch.sections.length == 0" class="empty-caret-container"><i class="icon icon-arrow-right"></i></span>
                                    <a href="#" ng-click="loadChapter(ch.URL, [unitIdx, chIdx]);">
                                        {chNumForDisplay}<span ng-show="chNumForDisplay">. </span>{ch.title}
                                    </a>
                                </div>
                                <ul>
                                    <li class="toc-sections" ng-show="focus[1]===chIdx" ng-repeat="(secIdx, sec) in ch.sections">
                                        <div class="toc-item">
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
    const language = useSelector(selectScriptLanguage)
    const currentLocation = useSelector(curriculum.selectCurrentLocation)
    const showURLButton = useSelector(curriculum.selectShowURLButton)
    return (
        <div id="curriculum-header">
            <div class="labels">
                <div id="layout-title">
                    <i class="icon icon-book3"></i><span> Curriculum</span>
                </div>

                <div id="header-buttons">
                    <span class="btn-toc">
                        <button uib-popover-template="'tocPopoverTemplate.html'" popover-placement="bottom-right" popover-trigger="outsideClick" popover-is-open="popoverIsOpen" type="button" class="btn btn-xs btn-action">
                            <i class="icon icon-menu3" title="Show Table of Contents"></i>
                        </button>
                    </span>

                    <span class="btn-fullscreen">
                        <button ng-click="toggleMaximization()">
                            <i class="icon-zoom-in" ng-show="!curriculumMaximized" title="Maximize curriculum"></i>
                            <i class="icon-zoom-out" ng-show="curriculumMaximized" title="Un-maximize curriculum"></i>
                        </button>
                    </span>

                    {/* slide view: not getting ported
                    <span class="btn-slides">
                        <button ng-show="showSlideButton" ng-click="toggleSlides()">
                            <i class="icon-display2" ng-show="!showSlides" title="Show slides"></i>
                            <i class="icon-paragraph-center3" ng-show="showSlides" title="Show curriculum"></i>
                        </button>
                    </span>*/}

                    {/* copy-URL button */}
                    <span class="btn-copy-url">
                        {showURLButton &&
                        <button onClick={() => copyURL(language, currentLocation)} uib-popover="Curriculum URL Copied!" popover-placement="bottom" popover-animation="true" popover-trigger="outsideClick">
                            <i class="icon-share22" title="Copy the chapter URL to clipboard"></i>
                        </button>}
                    </span>

                    <span id="disp-lang" ng-click="toggleDisplayLanguage()">
                        {language === 'python' ? 'PY' : 'JS'}
                    </span>
                </div>

            </div>

            {/* note: popover-trigger="outsideClick" to remain open when arrows are clicked; auto-close after loadChapter using the popoverIsOpen value */}

            {/*<script type="text/ng-template" id="tocPopoverTemplate.html">*/}
            <TableOfContents></TableOfContents>
            {/*</script>*/}

            {/* Slide stuff, probably won't be ported over:

            <script type="text/ng-template" id="mySlideTemplate.html">
                <br>
                <div ng-repeat="url in slides">
                    <div class="slide-container">
                        <img ng-src="{{url}}">
                        <br>
                    </div>
                </div>
            </script>*/}

            <div style={{clear: "both"}}></div>
            <div curriculumsearch id="curriculum-search"></div>
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
                    <div ng-include="templateURL" onload="chapterLoaded()" dangerouslySetInnerHTML={{__html: (content || `Loading... ${currentLocation}`)}}></div>
                </div>
            </div>

            <div id="curriculum-footer">
                <div id="navigator" class="unselectable">
                    <span id="left-button" ng-click="prevPage()" title="Previous Page">&lt;</span>
                    <span id="current-section" title={currentSection} uib-popover-template="'tocPopoverTemplate.html'" popover-placement="top" popover-trigger="outsideClick" popover-append-to-body="true" popover-is-open="popover2IsOpen">{currentSection}</span>
                    <span id="right-button" ng-click="nextPage()" title="Next Page">&gt;</span>
                </div>
            </div>
        </div>
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