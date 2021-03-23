import React, { useState, useEffect, useRef } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { hot } from 'react-hot-loader/root';
import { react2angular } from 'react2angular';
import { usePopper } from "react-popper";
import * as classNames from 'classnames';

import * as appState from '../app/appState';
import * as tabs from './tabState';
import * as scripts from '../browser/scriptsState';
import * as helpers from 'helpers';

import { DropdownContextMenuCaller } from '../browser/ScriptsMenus';

const CreateScriptButton = () => {
    const ideControllerScope = helpers.getNgController('ideController').scope();
    return (
        <div
            className={`
                bg-black text-white dark:bg-white dark:text-black
                h-7 w-7 mx-3 my-2
                flex items-center justify-center flex-shrink-0
                text-lg cursor-pointer
            `}
            id='create-script-button'
            onClick={() => ideControllerScope.createScript()}
        >
            <i className='icon icon-plus2' />
        </div>
    );
};

const Tab = ({ scriptID, scriptName, active=false, index }) => {
    const dispatch = useDispatch();
    const modified = useSelector(tabs.selectModifiedScripts).includes(scriptID);
    const ngTabControllerScope = helpers.getNgController('tabController').scope();
    const [highlight, setHighlight] = useState(false);

    const allScripts = useSelector(scripts.selectAllScriptEntities);
    const script = allScripts[scriptID];
    const scriptType = script.isShared && 'shared' || script.readonly && 'readonly' || 'regular';
    var tabClass = classNames('w-48 flex-shrink-0 h-14 cursor-pointer',
        {
            'bg-blue ': active,//dark:bg-gray-300
            'bg-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800': !active, // background
            'border border-gray-300 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-900': !active // border
        },
        {
            // treating tab text color separately for code readability
            'text-white dark:text-gray-300': active && !modified,
            'text-red-500':  active && modified,
            'text-red-600': !active && modified,
            'text-gray-600 dark:text-gray-400': !active && !modified
        },
        'flex relative');

    return (
        <div
            className={tabClass}
            key={scriptID}
            onClick={() => {
                dispatch(tabs.setActiveTabAndEditor(scriptID));

                // TODO: This triggers clearHistory
                ngTabControllerScope.swapTab(index);
            }}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
            title={script.name}
        >
            <DropdownContextMenuCaller
                className={`flex justify-between items-center truncate p-3 w-full`}
                script={script}
                type={scriptType}
            >
                <div className='flex items-center space-x-3 truncate'>
                    { (script.isShared && !script.collaborative) && <i className='icon-copy3 align-middle' title={`Shared by ${script.creator}`} /> }
                    { script.collaborative && <i className='icon-users4 align-middle' title={`Shared with ${script.collaborators.join(', ')}`} /> }
                    <div className='truncate select-none align-middle'>{scriptName}</div>
                </div>
                <button
                    className='flex items-center'
                    onClick={(event) => ngTabControllerScope.closeTab(index, event)}
                >
                    <i className={`icon-cross2 cursor-pointer`} />
                </button>
            </DropdownContextMenuCaller>
            { active && (<div className={`w-full border-b-4 border-amber absolute bottom-0`} />) }
        </div>
    );
};

const CloseAllTab = () => {
    const ngTabControllerScope = helpers.getNgController('tabController').scope();

    return (
        <div
            className={`
                w-48 flex-shrink-0 h-12 p-3 cursor-pointer
                flex items-center
                text-white bg-gray-800 border border-gray-800    
            `}
            onClick={() => ngTabControllerScope.closeAllTabs()}
        >
            Close All
        </div>
    );
};

const MainTabGroup = () => {
    const openTabs = useSelector(tabs.selectOpenTabs);
    const activeTab = useSelector(tabs.selectActiveTabID);
    const visibleTabs = useSelector(tabs.selectVisibleTabs);
    const allScripts = useSelector(scripts.selectAllScriptEntities);

    return (
        <div
            className={`flex items-center truncate`}
        >
            {
                visibleTabs.map(ID => allScripts[ID] &&(
                    <Tab
                        scriptID={ID}
                        scriptName={allScripts[ID].name}
                        active={ID===activeTab}
                        key={ID}
                        index={openTabs.indexOf(ID)}
                    />
                ))
            }
            <CreateScriptButton />
        </div>
    );
};

const TabDropdown = () => {
    const openTabs = useSelector(tabs.selectOpenTabs);
    const hiddenTabs = useSelector(tabs.selectHiddenTabs);
    const allScripts = useSelector(scripts.selectAllScriptEntities);
    const [highlight, setHighlight] = useState(false);
    const activeTab = useSelector(tabs.selectActiveTabID);
    const theme = useSelector(appState.selectColorTheme);

    const [showDropdown, setShowDropdown] = useState(false);
    const [referenceElement, setReferenceElement] = useState(null);
    const [popperElement, setPopperElement] = useState(null);
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        modifiers: [{ name: 'offset', options: { offset: [0,5] } }]
    });

    return (<>
        <div
            ref={setReferenceElement}
            className={`flex justify-around items-center flex-shrink-0 
                h-12 p-3 
                ${theme==='light' ? 'text-gray-800' : 'text-gray-200'}
                ${theme==='light'
                    ? (highlight ? 'bg-gray-100' : 'bg-gray-200')
                    : (highlight ? 'bg-gray-500' : 'bg-gray-800')}
                cursor-pointer select-none
            `}
            onClick={() => {setShowDropdown(show => {
                update();
                return !show;
            })}}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
        >
            { openTabs.length === hiddenTabs.length ? 'All Tabs' : 'Other Tabs' }
            <i className='icon icon-arrow-down2 text-lg p-2' />
        </div>
        <div
            ref={setPopperElement}
            style={showDropdown ? styles.popper : { display:'none' }}
            { ...attributes.popper }
            className={`border border-black z-50 bg-white`}
        >
            {
                hiddenTabs.map(ID => allScripts[ID] && (
                    <Tab
                        scriptID={ID}
                        scriptName={allScripts[ID].name}
                        active={ID===activeTab}
                        key={ID}
                        index={openTabs.indexOf(ID)}
                    />
                ))
            }
            <CloseAllTab />
        </div>
    </>);
};

const Tabs = () => {
    const dispatch = useDispatch();
    const openTabs = useSelector(tabs.selectOpenTabs);
    const truncated = useSelector(tabs.selectTabsTruncated);
    const theme = useSelector(appState.selectColorTheme);
    const embedMode = useSelector(appState.selectEmbedMode);

    const tabWidth = 120;
    const createButtonWidth = 35;
    const dropdownWidth = 95;
    const containerRef = useRef(null);

    // Note: Manually compute the visible tabs from the content width.
    // IntersectionObserver API would be more desirable but it is hard to accommodate the appended createButton and dropdown menu.
    const observer = new ResizeObserver(entries => {
        const containerWidth = entries[0].contentRect.width;
        const cutoff = ~~((containerWidth-createButtonWidth-dropdownWidth*truncated)/tabWidth);
        dispatch(tabs.setNumVisibleTabs(cutoff));
    });
    useEffect(() => {
        containerRef.current && observer.observe(containerRef.current);

        return () => {
            containerRef.current && observer.unobserve(containerRef.current);
        }
    }, [containerRef, openTabs, truncated]);

    return (
        <div
            className={`
                ${embedMode ? 'hidden' : 'flex'}
                justify-between items-center
                ${theme==='light' ? 'bg-gray-200' : 'dark bg-gray-900'}
            `}
            ref={containerRef}
        >
            <MainTabGroup />
            { truncated && (<TabDropdown />) }
        </div>
    );
};

const HotTabs = hot(props => {
    return (
        <Provider store={props.$ngRedux}>
            <Tabs />
        </Provider>
    );
});

app.component('scriptTabs', react2angular(HotTabs,null,['$ngRedux']));