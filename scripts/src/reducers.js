import { combineReducers } from 'redux';

import app from './app/appState';
import user from './user/userState';
import bubble from './bubble/bubbleState';
import api from './browser/apiState';
import sounds from './browser/soundsState';
import recommender from './browser/recommenderState';

export default combineReducers({
    app,
    user,
    bubble,
    api,
    sounds,
    recommender
});