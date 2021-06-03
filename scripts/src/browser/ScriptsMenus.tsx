import React, { useState, useEffect, LegacyRef } from 'react';
import { Store } from "redux";
import { Provider, useDispatch, useSelector } from "react-redux";
import { react2angular } from 'react2angular';
import { usePopper } from 'react-popper';
import PopperJS from '@popperjs/core';
import * as appState from "../app/appState";
import * as exporter from "../app/exporter";
import * as user from '../user/userState';
import * as scripts from "./scriptsState";
import * as tabs from "../editor/tabState";
import * as helpers from "../helpers";
import { ScriptEntity, ScriptType } from 'common';
import * as userProject from '../app/userProject';

export const openScript = (script: ScriptEntity) => {
    const rootScope = helpers.getNgRootScope();
    userProject.openScript(script.shareid);
    rootScope.$broadcast('selectScript', script.shareid);
};

export const openSharedScript = (script: ScriptEntity) => {
    userProject.openSharedScript(script.shareid);
};

export const shareScript = (script: ScriptEntity) => {
    const scope = helpers.getNgMainController().scope();
    scope.shareScript(Object.assign({}, script));
};

export function generateGetBoundingClientRect(x=0, y=0) {
    return (): ClientRect => ({
        width: 0,
        height: 0,
        top: y,
        right: x,
        bottom: y,
        left: x,
    });
}

export interface VirtualReference extends PopperJS.VirtualElement {
    updatePopper: PopperJS.Instance['update'] | null
}

// TODO: Redundant... Figure out how to implement VirtualReference interface without declaring an unknown-type property.
export class VirtualRef {
    getBoundingClientRect: unknown
    updatePopper: PopperJS.Instance['update'] | null

    constructor() {
        this.getBoundingClientRect = generateGetBoundingClientRect();
        this.updatePopper = null;
    }
}

interface MenuItemProps {
    name: string
    icon: string
    onClick: Function
    disabled?: boolean
    visible?: boolean
}

const MenuItem = ({ name, icon, onClick, disabled=false, visible=true }: MenuItemProps) => {
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

const dropdownMenuVirtualRef = new VirtualRef() as VirtualReference;

const SingletonDropdownMenu = () => {
    const theme = useSelector(appState.selectColorTheme);
    const dispatch = useDispatch();
    const showDropdownMenu = useSelector(scripts.selectShowDropdownMenu);
    const script = useSelector(scripts.selectDropdownMenuScript);
    const type = useSelector(scripts.selectDropdownMenuType);
    const context = useSelector(scripts.selectDropdownMenuContext);

    // For some operations, get the most up-to-date script being kept in userProject.
    const unsavedScript = useSelector(scripts.selectUnsavedDropdownMenuScript);
    const loggedIn = useSelector(user.selectLoggedIn);
    const openTabs = useSelector(tabs.selectOpenTabs);

    const [popperElement, setPopperElement] = useState<HTMLDivElement|null>(null);
    const { styles, attributes, update } = usePopper(dropdownMenuVirtualRef, popperElement);
    dropdownMenuVirtualRef.updatePopper = update;

    // Note: Synchronous dispatches inside a setState can conflict with components rendering.
    const handleClickAsync: EventListener = (event: Event & { target: HTMLElement, button: number }) => {
        setPopperElement(ref => {
            if (!ref?.contains(event.target) && event.button===0) {
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
            ref={setPopperElement as LegacyRef<HTMLDivElement>}
            style={showDropdownMenu ? styles.popper : { display:'none' }}
            { ...attributes.popper }
            className={`border border-black p-2 z-50 ${theme==='light' ? 'bg-white' : 'bg-black'}`}
        >
            <div className={`flex justify-between items-center p-2 space-x-2 pb-4 border-b mb-2 ${theme==='light' ? 'text-black border-black' : 'text-white border-white'}`}>
                <div className='truncate'>
                    {script?.name}
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
                    if (!script) return;

                    if (type==='regular') {
                        dispatch(tabs.setActiveTabAndEditor(script.shareid));
                        script && openScript(script);
                    } else if (type==='shared') {
                        dispatch(tabs.setActiveTabAndEditor(script.shareid));
                        script && openSharedScript(script);
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
                    exporter.print(unsavedScript!);
                }}
            />
            <MenuItem
                name='Share' icon='icon-share32'
                visible={type==='regular'}
                disabled={!loggedIn}
                onClick={() => {
                    shareScript(unsavedScript!);
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
                    script && scope.openScriptHistory(unsavedScript, !script.isShared);
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
                visible={['shared','readonly'].includes(type as string)}
                onClick={async () => {
                    let imported;

                    if (script?.collaborative) {
                        imported = await userProject.importCollaborativeScript(Object.assign({},script));
                    } else {
                        imported = await userProject.importScript(Object.assign({},script));
                    }

                    await userProject.refreshCodeBrowser();
                    dispatch(scripts.syncToNgUserProject());

                    if (script && openTabs.includes(script.shareid) && !script.collaborative) {
                        dispatch(tabs.closeTab(script.shareid));
                        dispatch(tabs.setActiveTabAndEditor(imported.shareid));
                        openScript(imported);
                    }
                }}
            />
            <MenuItem
                name='Delete' icon='icon-bin'
                visible={type!=='readonly'}
                onClick={async () => {
                    const scope = helpers.getNgMainController().scope();
                    if (type==='regular') {
                        await scope.deleteScript(unsavedScript);
                    } else if (type==='shared') {
                        await scope.deleteSharedScript(script);
                    }
                    await userProject?.refreshCodeBrowser();
                    dispatch(scripts.syncToNgUserProject());
                }}
            />
        </div>
    );
};

export const DropdownMenuCaller = ({ script, type }: { script: ScriptEntity, type: ScriptType }) => {
    const dispatch = useDispatch();

    return (
        <div
            onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                dropdownMenuVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY);
                dropdownMenuVirtualRef.updatePopper?.();
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

interface DropdownContextMenuCallerType {
    script: ScriptEntity
    type: ScriptType
    className: string
}

export const DropdownContextMenuCaller: React.FC<DropdownContextMenuCallerType> = ({ script, type, children, className }) => {
    const dispatch = useDispatch();
    return (
        <div
            className={className}
            onContextMenu={event => {
                event.preventDefault();
                event.stopPropagation();
                dropdownMenuVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY);
                dropdownMenuVirtualRef.updatePopper?.();
                dispatch(scripts.setDropdownMenu({ script, type, context:true }));
            }}
        >
            { children }
        </div>
    );
};

const DropdownMenuContainer = (props: { $ngRedux: Store }) => (
    <Provider store={props.$ngRedux}>
        <SingletonDropdownMenu />
    </Provider>
);

app.component('scriptDropdownMenu', react2angular(DropdownMenuContainer, null, ['$ngRedux']));