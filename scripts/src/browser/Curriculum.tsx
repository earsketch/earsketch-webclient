import React, { useEffect, useState, useRef, MutableRefObject, ChangeEvent } from 'react'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ClipboardService } from 'angular-clipboard'

import { SearchBar, Collapsed } from './Browser'
import * as curriculum from './curriculumState'
import * as appState from '../app/appState'
import * as ESUtils from '../esutils'
import * as layout from '../layout/layoutState'
import * as userNotification from '../app/userNotification'

const toc = ESCurr_TOC as [curriculum.TOCItem]
const tocPages = ESCurr_Pages

let clipboard: ClipboardService|null = null

const copyURL = (language: string, currentLocation: number[]) => {
    const url = SITE_BASE_URI + '#?curriculum=' + currentLocation.join('-') + '&language=' + language
    clipboard?.copyText(url)
    userNotification.show('Curriculum URL was copied to the clipboard')
}

// Useful for preventing absolute-positioned elements from exceeding window height.
const useHeightLimiter = (show: boolean, marginBottom: string|null = null): [MutableRefObject<HTMLDivElement|null>, React.CSSProperties] => {
    const [height, setHeight] = useState('100vh')
    const el = useRef<HTMLDivElement|null>(null)

    const handleResize = () => {
        const elem = el.current
        elem && setHeight(`calc(100vh - ${elem.getBoundingClientRect().top}px${marginBottom ? ' - ' + marginBottom : ''})`)
    }

    useEffect(() => {
        if (show) {
            window.addEventListener('resize', handleResize)
            handleResize()
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [show])

    return [el, { maxHeight: height, overflowY: 'scroll' }]
}

const TableOfContentsChapter = ({ unitIdx, ch, chIdx }: { unitIdx:string, ch:curriculum.TOCItem, chIdx:string }) => {
    const dispatch = useDispatch()
    const focus = useSelector(curriculum.selectFocus)
    const theme = useSelector(appState.selectColorTheme)
    const textClass = 'text-' + (theme === 'light' ? 'black' : 'white')
    const chNumForDisplay = curriculum.getChNumberForDisplay(unitIdx, chIdx)
    return (
        <li className="toc-chapters py-1" onClick={(e) => { e.stopPropagation(); dispatch(curriculum.toggleFocus([unitIdx, chIdx])) }}>
            <div className="toc-item">
                &emsp;
                {ch.sections && ch.sections.length > 0 &&
                <button><i className={`pr-1 icon icon-arrow-${focus[1] === chIdx ? 'down' : 'right'}`} /></button>}
                <a href="#" className={textClass} onClick={(e) => dispatch(curriculum.fetchContent({location: [unitIdx, chIdx], url: ch.URL}))}>
                    {chNumForDisplay}{chNumForDisplay && <span>. </span>}{ch.title}
                </a>
            </div>
            <ul>
                {focus[1] == chIdx && ch.sections &&
                Object.entries(ch.sections).map(([secIdx, sec]: [string, curriculum.TOCItem]) =>
                    <li key={secIdx} className="toc-sections py-1">
                        <div className="toc-item">
                            &emsp;&emsp;
                            <a href="#" className={textClass} onClick={(e) => { e.stopPropagation(); dispatch(curriculum.fetchContent({location: [unitIdx, chIdx, secIdx], url: sec.URL}))}}>
                                {chNumForDisplay}{chNumForDisplay && <span>.</span>}{+secIdx+1} {sec.title}
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
    const textClass = 'text-' + (theme === 'light' ? 'black' : 'white')
    return (
        <>
            <div className="inline-block font-bold text-center w-full">Table of Contents</div>
            <hr className={`border-1 my-2 ${theme==='light' ? ' border-black' : 'border-white'}`} />
            <ul id="toc" className="select-none">
            {Object.entries(toc).map(([unitIdx, unit]: [string, curriculum.TOCItem]) => (
                <li key={unitIdx} className="p-2" onClick={() => dispatch(curriculum.toggleFocus([unitIdx, null]))}>
                    <div className="toc-item">
                        {unit.chapters && unit.chapters.length > 0 &&
                        <button><i className={`pr-1 icon icon-arrow-${focus[0] === unitIdx ? 'down' : 'right'}`} /></button>}
                        <a href="#" className={textClass} onClick={() => dispatch(curriculum.fetchContent({location: [unitIdx], url: unit.URL}))}>{unit.title}</a>
                    </div>
                    <ul>
                        {focus[0] === unitIdx && unit.chapters &&
                        Object.entries(unit.chapters).map(([chIdx, ch]) => <TableOfContentsChapter key={chIdx} {...{unit, unitIdx, ch, chIdx}} />)}
                    </ul>
                </li>
            ))}
            </ul>
        </>
    )
}

const CurriculumHeader = () => {
    const dispatch = useDispatch()
    const location = useSelector(curriculum.selectCurrentLocation)

    return (
        <div id="curriculum-header" style={{position: 'relative'}}>
            <TitleBar />
            <NavigationBar />

            <div onFocus={() => dispatch(curriculum.showResults(true))}
                 onBlur={(e: React.FocusEvent<HTMLDivElement>) => (!e.currentTarget.contains(e.relatedTarget as Node)) && dispatch(curriculum.showResults(false)) }>
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
    const dispatchReset = () => dispatch(curriculum.setSearchText(''))
    return <SearchBar {... {searchText, dispatchSearch, dispatchReset}} />
}

const CurriculumSearchResults = () => {
    const dispatch = useDispatch()
    const results = useSelector(curriculum.selectSearchResults)
    const showResults = useSelector(curriculum.selectShowResults) && (results.length > 0)
    const theme = useSelector(appState.selectColorTheme)
    const [resultsRef, resultsStyle] = useHeightLimiter(showResults)

    return showResults ? (
        <div ref={resultsRef} className={`absolute z-50 bg-white w-full border-b border-black ${theme === 'light' ? 'bg-white' : 'bg-gray-900'}`} style={resultsStyle}>
            {results.map(result =>
            <a tabIndex={0} key={result.id} href="#" onClick={() => { dispatch(curriculum.fetchContent({ url: result.id })); dispatch(curriculum.showResults(false)) }}>
                <div className={`px-5 py-2 search-item ${theme === 'light' ? 'text-black' : 'text-white'}`}>{result.title}</div>
            </a>)}
        </div>
    ) : null
}

export const TitleBar = () => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const language = useSelector(appState.selectScriptLanguage)
    const location = useSelector(curriculum.selectCurrentLocation)

    return (
        <div className='flex items-center p-3 text-2xl'>
            <div className='pl-3 pr-4 font-semibold truncate'>
                CURRICULUM
            </div>
            <div>
                <div
                    className={`flex justify-end w-12 h-7 p-1 rounded-full cursor-pointer ${theme==='light' ? 'bg-black' : 'bg-gray-700'}`}
                    onClick={() => dispatch(layout.collapseEast())}
                >
                    <div className='w-5 h-5 bg-white rounded-full'>&nbsp;</div>
                </div>
            </div>
            <div className="ml-auto">
                <button className="px-2 -my-1 align-middle text-3xl" onClick={() => copyURL(language, location)} title="Copy curriculum URL">
                    <i className="icon icon-link" />
                </button>
                <button className={`border-2 -my-1 ${theme === 'light' ? 'border-black' : 'border-white'} w-16 px-3 rounded-lg text-xl font-bold mx-3 align-text-bottom`}
                        title="Switch script language"
                        onClick={() => {
                            const newLanguage = (language === 'python' ? 'javascript' : 'python')
                            // TODO: Remove angular $broadcast after moving other components to React.
                            $rootScope?.$broadcast('language', newLanguage)
                            dispatch(appState.setScriptLanguage(newLanguage))
                        }}>
                    {language === 'python' ? 'PY' : 'JS'}
                </button>
            </div>
        </div>
    )
}

const CurriculumPane = () => {
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
            const p = (language === 'python')
            content.querySelectorAll(".curriculum-python").forEach((e:HTMLElement) => e.hidden = !p)
            content.querySelectorAll(".copy-btn-py").forEach((e:HTMLElement) => e.hidden = !p)
            content.querySelectorAll(".curriculum-javascript").forEach((e:HTMLElement) => e.hidden = p)
            content.querySelectorAll(".copy-btn-js").forEach((e:HTMLElement) => e.hidden = p)

            // Apply color theme to code blocks.
            if (theme === 'light') {
                content.querySelectorAll(".listingblock.curriculum-javascript").forEach((el:HTMLElement) => el.classList.add('default-pygment'))
                content.querySelectorAll(".listingblock.curriculum-python").forEach((el:HTMLElement) => el.classList.add('default-pygment'))
            } else {
                content.querySelectorAll(".listingblock.curriculum-javascript").forEach((el:HTMLElement) => el.classList.remove('default-pygment'))
                content.querySelectorAll(".listingblock.curriculum-python").forEach((el:HTMLElement) => el.classList.remove('default-pygment'))
            }
        }
    }, [content, language, paneIsOpen])

    // Highlight search text matches found in the curriculum.
    const hilitor = new Hilitor("curriculum-body")
    const searchText = useSelector(curriculum.selectSearchText)
    hilitor.setMatchType("left")
    useEffect(() => {
        hilitor.apply(searchText)
        return () => hilitor.remove()
    }, [content, searchText])

    return paneIsOpen ? (
        <div className={`font-sans h-full flex flex-col ${theme==='light' ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}>
            <CurriculumHeader />

            <div id="curriculum" className={theme === 'light' ? 'curriculum-light' : 'dark'} style={{fontSize}}>
                {content ? 
                  <article ref={curriculumBody} id="curriculum-body" className="prose dark:prose-dark px-8 h-full max-w-none overflow-y-auto" style={{fontSize}} />
                : <div>
                      <div className="text-4xl text-center py-16">Loading curriculum...</div>
                      <div className="loading-spinner" style={{width: '90px', height: '90px', borderWidth: '9px'}} />
                  </div>}
            </div>
        </div>
    ) : <Collapsed title='CURRICULUM' position='east' />
}

const NavigationBar = () => {
    const dispatch = useDispatch()
    const location = useSelector(curriculum.selectCurrentLocation)
    // @ts-ignore: Assuming the structure is correct.
    const progress = (location[2] === undefined ? 0 : (+location[2] + 1) / toc[location[0]].chapters[location[1]].sections.length)
    const showTableOfContents = useSelector(curriculum.selectShowTableOfContents)
    const pageTitle = useSelector(curriculum.selectPageTitle)
    const theme = useSelector(appState.selectColorTheme)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const [highlight, setHighlight] = useState(false)
    const [dropdownRef, tocStyle] = useHeightLimiter(showTableOfContents, '8px')

    const handleClick = (event: Event & { target: HTMLElement }) => {
        if (!dropdownRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
            dispatch(curriculum.showTableOfContents(false))
        }
    }

    useEffect(() => {
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <>
            <div id="curriculum-navigation" className="w-full flex justify-between items-stretch cursor-pointer select-none"
                 style={{backgroundColor: highlight ? '#334657' : '#223546', color: 'white'}}
                 onMouseEnter={() => setHighlight(true)}
                 onMouseLeave={() => setHighlight(false)}>
                {((location + "") === (tocPages[0] + "")) ?
                    <span />
                : <button className="text-2xl p-3" onClick={() => dispatch(curriculum.fetchContent({ location: curriculum.adjustLocation(location, -1) }))} title="Previous Page">
                    <i className="icon icon-arrow-left2" />
                    </button>}
                <button ref={triggerRef} className="w-full" title="Show Table of Contents" onClick={() => dispatch(curriculum.showTableOfContents(!showTableOfContents))}>
                    {pageTitle}
                    <i className='icon icon-arrow-down2 text-lg p-2' />
                </button>
                {((location + "") === (tocPages[tocPages.length-1] + "")) ?
                    <span />
                : <button className="text-2xl p-3" onClick={() => dispatch(curriculum.fetchContent({ location: curriculum.adjustLocation(location, +1) }))} title="Next Page">
                    <i className="icon icon-arrow-right2" />
                    </button>}
            </div>
            <div className={`z-50 pointer-events-none absolute w-full px-4 py-3 ${showTableOfContents ? '' : 'hidden'}`}>
                <div ref={dropdownRef} style={tocStyle}
                     className={`w-full pointer-events-auto p-5 border border-black bg-${theme === 'light' ? 'white' : 'black'}`}>
                    <TableOfContents />
                </div>
            </div>
            <div className="w-full" style={{height: '7px'}}>
                <div className="h-full" style={{width: progress * 100 + '%', backgroundColor: '#5872AD'}} />
            </div>
        </>
    )
}

let initialized = false
type RootScope = angular.IRootScopeService & { loadChapterForError: any } | null
let $rootScope: RootScope = null

const HotCurriculum = hot((props: {
    clipboard: ClipboardService,
    $ngRedux: any, // TODO: Use ngRedux.INgRedux with proper generic type for dispatch
    $rootScope: RootScope
}) => {
    if (!initialized) {
        clipboard = props.clipboard

        // Handle URL parameters.
        const locstr = ESUtils.getURLParameter('curriculum')
        if (locstr === null) {
            // Load welcome page initially.
            props.$ngRedux.dispatch(curriculum.fetchContent({ location: [0] }))
        } else {
            // The anonymous function is necessary here because .map(parseInt) passes the index as parseInt's second argument (radix).
            const loc = locstr.split('-').map((x: string) => parseInt(x))
            if (loc.every((idx: number) => !isNaN(idx))) {
                props.$ngRedux.dispatch(curriculum.fetchContent({ location: loc }))
            }
        }

        const languageParam = ESUtils.getURLParameter('language')
        if (languageParam && ['python', 'javascript'].indexOf(languageParam) > -1) {
            // If the user has a script open, that language overwrites this one due to ideController;
            // this is probably a bug, but the old curriculumPaneController has the same behavior.
            props.$ngRedux.dispatch(appState.setScriptLanguage(languageParam))
        }

        $rootScope = props.$rootScope
        // TODO: Remove angular $broadcast after moving other components to React.
        const language = props.$ngRedux.getState().app.scriptLanguage

        if ($rootScope) {
            $rootScope.$broadcast('language', language)

            // Hack to facilitate Angular loading curriculum page for errors in console.
            // TODO: Remove this after we've ported templates/index.html to React.
            $rootScope.loadChapterForError = (errorMessage: string) => {
                const aliases: any = {"referenceerror": "nameerror", "rangeerror": "valueerror"}
                const types = ["importerror", "indentationerror", "indexerror", "nameerror",
                    "parseerror", "syntaxerror", "typeerror", "valueerror"]
                let type = errorMessage.split(" ")[3].slice(0, -1).toLowerCase()
                type = aliases[type] || type
                const anchor = types.includes(type) ? '#' + type : ''
                props.$ngRedux.dispatch(curriculum.fetchContent({ url: `every-error-explained-in-detail.html${anchor}` }))
            }
            initialized = true
        }
    }

    return (
        <Provider store={props.$ngRedux}>
            <CurriculumPane />
        </Provider>
    )
})

app.component('curriculum', react2angular(HotCurriculum, null, ['$ngRedux', 'clipboard', '$rootScope']))