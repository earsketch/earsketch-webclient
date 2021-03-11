import React, { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { usePopper } from "react-popper";
import { hot } from 'react-hot-loader/root';
import { react2angular } from 'react2angular';

import * as appState from '../app/appState';
import * as layout from '../layout/layoutState';

import { SoundBrowser } from './Sounds';
import { ScriptBrowser } from './Scripts';
import { APIBrowser } from './API';

const darkBgColor = '#223546';

export const TitleBar = () => {
    const theme = useSelector(appState.selectColorTheme);
    const dispatch = useDispatch();

    return (
        <div
            className={`flex items-center p-3 text-2xl`}
            style={{minHeight: 'fit-content'}}  // Safari-specific issue
        >
            <div className='pl-3 pr-4 font-semibold truncate'>
                CONTENT MANAGER
            </div>
            <div>
                <div
                    className={`flex justify-end w-12 h-7 p-1 rounded-full cursor-pointer ${theme==='light' ? 'bg-black' : 'bg-gray-700'}`}
                    onClick={() => {
                        dispatch(layout.collapseWest());
                    }}
                >
                    <div className='w-5 h-5 bg-white rounded-full'>&nbsp;</div>
                </div>
            </div>
        </div>
    );
};

const BrowserTab = ({ name, children }) => {
    const dispatch = useDispatch();
    const isSelected = useSelector(layout.selectWestKind)===name;

    return (
        <div
            className={`p-3 w-1/3 cursor-pointer ${isSelected ? 'border-b-4' : ''} truncate`}
            style={isSelected ? {
                color: '#F5AE3C',
                borderColor: '#F5AE3C'
            } : {}}
            onClick={() => dispatch(layout.setWest({
                open: true,
                kind: name
            }))}
        >
            { children }
            { name }
        </div>
    );
};

export const BrowserTabs = () => {
    return (
        <div
            className='flex justify-between text-center'
            id='browser-tabs'
            style={{
                backgroundColor: darkBgColor,
                color: 'white',
                minHeight: 'fit-content' // Safari-specific issue
            }}
        >
            <BrowserTab name='SOUNDS'>
                <i className='icon-headphones pr-2' />
            </BrowserTab>
            <BrowserTab name='SCRIPTS'>
                <i className='icon-embed2 pr-2' />
            </BrowserTab>
            <BrowserTab name='API'>
                <i className='icon-book pr-2' />
            </BrowserTab>
        </div>
    );
};

export const Header = ({ title }) => (
    <div className={'p-3 text-2xl hidden'}>{title}</div>
);

export const SearchBar = ({ searchText, dispatchSearch, dispatchReset }) => {
    const theme = useSelector(appState.selectColorTheme);
    return (
        <form className='p-3 pb-1' onSubmit={e => e.preventDefault()}>
            <label className={`w-full border-b-2 flex justify-between  items-center ${theme === 'light' ? 'border-black' : 'border-white'}`}>
                <input
                    className='w-full outline-none p-1 bg-transparent font-normal'
                    type='text'
                    placeholder='Search'
                    value={searchText}
                    onChange={dispatchSearch}
                />
                {
                    searchText.length!==0 &&
                    (
                        <i
                            className='icon-cross2 pr-1 cursor-pointer'
                            onClick={dispatchReset}
                        />
                    )
                }
            </label>
        </form>
    );
};

export const DropdownMultiSelector = ({ title, category, items, position, numSelected, FilterItem }) => {
    const theme = useSelector(appState.selectColorTheme);
    const [showTooltip, setShowTooltip] = useState(false);
    const [referenceElement, setReferenceElement] = useState(null);
    const [popperElement, setPopperElement] = useState(null);
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        modifiers: [{ name: 'offset', options: { offset: [0,5] } }]
    });

    const handleClick = event => {
        setPopperElement(ref => {
            setReferenceElement(rref => {
                // TODO: Pretty hacky way to get the non-null (popper-initialized) multiple refs. Refactor if possible.
                if (ref && rref && !ref.contains(event.target) && !rref.contains(event.target)) {
                    setShowTooltip(false);
                }
                return rref;
            })
            return ref;
        });
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    let margin;
    if (position==='left') margin = 'mr-2';
    else if (position==='right') margin = 'ml-2';
    else margin = 'mx-1';

    return (<>
        <div
            ref={setReferenceElement}
            onClick={() => {setShowTooltip(show => {
                update();
                return !show;
            })}}
            className={`flex justify-between vertical-center w-1/3 truncate border-b-2 cursor-pointer select-none ${margin} ${theme==='light' ? 'border-black' : 'border-white'}`}
        >
            <div className='flex justify-left truncate'>
                <div className='truncate min-w-0'>
                    {title}
                </div>
                <div className='ml-1'>
                    {numSelected ? `(${numSelected})` : ''}
                </div>
            </div>
            <i className='icon icon-arrow-down2 text-lg p-2' />
        </div>
        <div
            ref={setPopperElement}
            style={showTooltip ? styles.popper : { display:'none' }}
            {...attributes.popper}
            className={`border border-black p-2 z-50 ${theme==='light' ? 'bg-white' : 'bg-black'}`}
        >
            <div>
                <FilterItem
                    value='Clear'
                    category={category}
                />
                <hr className={`border-1 my-2 ${theme==='light' ? ' border-black' : 'border-white'}`} />
                {
                    items.map((item,index) => <FilterItem
                        key={index}
                        value={item}
                        category={category}
                    />)
                }
            </div>
        </div>
    </>);
};

export const Collection = ({ title, visible=true, initExpanded=true, children, className='' }) => {
    const [expanded, setExpanded] = useState(initExpanded);
    const [highlight, setHighlight] = useState(false);

    return (
        <div className={`${visible ? 'flex' : 'hidden'} flex-col justify-start ${className} ${expanded ? 'flex-grow' : 'flex-grow-0'}`}>
            <div className={`flex flex-row flex-grow-0 justify-start`}>
                {
                    expanded &&
                    (<div className='h-auto border-l-4 border-orange-400' />)
                }
                <div
                    className={`flex flex-grow justify-between items-center p-3 text-2xl border-t border-gray-600 cursor-pointer select-none truncate`}
                    style={{
                        backgroundColor: highlight ? '#334657' : darkBgColor,
                        color: '#F5AE3C'
                    }}
                    title={title}
                    onClick={() => setExpanded(v => !v)}
                    onMouseEnter={() => setHighlight(true)}
                    onMouseLeave={() => setHighlight(false)}
                >
                    <div className='flex items-center truncate py-1'>
                        <i className='icon-album pr-3' />
                        <div className='truncate'>{title}</div>
                    </div>
                    <div className="w-1/12 text-2xl">
                        {
                            expanded
                                ? <i className="icon icon-arrow-down2" />
                                : <i className="icon icon-arrow-right2" />
                        }
                    </div>
                </div>
            </div>
            <div className='flex-grow'>
                { expanded && children }
            </div>
        </div>
    );
};

export const Collapsed = ({ position='west', title=null }) => {
    const theme = useSelector(appState.selectColorTheme);
    const embedMode = useSelector(appState.selectEmbedMode);
    const dispatch = useDispatch();

    const onclickFn = () => {
        position==='west' ? dispatch(layout.openWest()) : dispatch(layout.openEast());
    };

    return (
        <div className={`${embedMode ? 'hidden' : 'flex'} flex-col h-full`}>
            <div
                className={`
                    flex justify-start w-12 h-7 p-1 m-3 rounded-full cursor-pointer 
                    ${theme==='light' ? 'bg-black' : 'bg-gray-700'}
                `}
                onClick={onclickFn}
            >
                <div className='w-5 h-5 bg-white rounded-full'>&nbsp;</div>
            </div>
            <div
                className={`flex-grow flex items-center justify-center`}
            >
                <div
                    className={`
                        whitespace-nowrap text-2xl font-semibold cursor-pointer tracking-widest
                        ${theme==='light' ? 'text-gray-400' : 'text-gray-600'}
                        transform ${position==='west' ? '-rotate-90' : 'rotate-90'}
                    `}
                    onClick={onclickFn}
                >
                    { title }
                </div>
            </div>
        </div>
    );
};

// Keys are weirdly all caps because of the shared usage in the layout reducer as well as component's title-bar prop.
const BrowserComponents = {
    SOUNDS: SoundBrowser,
    SCRIPTS: ScriptBrowser,
    API: APIBrowser
};

const Browser = () => {
    const theme = useSelector(appState.selectColorTheme);
    const open = useSelector(state => state.layout.west.open);
    let kind = useSelector(layout.selectWestKind);
    if (!Object.keys(BrowserComponents).includes(kind)) {
        kind = 'SOUNDS';
    }
    const BrowserBody = BrowserComponents[kind];

    return (
        <div
            className={`flex flex-col h-full w-full text-left font-sans ${theme==='light' ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
            id='content-manager'
        >
            {
                open ? (
                    <>
                        <TitleBar />
                        <BrowserTabs />
                        <BrowserBody />
                    </>
                ) : <Collapsed title='CONTENT MANAGER' position='west' />
            }
        </div>
    );
};

const HotBrowser = hot(props => {
    return (
        <Provider store={props.$ngRedux}>
            <Browser />
        </Provider>
    );
});

app.component('contentManager', react2angular(HotBrowser, null, ['$ngRedux']));