import React, { Component, useState, ChangeEvent, LegacyRef } from 'react'
import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'

import { isArray } from 'lodash'

import * as api from './apiState'
import { APIItem, APIParameter } from '../data/api_doc'
import { selectScriptLanguage } from '../app/appState'

import { SearchBar } from './Browser'
import * as helpers from "../helpers";
import * as appState from "../app/appState";
import * as tabs from '../editor/tabState';

interface CodeHighlightProps {
    language: string
    children: React.ReactChild | React.ReactChildren
}

// Highlight.js helper, adapted from https://github.com/highlightjs/highlight.js/issues/925#issuecomment-471272598
// Is there a better way to do this? If not, we should move this to its own module.

export class CodeHighlight extends Component<CodeHighlightProps> {
    private codeNode: LegacyRef<HTMLElement> & { current: any }
    public static propTypes = {}

    constructor(props: CodeHighlightProps) {
        super(props)
        // create a ref to highlight only the rendered node and not fetch all the DOM
        this.codeNode = React.createRef()
    }

    componentDidMount() {
        this.highlight()
    }

    componentDidUpdate() {
        this.highlight()
    }

    highlight() {
        this.codeNode?.current && hljs.highlightBlock(this.codeNode.current)
    }

    render() {
        const { language, children } = this.props
        return <code ref={this.codeNode} className={`${language} whitespace-pre`}>{children}</code>
    }
}

CodeHighlight.propTypes = {
    children: PropTypes.node.isRequired,
    language: PropTypes.string.isRequired,
}


// Hack from https://stackoverflow.com/questions/46240647/react-how-to-force-a-function-component-to-render
// TODO: Get rid of this by moving obj.details into Redux state.
function useForceUpdate() {
    const [value, setValue] = useState(0); // integer state
    return () => setValue(value => ++value); // update the state to force render
}


const paste = (name: string, obj: APIItem) => {
    let args: string[] = []
    for (var param in obj.parameters) {
        args.push(param)
        if (obj.parameters[param].hasOwnProperty('default')) {
            args[args.length-1] = args[args.length-1].concat('=' + obj.parameters[param].default)
        }
    }

    const ideScope = helpers.getNgController('ideController').scope()
    ideScope.pasteCode(`${name}(${args.join(', ')})`)
}

// Main point of this module.
const Entry = ({ name, obj }: { name: string, obj: APIItem & { details?: boolean } }) => {
    // TODO don't mutate obj.details
    const forceUpdate = useForceUpdate()
    const [highlight, setHighlight] = useState(false)
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length;
    const theme = useSelector(appState.selectColorTheme)

    const returnText = 'Returns: ' + (obj.returns ? `(${obj.returns.type}) - ${obj.returns.description}` : 'undefined')
    return (
        <div
            className={`p-5 border-b border-r border-black ${theme === 'light' ? 'border-gray-500' : 'border-gray-700'}`}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
        >
            <div className="flex justify-between mb-4">
                <span
                    className="text-2xl font-bold cursor-pointer truncate" title={returnText}
                    onClick={() => { obj.details = !obj.details; forceUpdate() }}
                >
                    {name}
                </span>
                <div className="h-8 flex">
                    <button
                        className={`hover:bg-gray-200 active:bg-gray-300 h-full pt-1 mr-2 text-lg rounded-full px-4 border border-gray-600 ${tabsOpen ? '' : 'hidden'}`}
                        onClick={() => paste(name, obj)}
                    >
                        <i className="icon icon-paste2" />
                    </button>
                    <button className="hover:bg-gray-200 active:bg-gray-300 h-full text-xl rounded-full pl-4 border border-gray-600 whitespace-nowrap" onClick={() => { obj.details = !obj.details; forceUpdate() }}>
                        <div className="inline-block w-12">{obj.details ? "Close" : "Open"}</div>
                        <i className={`inline-block align-middle mb-px mx-2 icon icon-${obj.details ? 'arrow-down' : 'arrow-right'}`} />
                    </button>
                </div>
            </div>
            {obj.parameters
            ? (<div className="text-lg font-light break-word">
                <span className="px-1">(</span>
                {Object.entries(obj.parameters).map(([param, paramVal]: [string, APIParameter ]) => (
                    <span key={param}>
                        <span title={`${param} (${paramVal.type}) - ${paramVal.description}`}>{param}</span>
                        {paramVal.hasOwnProperty('default') &&
                        <span>
                            <span className="text-gray-600 px-1">=</span>
                            <span className="text-blue-600">{paramVal.default}</span>
                        </span>}
                    </span>
                )).reduce((prev: any, curr: any): any => [prev, <span key={prev.key + "-comma"}> , </span>, curr])}
                <span className="px-1">)</span>
            </div>)
            : (<div className="text-lg font-light">No Parameters</div>)}
            {obj.details && <Details obj={obj} />}
        </div>
    )
}


const Details = ({ obj }: { obj: APIItem  }) => {
    const language = useSelector(selectScriptLanguage)
    const theme = useSelector(appState.selectColorTheme)

    return (
        <div className="border-t border-gray-500 mt-4 pt-2">
            <span dangerouslySetInnerHTML={{__html: obj.description}} />
            {obj.parameters &&
            <div className="mt-4">
                <div className="text-2xl font-bold">Parameters</div>
                {Object.entries(obj.parameters).map(([param, paramVal]) => (
                    <div key={param}>
                        <div className="ml-6 mt-4">
                            <span className="font-bold">{param}</span>:&nbsp;
                            <span className="text-gray-600">{paramVal.type}</span>

                            {/* rhythmEffects parameter description has a link to curriculum */}
                            <div className="text-xl"><span dangerouslySetInnerHTML={{__html: paramVal.description}} /></div>

                            {paramVal.default &&
                            <div>
                                <span className={`${theme==='dark'?'text-white':'text-black'}`}>Default value</span>:&nbsp;
                                <span className="text-blue-600">{paramVal.default}</span>
                            </div>}
                        </div>
                    </div>
                ))}
            </div>}
            {obj.returns &&
            <div className="mt-8">
                <span className="text-2xl font-bold">Return Value</span>: <span className="text-gray-600">{obj.returns.type}</span>
                <div className="ml-6">{obj.returns.description}</div>
            </div>}
            <div className="mt-8">
                <div className="text-2xl font-bold mb-1">Example</div>
                <div>
                    {/* note: don't indent the tags inside pre's! it will affect the styling */}
                    {language === 'python'
                    ? <pre><CodeHighlight language="python">{obj.example.python}</CodeHighlight></pre>
                    : <pre><CodeHighlight language="javascript">{obj.example.javascript}</CodeHighlight></pre>}
                </div>
            </div>

            {obj.expert &&
            <div>
                <div>Expert Description:</div>
                <div className="api-browser description">{obj.expert}</div>
            </div>}

            {obj.caveats &&
            <div>
                <div>Caveats:</div>
                <div className="api-browser description">{obj.caveats}</div>
            </div>}
        </div>
    )
}


const EntryList = () => {
    const entries = useSelector(api.selectFilteredEntries)
    return (<>
        {entries.map(([name, obj]: [string, APIItem ]) => {
            const arr = isArray(obj) ? obj : [obj]
            return arr.map((o: APIItem , index: number) => <Entry key={name + index} name={name} obj={o} />)
        })}
    </>)
}

const APISearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(api.selectSearchText)
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(api.setSearchText(event.target.value))
    const dispatchReset = () => dispatch(api.setSearchText(''))
    const props = { searchText, dispatchSearch, dispatchReset }

    return <SearchBar { ...props } />
}

export const APIBrowser = () => {
    return (
        <>
            <div className='flex-grow-0 pb-4'>
                <APISearchBar />
            </div>

            <div className="flex-auto overflow-y-scroll overflow-x-none">
                <EntryList />
            </div>
        </>
    )
}