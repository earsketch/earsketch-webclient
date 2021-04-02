import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as layout from '../layout/layoutState';
import * as helpers from '../helpers';
import { sampleScript } from "./bubbleData";
import { RootState } from '../reducers';
import { ScriptEntity } from 'common';

interface BubbleState {
    active: boolean
    currentPage: number,
    readyToProceed: true,
    language: 'Python' | 'JavaScript'
}

const bubbleSlice = createSlice({
    name: 'bubble',
    initialState: {
        active: false,
        currentPage: 0,
        readyToProceed: true,
        language: 'Python'
    } as BubbleState,
    reducers: {
        reset(state) {
            state['active'] = false;
            state['currentPage'] = 0;
            state['readyToProceed'] = true;
            state['language'] = 'Python';
        },
        resume(state) { state['active'] = true },
        suspend(state) { state['active'] = false },
        increment(state) { state['currentPage']++ },
        setReady(state, { payload }) { state['readyToProceed'] = payload },
        setLanguage(state, { payload }) { state['language'] = payload }
    }
});

export default bubbleSlice.reducer;
export const { reset, resume, suspend, increment, setReady, setLanguage } = bubbleSlice.actions;

const createSampleScript = createAsyncThunk(
    'bubble/createSampleScript',
    (_, { getState }) => {
        const { bubble: { language } } = getState() as { bubble: BubbleState };

        const fileName = `quick_tour.${language==='Python'?'py':'js'}`;
        const code = sampleScript[language.toLowerCase()];
        const userProject = helpers.getNgService('userProject');
        const rootScope = helpers.getNgService('$rootScope');
        return userProject.saveScript(fileName, code, true)
            .then((script: ScriptEntity) => {
                userProject.openScript(script.shareid)

                // tabController also needs to call refresh.
                rootScope.$broadcast('createScript', script.shareid);
            });
    }
);

// TODO: Should be an action in the editor reducer.
const setEditorReadOnly = createAsyncThunk(
    'bubble/setEditorWritable',
    async (payload: boolean) => {
        return new Promise(resolve => {
            const editorScope = helpers.getNgDirective('editor').scope();
            editorScope?.editor.setReadOnly(payload);
            setTimeout(resolve, 100);
        });
    }
);

export const dismissBubble = createAsyncThunk(
    'bubble/dismissBubble',
    (_, { dispatch }) => {
        dispatch(setEditorReadOnly(false));
        dispatch(suspend());
    }
);

export const proceed = createAsyncThunk(
    'bubble/proceed',
    async (payload, { getState, dispatch }) => {
        const { bubble: { currentPage, readyToProceed } } = getState() as { bubble: BubbleState };

        if (!readyToProceed) {
            return;
        }

        switch (currentPage) {
            case 0:
                await dispatch(layout.collapseWest());
                await dispatch(layout.collapseEast());
                await dispatch(createSampleScript());
                await dispatch(setEditorReadOnly(true));
                break;
            case 1:
                dispatch(setReady(false));
                break;
            case 2:
            case 3:
            case 4:
                break;
            case 5:
                await dispatch(layout.openWest('SOUNDS'));
                break;
            case 6:
                await dispatch(layout.openWest('SCRIPTS'));
                break;
            case 7:
                await dispatch(layout.openEast());
                break;
            case 8:
                await dispatch(setEditorReadOnly(false));
                break;
            default:
                return;
        }

        dispatch(increment());
    }
);

export const selectBubbleActive = (state: RootState) => state.bubble.active;
export const selectCurrentPage = (state: RootState) => state.bubble.currentPage;
export const selectReadyToProceed = (state: RootState) => state.bubble.readyToProceed;