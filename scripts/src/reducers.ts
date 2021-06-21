import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import app from './app/appState';
import user from './user/userState';
import ide from './ide/ideState';
import tabs from './ide/tabState';
import layout from './layout/layoutState';
import bubble from './bubble/bubbleState';
import sounds from './browser/soundsState';
import scripts from './browser/scriptsState';
import api from './browser/apiState';
import daw from './daw/dawState';
import curriculum from './browser/curriculumState';
import recommender from './browser/recommenderState';
import cai from './cai/caiState';

const rootReducer = combineReducers({
    app,
    user,
    ide,
    tabs,
    layout,
    bubble,
    sounds,
    scripts,
    api,
    daw,
    curriculum,
    recommender,
    cai,
});

// Note: Configuring store in rootReducer so it can be imported and accessed in non-React files.
// Some persistence settings are done in individual reducers for more granularity.
const persistConfig = {
    key: 'root',
    whitelist: ['layout'],
    storage
};

const store = configureStore({
    reducer: persistReducer(persistConfig, rootReducer),
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware({
            // Toggle these on for sanity checks.
            // See: https://redux-toolkit.js.org/api/getDefaultMiddleware#included-default-middleware
            immutableCheck: false,
            serializableCheck: false
        });
    }
});

persistStore(store);
export default store;

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export interface ThunkAPI { state: RootState, dispatch: AppDispatch }