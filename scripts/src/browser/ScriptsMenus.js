import React, { useState, useEffect } from 'react';
import { Provider, useDispatch, useSelector } from "react-redux";
import { react2angular } from 'react2angular';
import { usePopper } from 'react-popper';
import * as appState from "../app/appState";
import * as scripts from "./scriptsState";
import * as tabs from "../editor/tabState";
import * as helpers from "../helpers";

export const openScript = script => {
    const userProject = helpers.getNgService('userProject');
    const rootScope = helpers.getNgRootScope();
    userProject.openScript(script.shareid);
    rootScope.$broadcast('selectScript', script.shareid);
};

export const openSharedScript = script => {
    const userProject = helpers.getNgService('userProject');
    const rootScope = helpers.getNgRootScope();
    userProject.openSharedScript(script.shareid);
    rootScope.$broadcast('selectSharedScript', script);
};

export const shareScript = script => {
    const scope = helpers.getNgMainController().scope();
    scope.shareScript(Object.assign({}, script));
};

export function generateGetBoundingClientRect(x=0, y=0) {
    return () => ({
        width: 0,
        height: 0,
        top: y,
        right: x,
        bottom: y,
        left: x,
    });
}

export class VirtualRef {
    constructor() {
        this.getBoundingClientRect = generateGetBoundingClientRect();
        this.updatePopper = null;
    }
}

const MenuItem = ({ name, icon, onClick, disabled=false, visible=true }) => {
    const [highlight, setHighlight] = useState(false);
    const dispatch = useDispatch();
    const theme = useSelector(appState.selectColorTheme);
    const cursor = disabled ? 'cursor-not-allowed' : 'cursor-pointer';

    return (
        <div
            className={`
                ${visible ? 'flex' : 'hidden'} items-center justify-start p-2 space-x-4 ${cursor} 
                ${theme==='light' ? (highlight ? 'bg-blue-200' : 'bg-white') : (highlight ? 'bg-blue-500' : 'bg-black')}
                ${theme==='light' ? 'text-black' : 'text-white'}
            `}
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
    const context = useSelector(scripts.selectDropdownMenuContext);

    // For some operations, get the most up-to-date script being kept in userProject.
    const unsavedScript = useSelector(scripts.selectUnsavedDropdownMenuScript);
    const loggedIn = useSelector(state => state.user.loggedIn);
    const openTabs = useSelector(tabs.selectOpenTabs);

    const [popperElement, setPopperElement] = useState(null);
    const { styles, attributes, update } = usePopper(dropdownMenuVirtualRef, popperElement);
    dropdownMenuVirtualRef.updatePopper = update;

    // Note: Synchronous dispatches inside a setState can conflict with components rendering.
    const handleClickAsync = event => {
        setPopperElement(ref => {
            if (!ref.contains(event.target) && event.button===0) {
                dispatch(scripts.resetDropdownMenuAsync());
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
            ref={setPopperElement}
            style={showDropdownMenu ? styles.popper : { display:'none' }}
            { ...attributes.popper }
            className={`border border-black p-2 z-50 ${theme==='light' ? 'bg-white' : 'bg-black'}`}
        >
            <div className={`flex justify-between items-center p-2 space-x-2 pb-4 border-b mb-2 ${theme==='light' ? 'text-black border-black' : 'text-white border-white'}`}>
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
                visible={!context}
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
                    scope.copyScript(unsavedScript);
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
                    scope.downloadScript(unsavedScript);
                }}
            />
            <MenuItem
                name='Print' icon='icon-printer'
                onClick={() => {
                    const exporter = helpers.getNgService('exporter');
                    exporter.print(unsavedScript);
                }}
            />
            <MenuItem
                name='Share' icon='icon-share32'
                visible={type==='regular'}
                disabled={!loggedIn}
                onClick={() => {
                    shareScript(unsavedScript);
                }}
            />
            <MenuItem
                name='Submit to Competition' icon='icon-share2'
                visible={type==='regular' && loggedIn && FLAGS.SHOW_AMAZON}
                disabled={!loggedIn}
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.submitToCompetition(unsavedScript);
                }}
            />
            <MenuItem
                name='History' icon='icon-history'
                disabled={!loggedIn || type==='readonly'}
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.openScriptHistory(unsavedScript, true);
                }}
            />
            <MenuItem
                name='Code Indicator' icon='glyphicon glyphicon-info-sign'
                onClick={() => {
                    const scope = helpers.getNgMainController().scope();
                    scope.openCodeIndicator(unsavedScript);
                }}
            />
            <MenuItem
                name='Import' icon='icon-import'
                visible={['shared','readonly'].includes(type)}
                onClick={async () => {
                    const userProject = helpers.getNgService('userProject');
                    let imported;

                    if (script.collaborative) {
                        imported = await userProject.importCollaborativeScript(Object.assign({},script));
                    } else {
                        imported = await userProject.importScript(Object.assign({},script));
                    }

                    await userProject.refreshCodeBrowser();
                    dispatch(scripts.syncToNgUserProject());

                    if (openTabs.includes(script.shareid)) {
                        openScript(imported);
                    }
                }}
            />
            <MenuItem
                name='Delete' icon='icon-bin'
                visible={type!=='readonly'}
                onClick={async () => {
                    const scope = helpers.getNgMainController().scope();
                    const userProject = helpers.getNgService('userProject');
                    if (type==='regular') {
                        await scope.deleteScript(unsavedScript);
                    } else if (type==='shared') {
                        await scope.deleteSharedScript(script);
                    }
                    await userProject.refreshCodeBrowser();
                    dispatch(scripts.syncToNgUserProject());
                }}
            />
        </div>
    );
};

export const DropdownMenuCaller = ({ script, type }) => {
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
            className='flex justify-left truncate'
        >
            <div className='truncate min-w-0'>
                <i className='icon-menu3 text-4xl px-2 align-middle' />
            </div>
        </div>
    );
};

export const DropdownContextMenuCaller = ({ script, type, children, className }) => {
    const dispatch = useDispatch();
    return (
        <div
            className={className}
            onContextMenu={event => {
                event.preventDefault();
                event.stopPropagation();
                dropdownMenuVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY);
                dropdownMenuVirtualRef.updatePopper && dropdownMenuVirtualRef.updatePopper();
                dispatch(scripts.setDropdownMenu({ script, type, context:true }));
            }}
        >
            { children }
        </div>
    );
};

const DropdownMenuContainer = props => (
    <Provider store={props.$ngRedux}>
        <SingletonDropdownMenu />
    </Provider>
);

app.component('scriptDropdownMenu', react2angular(DropdownMenuContainer, null, ['$ngRedux']));