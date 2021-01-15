import React, { useEffect, useState, useRef } from 'react'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'
import { Provider, useSelector, useDispatch } from 'react-redux'

import { usePopper } from 'react-popper'

import { SearchBar } from './Browser'
import * as curriculum from './curriculumState'
import * as appState from '../app/appState'
import * as helpers from '../helpers'


const toc = ESCurr_TOC
const tocPages = ESCurr_Pages

let clipboard = null


const copyURL = (language, currentLocation) => {
    const url = SITE_BASE_URI + '#?curriculum=' + currentLocation.join('-') + '&language=' + language
    clipboard.copyText(url)
    userNotification.show('Curriculum URL was copied to the clipboard')
}

const TableOfContentsChapter = ({ unit, unitIdx, ch, chIdx }) => {
    const dispatch = useDispatch()
    const focus = useSelector(curriculum.selectFocus)
    const theme = useSelector(appState.selectColorTheme)
    const textClass = 'text-' + (theme === 'light' ? 'black' : 'white')
    const chNumForDisplay = curriculum.getChNumberForDisplay(unitIdx, chIdx, ch.title, unit.withIntro)
    return (
        <li className="toc-chapters py-1" onClick={(e) => { e.stopPropagation(); dispatch(curriculum.toggleFocus([unitIdx, chIdx])) }}>
            <div className="toc-item">
                &emsp;
                {ch.sections.length > 0 &&
                <button><i className={`pr-1 icon icon-arrow-${focus[1] === chIdx ? 'down' : 'right'}`}></i></button>}
                <a href="#" className={textClass} onClick={(e) => dispatch(curriculum.fetchContent({location: [unitIdx, chIdx], url: ch.URL}))}>
                    {chNumForDisplay}{chNumForDisplay && <span>. </span>}{ch.title}
                </a>
            </div>
            <ul>
                {focus[1] == chIdx &&
                Object.entries(ch.sections).map(([secIdx, sec]) =>
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
            {Object.entries(toc).map(([unitIdx, unit]) => (
                <li key={unitIdx} className="p-2" onClick={() => dispatch(curriculum.toggleFocus([unitIdx, null]))}>
                    <div className="toc-item">
                        {unit.chapters.length > 0 &&
                        <button><i className={`pr-1 icon icon-arrow-${focus[0] === unitIdx ? 'down' : 'right'}`}></i></button>}
                        <a href="#" className={textClass} onClick={() => dispatch(curriculum.fetchContent({location: [unitIdx], url: unit.URL}))}>{unit.title}</a>
                    </div>
                    <ul>
                        {focus[0] === unitIdx &&
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
    const progress = (location[2] === undefined ? 0 : (location[2] + 1) / toc[location[0]].chapters[location[1]].sections.length)

    return (
        <div id="curriculum-header">
            <TitleBar></TitleBar>
            <NavigationBar></NavigationBar>

            {/* The setTimeouts here are a hack to get the correct behavior wrt. focus, blur, and the children of this div.
              * The intent is to have search results disappear when neither the search bar nor the results themselves are focused. */}
            <div onFocus={() => setTimeout(() => dispatch(curriculum.showResults(true)), 0)} onBlur={() => setTimeout(() => dispatch(curriculum.showResults(false)), 0)}>
                <CurriculumSearchBar></CurriculumSearchBar>
                <CurriculumSearchResults></CurriculumSearchResults>
            </div>

            <div className="w-full" style={{height: '7px', backgroundColor: '#D8D8D8'}}>
                <div className="h-full" style={{width: progress * 100 + '%', backgroundColor: '#5872AD'}}></div>
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
    const theme = useSelector(appState.selectColorTheme)
    return (showResults &&
        <div className={`absolute z-50 bg-white w-full border-b border-black ${theme === 'light' ? 'bg-white' : 'bg-gray-900'}`}>
            {results.map(result =>
            <a key={result.id} href="#" onClick={() => { dispatch(curriculum.fetchContent({ url: result.id })); setTimeout(() => dispatch(curriculum.showResults(false)), 0) }}>
                <div className={`search-item ${theme === 'light' ? 'text-black' : 'text-white'}`}>{result.title}</div>
            </a>)}
        </div>
    )
}

const Settings = () => {
    const dispatch = useDispatch()
    const [showSettings, setShowSettings] = useState(null)
    const [referenceElement, setReferenceElement] = useState(null)
    const [popperElement, setPopperElement] = useState(null)
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, { placement: 'bottom' })
    const theme = useSelector(appState.selectColorTheme)

    const language = useSelector(appState.selectScriptLanguage)
    const maximized = useSelector(curriculum.selectMaximized)
    const currentLocation = useSelector(curriculum.selectCurrentLocation)

    const Setting = ({ onClick, value }) => {
        const theme = useSelector(appState.selectColorTheme)
        const [highlight, setHighlight] = useState(false)
        return (
            <div className={`flex justify-left items-center cursor-pointer px-8 ${theme==='light' ? (highlight ? 'bg-blue-200' : 'bg-white') : (highlight ? 'bg-blue-500' : 'bg-black')}`}
                 onClick={(event) => { onClick(event); setShowSettings(false); update() }}
                 onMouseEnter={() => setHighlight(true)}
                 onMouseLeave={() => setHighlight(false)}>
                <div className='select-none'>{value}</div>
            </div>
        )
    }

    return (
        <div className="inline-block outline-none" tabIndex="0"
             title="Show more options"
             onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setShowSettings(false)
                    update()
                }
             }}>
            <button ref={setReferenceElement} onClick={() => { setShowSettings(!showSettings); update() }} className="text-3xl leading-none align-middle">
                <i className="icon icon-cog2" style={{lineHeight: '0'}}></i>
                <span className="caret"></span>
            </button>

            <div ref={setPopperElement}
                 style={showSettings ? styles.popper : { display:'none' }}
                 {...attributes.popper}
                 className={`border border-black p-2 z-50 ${theme==='light' ? 'bg-white' : 'bg-black'}`}>

                <Setting onClick={() => dispatch(curriculum.toggleMaximized())} value={(maximized ? "Unmaximize" : "Maximize") + " Curriculum"}></Setting>
                <Setting onClick={() => copyURL(language, currentLocation)} value={"Copy URL to Clipboard"}></Setting>
            </div>
        </div>
    )
}

export const TitleBar = () => {
    const dispatch = useDispatch()
    const layoutScope = helpers.getNgController('layoutController').scope()
    const theme = useSelector(appState.selectColorTheme)
    const language = useSelector(appState.selectScriptLanguage)

    return (
        <div className='flex items-center p-3 text-2xl'>
            <div className='pl-3 pr-4 font-normal'>
                CURRICULUM
            </div>
            <div>
                <div
                    className={`flex justify-end w-12 h-7 p-1 rounded-full cursor-pointer ${theme==='light' ? 'bg-black' : 'bg-gray-700'}`}
                    onClick={() => {
                        layoutScope.toggleLayout('curriculum')
                        layoutScope.$applyAsync()
                    }}
                >
                    <div className='w-5 h-5 bg-white rounded-full'>&nbsp;</div>
                </div>
            </div>
            <div className="ml-auto">
                <button className={`border-2 -my-1 ${theme === 'light' ? 'border-black' : 'border-white'} w-16 px-3 rounded-lg text-xl font-bold mx-3 align-text-bottom`}
                        title="Switch script language"
                        onClick={() => dispatch(appState.toggleScriptLanguage())}>
                    {language === 'python' ? 'PY' : 'JS'}
                </button>

                <Settings></Settings>
            </div>
        </div>
    )
}

const CurriculumPane = () => {
    const language = useSelector(appState.selectScriptLanguage)
    const fontSize = useSelector(appState.selectFontSize)

    const currentLocation = useSelector(curriculum.selectCurrentLocation)
    const content = useSelector(curriculum.selectContent)
    // The value isn't used, but we need the component to re-render after layoutController updates.
    const maximized = useSelector(curriculum.selectMaximized)

    // Highlight search text matches found in the curriculum.
    const myHilitor = new Hilitor("curriculum-atlas")
    const searchText = useSelector(curriculum.selectSearchText)
    myHilitor.setMatchType("left")
    useEffect(() => myHilitor.apply(searchText))

    // Filter content by language.
    if (content) {
        const p = (language === 'python')
        content.querySelectorAll(".curriculum-python").forEach(e => e.hidden = !p)
        content.querySelectorAll(".copy-btn-py").forEach(e => e.hidden = !p)
        content.querySelectorAll(".curriculum-javascript").forEach(e => e.hidden = p)
        content.querySelectorAll(".copy-btn-js").forEach(e => e.hidden = p)
    }

    // Color theme
    const theme = useSelector(appState.selectColorTheme)
    useEffect(() => {
        if (theme === 'dark') {
            // TODO: remove angular stuff, handle this more cleanly.
            // remove default pygment class
            angular.element('#curriculum').removeClass('curriculum-light')
            angular.element("#curriculum .curriculum-javascript").removeClass('default-pygment')
            angular.element("#curriculum .curriculum-python").removeClass('default-pygment')

        } else {
            // add default pygment class
            angular.element('#curriculum').addClass('curriculum-light')
            angular.element("#curriculum .curriculum-javascript").addClass('default-pygment')
            angular.element("#curriculum .curriculum-python").addClass('default-pygment')
        }
    })

    return (
        <div className={`font-sans ${theme==='light' ? 'bg-white text-black' : 'bg-gray-900 text-white'}`} style={{height: "inherit", padding: "61px 0 60px 0", fontSize}}>
            <CurriculumHeader></CurriculumHeader>

            <div id="curriculum" style={{fontSize}}>
                <div className="p-8 h-full overflow-y-auto" dangerouslySetInnerHTML={{__html: (content ? content.innerHTML : `Loading... ${currentLocation}`)}}></div>
            </div>
        </div>
    )
}

const NavigationBar = () => {
    const dispatch = useDispatch()
    const location = useSelector(curriculum.selectCurrentLocation)
    const showTableOfContents = useSelector(curriculum.selectShowTableOfContents)
    const pageTitle = useSelector(curriculum.selectPageTitle)
    const theme = useSelector(appState.selectColorTheme)
    const dropdownRef = useRef(null)
    const triggerRef = useRef(null)
    const [highlight, setHighlight] = useState(false)

    const handleClick = event => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
            triggerRef.current && !triggerRef.current.contains(event.target)) {
            dispatch(curriculum.showTableOfContents(false))
        }
    }

    useEffect(() => {
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <>
            <div className="w-full flex justify-between items-center cursor-pointer select-none"
                 style={{backgroundColor: highlight ? '#334657' : '#223546', color: 'white'}}
                 onMouseEnter={() => setHighlight(true)}
                 onMouseLeave={() => setHighlight(false)}>
                {((location + "") === (tocPages[0] + "")) ?
                    <span></span>
                : <button className="text-2xl p-3" onClick={() => dispatch(curriculum.fetchContent({ location: curriculum.adjustLocation(location, -1) }))} title="Previous Page">
                    <i className="icon icon-arrow-left2"></i>
                    </button>}
                <button ref={triggerRef} title="Show Table of Contents" onClick={() => dispatch(curriculum.showTableOfContents(!showTableOfContents))}>
                    {pageTitle}
                    <i className='icon icon-arrow-down2 text-lg p-2' />
                </button>
                {((location + "") === (tocPages[tocPages.length-1] + "")) ?
                    <span></span>
                : <button className="text-2xl p-3" onClick={() => dispatch(curriculum.fetchContent({ location: curriculum.adjustLocation(location, +1) }))} title="Next Page">
                    <i className="icon icon-arrow-right2"></i>
                    </button>}
            </div>
            <div ref={dropdownRef} className={`absolute z-50 w-full border-b border-black p-5 ${theme==='light' ? 'bg-white' : 'bg-black'} ${showTableOfContents ? '' : 'hidden'}`}>
                <TableOfContents></TableOfContents>
            </div>
        </>
    )
}


const HotCurriculum = hot(props => {
    clipboard = props.clipboard

    // Handle URL parameters.
    const ESUtils = props.ESUtils
    const locstr = ESUtils.getURLParameters('curriculum')
    if (locstr === null) {
        // Load welcome page initially.
        props.$ngRedux.dispatch(curriculum.fetchContent({ location: [0] }))
    } else {
        // The anonymous function is necessary here because .map(parseInt) passes the index as parseInt's second argument (radix).
        const loc = locstr.split('-').map((x) => parseInt(x))
        if (loc.every((idx) => !isNaN(idx))) {
            props.$ngRedux.dispatch(curriculum.fetchContent({ location: loc }))
        }
    }

    if (['python', 'javascript'].indexOf(ESUtils.getURLParameters('language')) > -1) {
        // If the user has a script open, that language overwrites this one due to ideController;
        // this is probably a bug, but the old curriculumPaneController has the same behavior.
        props.$ngRedux.dispatch(appState.setScriptLanguage(ESUtils.getURLParameters('language')))
    }

    return (
        <Provider store={props.$ngRedux}>
            <CurriculumPane></CurriculumPane>
        </Provider>
    )
})

app.component('curriculum', react2angular(HotCurriculum, null, ['$ngRedux', 'clipboard', 'ESUtils']))