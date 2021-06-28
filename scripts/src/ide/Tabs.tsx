import * as classNames from 'classnames';
import React, { useState, useEffect, useRef, LegacyRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { usePopper } from "react-popper";
import { useTranslation } from "react-i18next";

import { closeAllTabs } from '../app/App';
import * as appState from '../app/appState';
import * as editor from './ideState';
import { createScript } from './IDE';
import { DropdownContextMenuCaller } from '../browser/ScriptsMenus';
import * as scripts from '../browser/scriptsState';
import * as tabs from './tabState';
import * as userProject from '../app/userProject';
import { useHeightLimiter } from "../Utils";

const CreateScriptButton = () => {
    return (
        <div
            className={`
                bg-black text-white dark:bg-white dark:text-black
                h-7 w-7 mx-3 my-2
                flex items-center justify-center flex-shrink-0
                text-lg cursor-pointer
            `}
            id='create-script-button'
            onClick={createScript}
        >
            <i className='icon icon-plus2' />
        </div>
    );
};

interface TabProps {
    scriptID: string
    scriptName: string
    index: number
}

const Tab: React.FC<TabProps> = ({ scriptID, scriptName, index }) => {
    const dispatch = useDispatch();
    const modified = useSelector(tabs.selectModifiedScripts).includes(scriptID);

    const allScripts = useSelector(scripts.selectAllScriptEntities);
    const script = allScripts[scriptID];
    const scriptType = script.isShared && 'shared' || script.readonly && 'readonly' || 'regular';
    const activeTabID = useSelector(tabs.selectActiveTabID);
    const active = activeTabID === scriptID;
    const collaborators = script.collaborators as string[];

    useEffect(() => {
        if (active && script.collaborative) {
            dispatch(editor.setBlocksMode(false));
        }
    }, [activeTabID]);

    let tabClass = classNames('w-48 flex-shrink-0 h-14 cursor-pointer border',
        {
            'bg-blue border-blue': active,
            'bg-gray-200 hover:bg-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800': !active, // background
            'border-gray-300 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-900': !active // border
        },
        {
            // treating tab text color separately for code readability
            'text-white dark:text-gray-300': active && !modified,
            'text-red-500':  active && modified,
            'text-red-600': !active && modified,
            'text-gray-600 hover:text-white dark:text-gray-400': !active && !modified
        },
        'flex relative');
    let closeButtonClass = classNames('flex items-center hover:text-gray-800',
        {
            'hover:bg-gray-400': !active,
            'hover:bg-gray-300': active
        });

    return (
        <div
            className={tabClass}
            key={scriptID}
            onClick={() => {
                if (activeTabID !== scriptID) {
                    dispatch(tabs.setActiveTabAndEditor(scriptID));
                }
            }}
            title={script.name}
        >
            <DropdownContextMenuCaller
                className={`flex justify-between items-center truncate p-3 w-full`}
                script={script}
                type={scriptType}
            >
                <div className='flex items-center space-x-3 truncate'>
                    { (script.isShared && !script.collaborative) && <i className='icon-copy3 align-middle' title={`Shared by ${script.creator}`} /> }
                    { script.collaborative && <i className='icon-users4 align-middle' title={`Shared with ${collaborators.join(', ')}`} /> }
                    <div className='truncate select-none align-middle'>{scriptName}</div>
                </div>
                <button
                    className={closeButtonClass}
                    onClick={(event) => {
                        dispatch(tabs.closeAndSwitchTab(scriptID));

                        userProject.closeScript(scriptID);

                        // The tab is reselected otherwise.
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                >
                    <i className={`icon-cross2 cursor-pointer`} />
                </button>
            </DropdownContextMenuCaller>
            { active && (<div className={`w-full border-b-4 border-amber absolute bottom-0`} />) }
        </div>
    );
};

const CloseAllTab = () => {
    const { t } = useTranslation();
    return (
        <div
            className={`
                w-48 flex-shrink-0 h-12 p-3 cursor-pointer
                flex items-center
                text-white bg-gray-800 border border-gray-800    
            `}
            onClick={closeAllTabs}
        >
            {t('tabs.closeAll')}
        </div>
    );
};

const MainTabGroup = () => {
    const openTabs = useSelector(tabs.selectOpenTabs);
    const visibleTabs = useSelector(tabs.selectVisibleTabs);
    const allScripts = useSelector(scripts.selectAllScriptEntities);

    return (
        <div
            className={`flex items-center truncate`}
        >
            {
                visibleTabs.map((ID: string) => allScripts[ID] &&(
                    <Tab
                        scriptID={ID}
                        scriptName={allScripts[ID].name}
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
    const theme = useSelector(appState.selectColorTheme);
    const { t } = useTranslation()

    const [showDropdown, setShowDropdown] = useState(false);
    const [referenceElement, heightLimiterStyle] = useHeightLimiter(showDropdown, "4rem")
    const popperElement = useRef(null);
    const { styles, attributes, update } = usePopper(referenceElement.current, popperElement.current, {
        modifiers: [{ name: 'offset', options: { offset: [0,5] } }]
    });

    return (<>
        <div
            ref={referenceElement}
            className={`flex justify-around items-center flex-shrink-0 
                h-12 p-3 
                ${theme==='light' ? 'text-gray-800' : 'text-gray-200'}
                ${theme==='light'
                    ? (highlight ? 'bg-gray-100' : 'bg-gray-200')
                    : (highlight ? 'bg-gray-500' : 'bg-gray-800')}
                cursor-pointer select-none
            `}
            onClick={() => {setShowDropdown(show => {
                update?.();
                return !show;
            })}}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
        >
            { openTabs.length === hiddenTabs.length ? 'All Tabs' : t('tabs.otherTabs') }
            <i className='icon icon-arrow-down2 text-lg p-2' />
        </div>
        <div
            ref={popperElement}
            style={showDropdown ? { ...styles.popper, ...heightLimiterStyle } : { display: 'none' }}
            { ...attributes.popper }
            className={`border border-black z-50 bg-white`}
        >
            {
                hiddenTabs.map((ID: string) => allScripts[ID] && (
                    <Tab
                        scriptID={ID}
                        scriptName={allScripts[ID].name}
                        key={ID}
                        index={openTabs.indexOf(ID)}
                    />
                ))
            }
            <CloseAllTab />
        </div>
    </>);
};

export const Tabs = () => {
    const dispatch = useDispatch();
    const openTabs = useSelector(tabs.selectOpenTabs);
    const truncated = useSelector(tabs.selectTabsTruncated);
    const theme = useSelector(appState.selectColorTheme);
    const embedMode = useSelector(appState.selectEmbedMode);

    const tabWidth = 120;
    const createButtonWidth = 35;
    const dropdownWidth = 95;
    const containerRef = useRef<HTMLDivElement>(null);

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
            { truncated ? <TabDropdown /> : '' }
        </div>
    );
};
