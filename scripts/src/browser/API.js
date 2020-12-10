import React, { useState } from 'react'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'
import { Provider, useSelector, useDispatch } from 'react-redux'

import { isArray } from 'lodash'

import * as helpers from 'helpers'
import * as api from './apiState'
import { selectScriptLanguage } from '../app/appState'

import { ContentManagerTitleBar } from './Sounds'

const theme = 'light'


// Highlight.js helper, adapted from https://github.com/highlightjs/highlight.js/issues/925#issuecomment-471272598
// Is there a better way to do this? If not, we should move this to its own module.
import { Component } from 'react';
import PropTypes from 'prop-types';

export class CodeHighlight extends Component {
    constructor(props) {
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
        this.codeNode && this.codeNode.current && hljs.highlightBlock(this.codeNode.current)
    }

    render() {
        const { language, children } = this.props
        return <code ref={this.codeNode} className={language}>{children}</code>
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


const paste = (name, obj) => {
    let args = []
    for (var param in obj.parameters) {
        args.push(param)
        if (obj.parameters[param].hasOwnProperty('default')) {
            args[args.length-1] = args[args.length-1].concat('=' + obj.parameters[param].default)
        }
    }
    args = args.join(', ')

    esconsole(angular.element(document.getElementById('devctrl')).scope().pasteCode(name + '(' + args + ')'), 'debug')
}

// Main point of this module.
const Entry = ({ name, obj }) => {
    // TODO don't mutate obj.details
    const forceUpdate = useForceUpdate()

    const returnText = 'Returns: ' + (obj.returns ? `(${obj.returns.type}) - ${obj.returns.description}` : 'undefined')
    return (
        <div className={`p-5 border-t border-black ${theme === 'light' ? 'border-black' : 'border-white'}`}>
            <div className="flex justify-between mb-4">
                <span onClick={() => { obj.details = !obj.details; forceUpdate() }}>
                    <span className="text-2xl font-bold" title={returnText}>{name}</span>
                </span>
                <div className="h-8">
                    <button className="hover:bg-gray-200 active:bg-gray-300 h-full pt-1 mr-2 inline-block text-lg rounded-full px-4 border border-gray-600" onClick={() => paste(name, obj)}><i className="inline-block icon icon-paste2"></i></button>
                    <button className="hover:bg-gray-200 active:bg-gray-300 h-full inline-block text-xl rounded-full pl-4 border border-gray-600" onClick={() => { obj.details = !obj.details; forceUpdate() }}>
                        <div className="inline-block w-12">{obj.details ? "Close" : "Open"}</div>
                        <i className={`inline-block align-middle mb-px mx-2 icon icon-${obj.details ? 'arrow-down' : 'arrow-right'}`}></i>
                    </button>
                </div>
            </div>
            {obj.parameters
            ? (<div className="text-base break-word">
                <span className="px-1">(</span>
                {Object.entries(obj.parameters).map(([param, paramVal]) => (
                    <span key={param}>
                        <span title={`${param} (${paramVal.type}) - ${paramVal.description}`}>{param}</span>
                        {paramVal.hasOwnProperty('default') &&
                        <span>
                            <span className="text-gray-600 px-1">=</span>
                            <span className="text-blue-600">{paramVal.default}</span>
                        </span>}
                    </span>
                )).reduce((prev, curr) => [prev, <span key={prev.key + "-comma"}> , </span>, curr])}
                <span className="px-1">)</span>
            </div>)
            : (<div className="text-base">No Parameters</div>)}
            {obj.details && <Details obj={obj}></Details>}
        </div>
    )
}


const Details = ({obj}) => {
    const language = useSelector(selectScriptLanguage)
    return (
        <div className="border-t border-gray-500 mt-4 pt-2">
            <div className="text-black"><span dangerouslySetInnerHTML={{__html: obj.description}}></span></div>
            {obj.parameters &&
            <div className="mt-4">
                <div className="text-2xl text-black font-bold">Parameters</div>
                {Object.entries(obj.parameters).map(([param, paramVal]) => (
                    <div key={param}>
                        <div className="ml-6 mt-4">
                            <span className="font-bold">{param}</span>:&nbsp;
                            <span className="text-gray-600">{paramVal.type}</span>

                            {/* rhythmEffects parameter description has a link to curriculum */}
                            <div className="text-xl"><span dangerouslySetInnerHTML={{__html: paramVal.description}}></span></div>

                            {paramVal.default &&
                            <div>
                                <span className="text-black">Default value</span>:&nbsp;
                                <span className="text-blue-600">{paramVal.default}</span>
                            </div>}
                        </div>
                    </div>
                ))}
            </div>}
            {obj.returns &&
            <div className="mt-8">
                <span className="text-2xl font-bold">Return Value</span>: <span className="text-gray-600">{obj.returns.type}</span>
                <div className="ml-6 text-black">{obj.returns.description}</div>
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
    return (
        <div>
            {entries.map(([name, obj]) => {
                const arr = isArray(obj) ? obj : [obj]
                return arr.map((o, index) => <Entry key={name + index} name={name} obj={o}></Entry>)
            })}
        </div>
    )
}

// TODO: Avoid duplication with Sounds.js.
const ContentManagerTabs = () => {
    const layoutScope = helpers.getNgController('layoutController').scope();
    return (
        <div className='flex justify-between text-center'
             style={{
                 backgroundColor: '#223546',
                 color: 'white'
             }}>
            <div className='p-3 w-1/3 cursor-pointer'
                 onClick={() => layoutScope.openSidebarTab('sound')}>
                <i className='icon-headphones pr-2' />
                SOUNDS
            </div>
            <div className='p-3 w-1/3 cursor-pointer'
                 onClick={() => layoutScope.openSidebarTab('script')}>
                <i className='icon-embed2 pr-2' />
                SCRIPTS
            </div>
            <div className='p-3 w-1/3 border-b-4 cursor-pointer'
                 style={{
                     color: '#F5AE3C',
                     borderColor: '#F5AE3C'
                 }}>
                <i className='icon-book pr-2' />
                APIs
            </div>
        </div>
    )
};

const SearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(api.selectSearchText)
    return (
        <form className='p-3 pb-1' onSubmit={e => e.preventDefault()}>
            <label className={`w-full border-b-2 flex justify-between  items-center ${theme === 'light' ? 'border-black' : 'border-white'}`}>
                <input className='w-full outline-none p-1 bg-transparent'
                       type='text'
                       placeholder='Search'
                       value={searchText}
                       onChange={event => dispatch(api.setSearchText(event.target.value))} />
                {
                    searchText.length!==0 &&
                    (
                        <i className='icon-cross2 pr-1 cursor-pointer'
                           onClick={() => dispatch(api.setSearchText(''))} />
                    )
                }
            </label>
        </form>
    )
}


const HotAPIBrowser = hot(props => {
    return (
        <Provider store={props.$ngRedux}>
            <div className={`flex flex-col absolute h-full w-full text-left ${theme==='light' ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
                 style={{marginTop:-12}}>
                <div className='flex-grow-0'>
                    <ContentManagerTitleBar />
                    <ContentManagerTabs />
                    <SearchBar></SearchBar>

                    <div className="border-b border-gray-700 uppercase font-bold text-gray-700 text-xl p-3">
                        API Entries
                    </div>
                </div>

                <div className="flex-auto overflow-y-scroll overflow-x-none">
                    <EntryList></EntryList>
                </div>
            </div>
        </Provider>
    );
})


app.component('apiBrowser', react2angular(HotAPIBrowser, null, ['$ngRedux']))