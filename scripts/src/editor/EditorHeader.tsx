import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { shareScript } from '../app/App';
import * as appState from '../app/appState';
import * as user from '../user/userState';
import * as editor from './Editor';
import * as editorState from './editorState';
import { compileCode } from '../app/IDE';
import * as tabs from './tabState';
import * as scripts from '../browser/scriptsState';
import * as userProject from '../app/userProject';

const UndoRedoButtons = () => {
    const theme = useSelector(appState.selectColorTheme);

    const enabled = `cursor-pointer ${theme==='light' ? 'text-black' : 'text-white'}`;
    const disabled = `cursor-not-allowed ${theme==='light' ? 'text-gray-300' : 'text-gray-700'}`;

    const [hasUndo, setHasUndo] = useState(false);
    const [hasRedo, setHasRedo] = useState(false);

    const onChange = () => {
        // ACE hasUndo/hasRedo API are not ready synchronously after editor onChange.
        setTimeout(() => {
            setHasUndo(editor.checkUndo());
            setHasRedo(editor.checkRedo());
        });
    };

    useEffect(() => {
        editor.callbacks.onChange = onChange
        return () => { editor.callbacks.onChange = null };
    });

    return (<>
        <i
            className={`icon-spinner11 ${hasUndo ? enabled : disabled}`}
            style={{ transform: 'scaleX(-1)' }}
            onClick={() => editor.undo()}
        />
        <i
            className={`icon-spinner11 ${hasRedo ? enabled : disabled}`}
            onClick={() => editor.redo()}
        />
    </>);
};

export const EditorHeader = () => {
    const dispatch = useDispatch();
    const openTabs = useSelector(tabs.selectOpenTabs);
    const activeTab = useSelector(tabs.selectActiveTabID) as string;
    const allScripts = useSelector(scripts.selectAllScriptEntities);
    const blocksMode = useSelector(editorState.selectBlocksMode);
    const embedMode = useSelector(appState.selectEmbedMode);
    const theme = useSelector(appState.selectColorTheme);
    const loggedIn = useSelector(user.selectLoggedIn);
    const script = allScripts[activeTab];
    const scriptType = (!script || script.readonly) && 'readonly' || script.isShared && 'shared' || 'regular';

    return (
        <div
            className={`
                ${embedMode ? 'hidden' : 'flex'}
                justify-between items-center
                font-sans py-3 px-6 text-2xl
                ${theme==='light' ? 'text-black bg-white' : 'text-white bg-black'}
            `}
        >
            <div className={`font-semibold truncate`}>
                CODE EDITOR
            </div>
            <div className={`${openTabs.length ? 'flex' : 'hidden'} items-center space-x-8`}>
                <UndoRedoButtons />

                {
                    !(script?.collaborative) && (
                        <div
                            className={'flex items-center cursor-pointer truncate'}
                            onClick={() => {
                                dispatch(editorState.toggleBlocksMode());
                            }}
                        >
                            <div
                                className={`
                                    flex w-10 h-6 p-1 
                                    rounded-full select-none mr-2 
                                    ${theme==='light' ? 'bg-black' : 'bg-gray-700'}
                                    ${blocksMode ? 'justify-end' : 'justify-start'}
                                `}>
                                <div className='w-4 h-4 bg-white rounded-full'>&nbsp;</div>
                            </div>
                            BLOCKS MODE
                        </div>
                    )
                }
                {
                    (loggedIn && scriptType !== 'readonly' && !(scriptType === 'shared' && script?.collaborative)) && (
                        <div
                            className={`
                                rounded-full
                                text-white
                                cursor-pointer
                                px-4 py-1
                                ${theme==='light' ? 'bg-black' : 'bg-gray-700'}
                            `}
                            onClick={() => {
                                // This temporary hack assumes any types of not-owned script are not sharable from the editor header.
                                const unsavedScript = userProject.scripts[activeTab];
                                shareScript(Object.assign({}, unsavedScript));
                            }}
                        >
                            <i className='icon-share32 pr-2' />
                            SHARE
                        </div>
                    )
                }
                <div
                    className={`
                        flex
                        rounded-full px-3 py-1
                        bg-gradient-to-t from-green-300 to-green-800
                        text-white cursor-pointer
                    `}
                    id='run-button'
                    onClick={compileCode}
                >
                    <div className='flex items-center bg-white rounded-full text-xl my-1 mr-2 p-1'>
                        <i className='icon-arrow-right22 font-bold text-green-600' />
                    </div>
                    RUN
                </div>
            </div>
        </div>
    );
};