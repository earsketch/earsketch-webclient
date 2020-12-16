import { combineReducers } from 'redux';

import app from './app/appState';
import user from './user/userState';
import tabs from './editor/tabState';
import bubble from './bubble/bubbleState';
import sounds from './browser/soundsState';
import scripts from './browser/scriptsState';
import api from './browser/apiState';
import recommender from './browser/recommenderState';

export default combineReducers({
    app,
    user,
    tabs,
    bubble,
    sounds,
    scripts,
    api,
    recommender
});