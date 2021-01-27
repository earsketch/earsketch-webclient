import React, { useState, useEffect } from 'react';
import { hot } from 'react-hot-loader/root';
import { react2angular } from 'react2angular';
import { Provider, useSelector, useDispatch } from 'react-redux';

import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { usePopper } from 'react-popper';

import * as helpers from 'helpers';
import * as scripts from './scriptsState';
import * as tabs from '../editor/tabState';
import * as appState from '../app/appState';

import { TitleBar, BrowserTabs, SearchBar, Collection, DropdownMultiSelector } from './Browser';

function generateGetBoundingClientRect(x=0, y=0) {
    return () => ({
        width: 0,
        height: 0,
        top: y,
        right: x,
        bottom: y,
        left: x,
    });
}

class VirtualRef {
    constructor() {
        this.getBoundingClientRect = generateGetBoundingClientRect();
        this.updatePopper = null;
    }
}

const openScript = script => {
    const userProject = helpers.getNgService('userProject');
    const rootScope = helpers.getNgRootScope();
    userProject.openScript(script.shareid);
    rootScope.$broadcast('selectScript', script.shareid);
};

const openSharedScript = script => {
    const userProject = helpers.getNgService('userProject');
    const rootScope = helpers.getNgRootScope();
    userProject.openSharedScript(script.shareid);
    rootScope.$broadcast('selectSharedScript', script);
};

const shareScript = script => {
    const scope = helpers.getNgMainController().scope();
    scope.shareScript(Object.assign({}, script));
};

const CreateScriptButton = () => {
    const dispatch = useDispatch();
    const ideScope = helpers.getNgController('ideController').scope();
    return (
        <div
            className='flex items-center rounded-full py-1 bg-black text-white cursor-pointer'
            onClick={() => {
                ideScope.createScript();
            }}
        >
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
    const dispatchSearch = event => dispatch(scripts.setSearchText(event.target.value));
    const dispatchReset = () => dispatch(scripts.setSearchText(''));
    const props = { searchText, dispatchSearch, dispatchReset };

    return <SearchBar { ...props } />;
};

const FilterItem = ({ category, value }) => {
    const [highlight, setHighlight] = useState(false);
    const isUtility = value==='Clear';
    const selected = isUtility ? false : useSelector(state => state.scripts.filters[category].includes(value));
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

const SortOptionsItem = ({ value }) => {
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
                    onClick={event => dispatch(scripts.setShowDeleted(event.target.checked))}
                />
            </div>
            <div className='pr-1'>
                Show deleted
            </div>
        </div>
    );
};

const PillButton = ({ onClick, children }) => {
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
                onClick && onClick();
            }}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
        >
            { children }
        </div>
    );
};

const ShareButton = ({ script }) => (
    <PillButton onClick={() => {
        shareScript(script);
    }}>
        <i className='icon-share32' />
        <div>Share</div>
    </PillButton>
);

const RestoreButton = ({ script }) => {
    const dispatch = useDispatch();
    return (
        <PillButton onClick={async () => {
            const userProject = helpers.getNgService('userProject');
            await userProject.restoreScript(Object.assign({}, script));
            dispatch(scripts.syncToNgUserProject());
        }}>
            <i className='icon-rotate-cw2'/>
            <div>Restore</div>
        </PillButton>
    );
};

const MenuItem = ({ name, icon, onClick, disabled=false, visible=true }) => {
    const [highlight, setHighlight] = useState(false);
    const dispatch = useDispatch();
    const theme = useSelector(appState.selectColorTheme);
    const cursor = disabled ? 'cursor-not-allowed' : 'cursor-pointer';

    return (
        <div
            className={`${visible ? 'flex' : 'hidden'} items-center justify-start p-2 space-x-4 ${cursor} ${theme==='light' ? (highlight ? 'bg-blue-200' : 'bg-white') : (highlight ? 'bg-blue-500' : 'bg-black')}`}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
            onClick={() => {
                if (disabled) return null;
                onClick();
                dispatch(scripts.resetDropdownMenu());
            }}
        >
            <div className='flex justify-center items-center w-6'>
                <i className={`${icon} align-middle`} />
            </div>
            <div className={`${disabled ? 'text-gray-500' : ''}`}>{name}</div>
        </div>
    );
};

const dropdownMenuVirtualRef = new VirtualRef();

const SingletonDropdownMenu = () => {
    const theme = useSelector(appState.selectColorTheme);
    const dispatch = useDispatch();
    const showDropdownMenu = useSelector(scripts.selectShowDropdownMenu);
    const script = useSelector(scripts.selectDropdownMenuScript);
    const type = useSelector(scripts.selectDropdownMenuType);
    const loggedIn = useSelector(state => state.user.loggedIn);
    const openTabs = useSelector(tabs.selectOpenTabs);

    const [popperElement, setPopperElement] = useState(null);
    const { styles, attributes, update } = usePopper(dropdownMenuVirtualRef, popperElement);
    dropdownMenuVirtualRef.updatePopper = update;

    // Note: Synchronous dispatches inside a setState can conflict with components rendering.
    const handleClickAsync = event => {
        setPopperElement(ref => {
            if (!ref.contains(event.target)) {
                dispatch(scripts.resetDropdownMenuAsync());
            }
            return ref;
        });
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickAsync);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div
            ref={setPopperElement}
            style={showDropdownMenu ? styles.popper : { display:'none' }}
            { ...attributes.popper }
            className={`border border-black p-2 z-50 ${theme==='light' ? 'bg-white' : 'bg-black'}`}
        >
            <div className='flex justify-between items-center p-2 space-x-2 pb-4 border-b border-black mb-2'>
                <div className='truncate'>
                    {script && script.name}
                </div>
                <i
                    className={`icon-cross2 pr-1 align-middle cursor-pointer ${theme==='light' ? 'text-gray-700' : 'text-gray-500'}`}
                    onClick={() => {
                        dispatch(scripts.resetDropdownMenu());
                    }}
                />
            </div>
            <MenuItem
                name='Open' icon='icon-file-empty'
                onClick={() => {
                    if (type==='regular') {
                        openScript(script);
                    } else if (type==='shared') {
                        openSharedScript(script);
                    }
                }}
            />
            <MenuItem
                name='Create Copy' icon='icon-copy'
                visible={type==='regular'}
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.copyScript(script);
                }}
            />
            <MenuItem
                name='Rename' icon='icon-pencil2'
                visible={type==='regular'}
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.renameScript(script);
                }}
            />
            <MenuItem
                name='Download' icon='icon-cloud-download'
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.downloadScript(script);
                }}
            />
            <MenuItem
                name='Print' icon='icon-printer'
                onClick={() => {
                    const exporter = helpers.getNgService('exporter');
                    exporter.print(script);
                }}
            />
            <MenuItem
                name='Share' icon='icon-share32'
                visible={type==='regular'}
                onClick={() => {
                    shareScript(script);
                }}
            />
            <MenuItem
                name='Submit to Competition' icon='icon-share2'
                visible={type==='regular' && loggedIn && FLAGS.SHOW_AMAZON}
                disabled={!loggedIn}
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.submitToCompetition(script);
                }}
            />
            <MenuItem
                name='History' icon='icon-history'
                disabled={!loggedIn}
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.openScriptHistory(script, true);
                }}
            />
            <MenuItem
                name='Code Indicator' icon='glyphicon glyphicon-info-sign'
                disabled={!loggedIn}
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.openCodeIndicator(script);
                }}
            />
            <MenuItem
                name='Import' icon='icon-import'
                visible={type==='shared'}
                onClick={async () => {
                    const userProject = helpers.getNgService('userProject');
                    const imported = await userProject.importScript(Object.assign({},script));
                    await userProject.refreshCodeBrowser();
                    dispatch(scripts.syncToNgUserProject());
                    
                    if (openTabs.includes(script.shareid)) {
                        openScript(imported);
                    }
                }}
            />
            <MenuItem
                name='Delete' icon='icon-bin'
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    if (type==='regular') {
                        scope.deleteScript(script);
                    } else if (type==='shared') {
                        scope.deleteSharedScript(script);
                    }
                }}
            />
        </div>
    );
};

const DropdownMenuCaller = ({ script, type }) => {
    const dispatch = useDispatch();

    return (
        <div
            onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                dropdownMenuVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY);
                dropdownMenuVirtualRef.updatePopper && dropdownMenuVirtualRef.updatePopper();
                dispatch(scripts.setDropdownMenu({ script, type }));
            }}
        >
            <div className='flex justify-left truncate'>
                <div className='truncate min-w-0'>
                    <i className='icon-menu3 text-4xl px-2 align-middle' />
                </div>
            </div>
        </div>
    );
};

const sharedInfoPanelVirtualRef = new VirtualRef();

const SharedScriptInfoItem = ({ title, body }) => {
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

    const [popperElement, setPopperElement] = useState(null);
    const { styles, attributes, update } = usePopper(sharedInfoPanelVirtualRef, popperElement);
    sharedInfoPanelVirtualRef.updatePopper = update;

    // Note: Synchronous dispatches inside a setState can conflict with components rendering.
    const handleClickAsync = event => {
        setPopperElement(ref => {
            if (!ref.contains(event.target)) {
                dispatch(scripts.resetSharedScriptInfoAsync());
            }
            return ref;
        });
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickAsync);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div
            ref={setPopperElement}
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
                            script.description && script.description.length
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
                        body={script.collaborative ? script.collaborators.join(', ') : null}
                    />
                    <SharedScriptInfoItem
                        title='License Information'
                        body={script.licenseInfo}
                    />
                    <SharedScriptInfoItem
                        title='Last Modified'
                        body={script.modified}
                    />
                    <SharedScriptInfoItem
                        title='View-Only Script Link'
                        body={`${SITE_BASE_URI}#?sharing=${script.shareid}`}
                    />
                </>)
            }
        </div>
    );
};

const SharedScriptInfoCaller = ({ script }) => {
    const dispatch = useDispatch();

    return (
        <div
            onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                sharedInfoPanelVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY);
                sharedInfoPanelVirtualRef.updatePopper && sharedInfoPanelVirtualRef.updatePopper();
                dispatch(scripts.setSharedScriptInfo({ script }));
            }}
        >
            <i className='icon-info text-3xl align-middle' />
        </div>
    );
};

const Script = ({ script, bgTint, type }) => {
    const [highlight, setHighlight] = useState(false);
    const theme = useSelector(appState.selectColorTheme);
    const open = useSelector(tabs.selectOpenTabs).includes(script.shareid);
    const active = useSelector(tabs.selectActiveTabID) === script.shareid;
    const tabIndicator = (open||active) ? (active ? 'border-green-400' : 'opacity-50 border-green-300') : 'opacity-0';

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

    return (
        <div
            className={`flex flex-row justify-start ${bgColor} border-t border-b border-r ${borderColor} cursor-pointer`}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
            onClick={() => {
                if (type === 'regular') {
                    openScript(script);
                } else if (type === 'shared') {
                    openSharedScript(script);
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
                                shared && (<i className='icon-copy3 align-middle' title={`Shared by ${script.creator}`} />)
                            }
                            {
                                script.collaborative && (<i className='icon-users4 align-middle' title={`Shared with ${script.collaborators.join(', ')}`} />)
                            }
                        </div>
                    </div>
                    <div className={`${type==='regular' ? 'flex' : 'hidden'} flex-column items-center space-x-4`}>
                        <ShareButton script={script} />
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

const WindowedScriptCollection = ({ title, entities, scriptIDs, type, visible=true, initExpanded=true }) => (
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
    const entities = useSelector(scripts.selectFilteredActiveScriptEntities);
    const scriptIDs = useSelector(scripts.selectFilteredActiveScriptIDs);
    const numScripts = useSelector(scripts.selectActiveScriptIDs).length;
    const numFilteredScripts = scriptIDs.length;
    const filtered = numFilteredScripts !== numScripts;
    const type = 'regular';
    const title = `MY SCRIPTS (${filtered ? numFilteredScripts+'/' : ''}${numScripts})`;
    const initExpanded = !useSelector(scripts.selectFeatureSharedScript);
    const props = { title, entities, scriptIDs, type, initExpanded };
    return <WindowedScriptCollection { ...props } />;
};

const SharedScriptCollection = () => {
    const entities = useSelector(scripts.selectFilteredSharedScriptEntities);
    const scriptIDs = useSelector(scripts.selectFilteredSharedScriptIDs);
    const numScripts = useSelector(scripts.selectSharedScriptIDs).length;
    const numFilteredScripts = scriptIDs.length;
    const filtered = numFilteredScripts !== numScripts;
    const title = `SHARED SCRIPTS (${filtered ? numFilteredScripts+'/' : ''}${numScripts})`;
    const type = 'shared'
    const initExpanded = useSelector(scripts.selectFeatureSharedScript);
    const props = { title, entities, scriptIDs, type, initExpanded };
    return <WindowedScriptCollection { ...props } />;
};

const DeletedScriptCollection = () => {
    const entities = useSelector(scripts.selectFilteredDeletedScriptEntities);
    const scriptIDs = useSelector(scripts.selectFilteredDeletedScriptIDs);
    const numScripts = useSelector(scripts.selectDeletedScriptIDs).length;
    const numFilteredScripts = scriptIDs.length;
    const filtered = numFilteredScripts !== numScripts;
    const title = `DELETED SCRIPTS (${filtered ? numFilteredScripts+'/' : ''}${numScripts})`;
    const type = 'deleted';
    const visible = useSelector(scripts.selectShowDeleted);
    const initExpanded = false;
    const props = { title, entities, scriptIDs, type, visible, initExpanded };
    return <WindowedScriptCollection { ...props } />;
};

const ScriptBrowser = () => {
    const theme = useSelector(appState.selectColorTheme);

    return (
        <div
            className={`flex flex-col absolute h-full w-full font-sans ${theme==='light' ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
            style={{marginTop:-12}}
        >
            <TitleBar />
            <BrowserTabs selection='SCRIPTS' />

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

            <SingletonDropdownMenu />
            <SingletonSharedScriptInfo />
        </div>
    );
};

const HotScriptBrowser = hot(props => {
    return (
        <Provider store={props.$ngRedux}>
            <ScriptBrowser />
        </Provider>
    );
});

app.component('scriptBrowser', react2angular(HotScriptBrowser, null, ['$ngRedux']));