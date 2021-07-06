import React, { useState, useEffect, LegacyRef, ChangeEvent, MouseEvent } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { usePopper } from 'react-popper';

import { Script, ScriptType } from 'common';
import { createScript } from '../ide/IDE';
import * as scripts from './scriptsState';
import * as tabs from '../ide/tabState';
import * as appState from '../app/appState';
import * as user from '../user/userState';
import * as userProject from '../app/userProject';
import { RootState } from '../reducers';

import { SearchBar, Collection, DropdownMultiSelector } from './Browser';
import { DropdownMenuCaller, generateGetBoundingClientRect, VirtualRef, shareScript, VirtualReference } from './ScriptsMenus';
import { useTranslation } from "react-i18next";

const CreateScriptButton = () => {
    return (
        <div className='flex items-center rounded-full py-1 bg-black text-white cursor-pointer' onClick={createScript}>
            <div className='align-middle rounded-full bg-white text-black p-1 ml-2 mr-3 text-sm'>
                <i className='icon icon-plus2' />
            </div>
            <div className='mr-3'>
                New script
            </div>
        </div>
    );
};

const ScriptSearchBar = () => {
    const dispatch = useDispatch();
    const searchText = useSelector(scripts.selectSearchText);
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(scripts.setSearchText(event.target.value));
    const dispatchReset = () => dispatch(scripts.setSearchText(''));
    const props = { searchText, dispatchSearch, dispatchReset };

    return <SearchBar { ...props } />;
};

const FilterItem = ({ category, value }: { category: keyof scripts.Filters, value: string }) => {
    const [highlight, setHighlight] = useState(false);
    const isUtility = value==='Clear';
    const selected = isUtility ? false : useSelector((state: RootState) => state.scripts.filters[category].includes(value));
    const dispatch = useDispatch();
    const theme = useSelector(appState.selectColorTheme);

    return (
        <div
            className={`flex justify-left items-center cursor-pointer pr-8 ${ theme==='light' ? (highlight ? 'bg-blue-200' : 'bg-white') : (highlight ? 'bg-blue-500' : 'bg-black')}`}
            onClick={() => {
                if (isUtility) {
                    dispatch(scripts.resetFilter(category));
                } else {
                    if (selected) dispatch(scripts.removeFilterItem({ category, value }));
                    else dispatch(scripts.addFilterItem({ category, value }));
                }
            }}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
        >
            <div className='w-8'>
                <i className={`glyphicon glyphicon-ok ${selected ? 'block' : 'hidden'}`} />
            </div>
            <div className='select-none'>
                {value}
            </div>
        </div>
    );
};

const SortOptionsItem = ({ value }: { value: scripts.SortByAttribute | 'Clear'}) => {
    const [highlight, setHighlight] = useState(false);
    const isUtility = value==='Clear';
    const selected = isUtility ? false : useSelector(scripts.selectSortByAttribute)===value;
    const ascending = useSelector(scripts.selectSortByAscending);
    const dispatch = useDispatch();
    const theme = useSelector(appState.selectColorTheme);

    return (
        <div
            className={`flex justify-left items-center cursor-pointer pr-8 ${ theme==='light' ? (highlight ? 'bg-blue-200' : 'bg-white') : (highlight ? 'bg-blue-500' : 'bg-black')}`}
            onClick={() => {
                if (isUtility) {
                    dispatch(scripts.resetSorter());
                } else {
                    dispatch(scripts.setSorter(value));
                }
            }}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
        >
            <div className='w-8'>
                <i className={`icon ${ascending ? 'icon-arrow-up' : 'icon-arrow-down'} ${selected ? 'block' : 'hidden'}`} />
            </div>
            <div className='select-none'>
                {value}
            </div>
        </div>
    );
};

const Filters = () => {
    const owners = useSelector(scripts.selectAllScriptOwners);
    const numOwnersSelected = useSelector(scripts.selectNumOwnersSelected);
    const numTypesSelected = useSelector(scripts.selectNumTypesSelected);

    return (
        <div className='p-3'>
            <div className='pb-2 text-lg'>FILTER</div>
            <div className='flex justify-between'>
                <DropdownMultiSelector
                    title='Owner'
                    category='owners'
                    items={owners}
                    numSelected={numOwnersSelected}
                    position='left'
                    FilterItem={FilterItem}
                />
                <DropdownMultiSelector
                    title='File Type'
                    category='types'
                    items={['Python','JavaScript']}
                    numSelected={numTypesSelected}
                    position='center'
                    FilterItem={FilterItem}
                />
                <DropdownMultiSelector
                    title='Sort By'
                    category='sortBy'
                    items={['Date','A-Z']}
                    position='right'
                    FilterItem={SortOptionsItem}
                />
            </div>
        </div>
    )
};

const ShowDeletedScripts = () => {
    const dispatch = useDispatch();
    return (
        <div className='flex items-center'>
            <div className='pr-2'>
                <input
                    type="checkbox"
                    style={{margin:0}}
                    onClick={(event: MouseEvent) => {
                        const elem = event.target as HTMLInputElement;
                        dispatch(scripts.setShowDeleted(elem.checked));
                    }}
                />
            </div>
            <div className='pr-1'>
                Show deleted
            </div>
        </div>
    );
};

const PillButton: React.FC<{ onClick: Function }> = ({ onClick, children }) => {
    const [highlight, setHighlight] = useState(false);
    const theme = useSelector(appState.selectColorTheme);
    let bgColor;
    if (highlight) {
        bgColor = theme==='light' ? 'bg-blue-100' : 'bg-blue-500';
    } else {
        bgColor = theme==='light' ? 'bg-white' : 'bg-gray-900';
    }

    return (
        <div
            className={`flex items-center space-x-2 border border-gray-800 rounded-full px-4 py-1 ${bgColor}`}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClick?.();
            }}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
        >
            { children }
        </div>
    );
};

const ShareButton = ({ script }: { script: Script }) => (
    <PillButton onClick={() => shareScript(script)}>
        <i className='icon-share32' />
        <div>Share</div>
    </PillButton>
);

const RestoreButton = ({ script }: { script: Script }) => {
    return (
        <PillButton onClick={() => userProject.restoreScript(Object.assign({}, script))}>
            <i className='icon-rotate-cw2'/>
            <div>Restore</div>
        </PillButton>
    );
};

const sharedInfoPanelVirtualRef = new VirtualRef() as VirtualReference;

const SharedScriptInfoItem = ({ title, body }: { title: string, body: string }) => {
    const theme = useSelector(appState.selectColorTheme);

    return (
        <div className={`px-4 py-3 ${!!body ? 'block' : 'hidden'}`}>
            <div className={`font-semibold ${theme==='light' ? 'text-gray-600' : 'text-gray-500'}`}>{title}</div>
            <div className='break-words'>{body}</div>
        </div>
    );
}

const SingletonSharedScriptInfo = () => {
    const theme = useSelector(appState.selectColorTheme);
    const dispatch = useDispatch();
    const showSharedScriptInfo = useSelector(scripts.selectShowSharedScriptInfo);
    const script = useSelector(scripts.selectSharedInfoScript);

    const [popperElement, setPopperElement] = useState<HTMLDivElement|null>(null);
    const { styles, attributes, update } = usePopper(sharedInfoPanelVirtualRef, popperElement);
    sharedInfoPanelVirtualRef.updatePopper = update;

    // Note: Synchronous dispatches inside a setState can conflict with components rendering.
    const handleClickAsync = (event: Event & { target: HTMLElement }) => {
        setPopperElement(ref => {
            if (!ref?.contains(event.target)) {
                dispatch(scripts.resetSharedScriptInfoAsync());
            }
            return ref;
        });
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickAsync);
        return () => document.removeEventListener('mousedown', handleClickAsync);
    }, []);

    return (
        <div
            ref={setPopperElement as LegacyRef<HTMLDivElement>}
            style={showSharedScriptInfo ? styles.popper : { display:'none' }}
            { ...attributes.popper }
            className={`border border-black p-2 z-50 ${theme==='light' ? 'bg-white' : 'bg-black'}`}
        >
            <i
                className={`icon-cross2 absolute top-0 right-0 p-4 align-middle cursor-pointer ${theme==='light' ? 'text-black' : 'text-gray-200'}`}
                onClick={() => {
                    dispatch(scripts.resetSharedScriptInfo());
                }}
            />
            {
                script && (<>
                    <SharedScriptInfoItem
                        title={script.name}
                        body={
                            script.description?.length
                                ? script.description
                                : 'This script has no description.'
                        }
                    />
                    <SharedScriptInfoItem
                        title='Original Author'
                        body={script.username}
                    />
                    <SharedScriptInfoItem
                        title='Collaborators'
                        body={script.collaborative ? script.collaborators.join(', ') : ""}
                    />
                    <SharedScriptInfoItem
                        title='License Information'
                        body={script.licenseInfo}
                    />
                    <SharedScriptInfoItem
                        title='Last Modified'
                        body={script.modified as string}
                    />
                    <SharedScriptInfoItem
                        title='View-Only Script Link'
                        body={`${SITE_BASE_URI}?sharing=${script.shareid}`}
                    />
                </>)
            }
        </div>
    );
};

const SharedScriptInfoCaller = ({ script }: { script: Script }) => {
    const dispatch = useDispatch();

    return (
        <div
            onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                sharedInfoPanelVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY);
                sharedInfoPanelVirtualRef.updatePopper?.();
                dispatch(scripts.setSharedScriptInfo({ script }));
            }}
        >
            <i className='icon-info text-3xl align-middle' />
        </div>
    );
};

interface ScriptProps {
    script: Script
    bgTint: boolean
    type: ScriptType
}

const Script: React.FC<ScriptProps> = ({ script, bgTint, type }) => {
    const dispatch = useDispatch();
    const [highlight, setHighlight] = useState(false);
    const theme = useSelector(appState.selectColorTheme);
    const open = useSelector(tabs.selectOpenTabs).includes(script.shareid);
    const active = useSelector(tabs.selectActiveTabID) === script.shareid;
    const modified = useSelector(tabs.selectModifiedScripts).includes(script.shareid);
    const tabIndicator = (open||active) ? (active ? (modified ? 'border-red-600' : 'border-green-400') : (modified ? 'border-red-400' : 'border-green-300') + ' opacity-80') : 'opacity-0';
    const loggedIn = useSelector(user.selectLoggedIn);

    // Note: Circumvents the issue with ShareButton where it did not reference unsaved scripts opened in editor tabs.

    let bgColor;
    if (highlight) {
        bgColor = theme==='light' ? 'bg-blue-200' : 'bg-blue-500';
    } else {
        if (theme==='light') {
            bgColor = bgTint ? 'bg-white' : 'bg-gray-300';
        } else {
            bgColor = bgTint ? 'bg-gray-900' : 'bg-gray-800';
        }
    }
    const borderColor = theme==='light' ? 'border-gray-500' : 'border-gray-700';

    const shared = script.imported || script.isShared;
    const collaborators = script.collaborators as string[];

    return (
        <div
            className={`flex flex-row justify-start ${bgColor} border-t border-b border-r ${borderColor} cursor-pointer`}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
            onClick={() => {
                if (type === 'regular') {
                    dispatch(tabs.setActiveTabAndEditor(script.shareid));
                } else if (type === 'shared') {
                    dispatch(tabs.setActiveTabAndEditor(script.shareid));
                }
            }}
        >
            <div className={`h-auto border-l-4 ${tabIndicator}`} />
            <div
                className={`flex flex-grow truncate p-3`}
            >
                <div className='h-12 flex flex-grow items-center truncate justify-between'>
                    <div className='flex justify-start items-center truncate font-medium space-x-2'>
                        <div className='truncate'>
                            {script.name}
                        </div>
                        <div className='pr-4 space-x-2'>
                            {
                                (shared && !script.collaborative) && (<i className='icon-copy3 align-middle' title={`Shared by ${script.creator}`} />)
                            }
                            {
                                script.collaborative && (<i className='icon-users4 align-middle' title={`Shared with ${collaborators.join(', ')}`} />)
                            }
                        </div>
                    </div>
                    <div className={`${type==='regular' ? 'flex' : 'hidden'} flex-column items-center space-x-4`}>
                        { loggedIn && (<ShareButton script={script} />) }
                        <DropdownMenuCaller script={script} type='regular' />
                    </div>
                    <div className={`${type==='shared' ? 'flex' : 'hidden'} flex-column items-center space-x-4`}>
                        <SharedScriptInfoCaller script={script} />
                        <DropdownMenuCaller script={script} type='shared' />
                    </div>
                    <div className={`${type==='deleted' ? 'flex' : 'hidden'} flex-column items-center space-x-4`}>
                        <RestoreButton script={script} />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface WindowedScriptCollectionProps {
    title: string
    entities: scripts.Scripts
    scriptIDs: string[]
    type: ScriptType
    visible?: boolean
    initExpanded?: boolean
}
const WindowedScriptCollection = ({ title, entities, scriptIDs, type, visible=true, initExpanded=true }: WindowedScriptCollectionProps) => (
    <Collection
        title={title}
        visible={visible}
        initExpanded={initExpanded}
    >
        <AutoSizer>
            {({ height, width }) => (
                <List
                    height={height}
                    width={width}
                    itemCount={scriptIDs.length}
                    itemSize={45}
                >
                    {({ index, style }) => {
                        const ID = scriptIDs[index];
                        return (
                            <div style={style}>
                                <Script key={ID} script={entities[ID]} bgTint={index%2===0} type={type} />
                            </div>
                        );
                    }}
                </List>
            )}
        </AutoSizer>
    </Collection>
);

const RegularScriptCollection = () => {
    const entities = useSelector(scripts.selectFilteredActiveScripts);
    const scriptIDs = useSelector(scripts.selectFilteredActiveScriptIDs);
    const numScripts = useSelector(scripts.selectActiveScriptIDs).length;
    const { t } = useTranslation()
    const numFilteredScripts = scriptIDs.length;
    const filtered = numFilteredScripts !== numScripts;
    const type: ScriptType = 'regular';
    const title = `${t('scriptBrowser.myScripts').toLocaleUpperCase()} (${filtered ? numFilteredScripts+'/' : ''}${numScripts})`;
    const initExpanded = !useSelector(scripts.selectFeatureSharedScript);
    const props = { title, entities, scriptIDs, type, initExpanded };
    return <WindowedScriptCollection { ...props } />;
};

const SharedScriptCollection = () => {
    const entities = useSelector(scripts.selectFilteredSharedScripts);
    const scriptIDs = useSelector(scripts.selectFilteredSharedScriptIDs);
    const numScripts = Object.keys(useSelector(scripts.selectSharedScripts)).length;
    const numFilteredScripts = scriptIDs.length;
    const filtered = numFilteredScripts !== numScripts;
    const title = `SHARED SCRIPTS (${filtered ? numFilteredScripts+'/' : ''}${numScripts})`;
    const type: ScriptType = 'shared'
    const initExpanded = useSelector(scripts.selectFeatureSharedScript);
    const props = { title, entities, scriptIDs, type, initExpanded };
    return <WindowedScriptCollection { ...props } />;
};

const DeletedScriptCollection = () => {
    const entities = useSelector(scripts.selectFilteredDeletedScripts);
    const scriptIDs = useSelector(scripts.selectFilteredDeletedScriptIDs);
    const numScripts = useSelector(scripts.selectDeletedScriptIDs).length;
    const numFilteredScripts = scriptIDs.length;
    const filtered = numFilteredScripts !== numScripts;
    const title = `DELETED SCRIPTS (${filtered ? numFilteredScripts+'/' : ''}${numScripts})`;
    const type: ScriptType = 'deleted';
    const visible = useSelector(scripts.selectShowDeleted);
    const initExpanded = false;
    const props = { title, entities, scriptIDs, type, visible, initExpanded };
    return <WindowedScriptCollection { ...props } />;
};

export const ScriptBrowser = () => {
    return (
        <>
            <ScriptSearchBar />
            <Filters />

            <div className='flex justify-between p-3 mb-2'>
                <ShowDeletedScripts />
                <CreateScriptButton />
            </div>

            <div className='h-full flex flex-col justify-start'>
                <RegularScriptCollection />
                <SharedScriptCollection />
                <DeletedScriptCollection />
            </div>

            <SingletonSharedScriptInfo />
        </>
    );
};
