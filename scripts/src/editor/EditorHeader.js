import React, { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { hot } from 'react-hot-loader/root';
import { react2angular } from 'react2angular';

import * as appState from '../app/appState';
import * as editor from './editorState';
import * as tabs from './tabState';
import * as scripts from '../browser/scriptsState';
import * as helpers from 'helpers';

const UndoRedoButtons = () => {
    const editorScope = helpers.getNgDirective('editor').scope();
    const theme = useSelector(appState.selectColorTheme);

    const enabled = `cursor-pointer ${theme==='light' ? 'text-black' : 'text-white'}`;
    const disabled = `cursor-not-allowed ${theme==='light' ? 'text-gray-300' : 'text-gray-700'}`;

    const [hasUndo, setHasUndo] = useState(false);
    const [hasRedo, setHasRedo] = useState(false);

    const onChangeTask = () => {
        // ACE hasUndo/hasRedo API are not ready synchronously after editor onChange.
        setTimeout(() => {
            setHasUndo(editorScope.editor.checkUndo());
            setHasRedo(editorScope.editor.checkRedo());
        });
    };

    useEffect(() => {
        if (!editorScope.onChangeTasks) return;
        editorScope.onChangeTasks.add(onChangeTask)
        return () => editorScope.onChangeTasks.delete(onChangeTask);
    });

    return (<>
        <i
            className={`icon-spinner11 ${hasUndo ? enabled : disabled}`}
            style={{ transform: 'scaleX(-1)' }}
            onClick={() => editorScope.editor.undo()}
        />
        <i
            className={`icon-spinner11 ${hasRedo ? enabled : disabled}`}
            onClick={() => editorScope.editor.redo()}
        />
    </>);
};

const EditorHeader = () => {
    const dispatch = useDispatch();
    const mainScope = helpers.getNgMainController().scope();
    const ideScope = helpers.getNgController('ideController').scope();
    const openTabs = useSelector(tabs.selectOpenTabs);
    const activeTab = useSelector(tabs.selectActiveTabID);
    const allScripts = useSelector(scripts.selectAllScriptEntities);
    const blocksMode = useSelector(editor.selectBlocksMode);
    const embedMode = useSelector(appState.selectEmbedMode);
    const theme = useSelector(appState.selectColorTheme);
    const loggedIn = useSelector(state => state.user.loggedIn);
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
                    !(script && script.collaborative) && (
                        <div
                            className={'flex items-center cursor-pointer truncate'}
                            onClick={() => {
                                ideScope.toggleBlocks();
                                dispatch(editor.setBlocksMode(ideScope.editor.droplet.currentlyUsingBlocks));
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
                    (loggedIn && scriptType !== 'readonly' && !(scriptType === 'shared' && script.collaborative)) && (
                        <div
                            className={`
                                rounded-full
                                text-white
                                cursor-pointer
                                px-4 py-1
                                ${theme==='light' ? 'bg-black' : 'bg-gray-700'}
                            `}
                            onClick={() => {
                                const userProject = helpers.getNgService('userProject');
                                // This temporary hack assumes any types of not-owned script are not sharable from the editor header.
                                const unsavedScript = userProject.scripts[activeTab];
                                mainScope.shareScript(Object.assign({}, unsavedScript));
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
                    onClick={() => ideScope.compileCode()}
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

const HotEditorHeader = hot(props => {
    return (
        <Provider store={props.$ngRedux}>
            <EditorHeader />
        </Provider>
    );
});

app.component('editorHeader', react2angular(HotEditorHeader, null, ['$ngRedux']));