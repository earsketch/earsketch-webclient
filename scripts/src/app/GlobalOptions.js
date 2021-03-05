import React from 'react';
import { react2angular } from 'react2angular'
import { Provider, useSelector, useDispatch } from 'react-redux';

import * as appState from '../app/appState';
import * as bubble from '../bubble/bubbleState';
import {hot} from "react-hot-loader/root";

const GlobalOptions = () => {
    const dispatch = useDispatch()

    function resumeQuickTour() {
        dispatch(bubble.reset());
        dispatch(bubble.resume());
    }

    return(
        <div>
            <button
                onClick={() => resumeQuickTour()}
            >
                helloWorld2
            </button>
            <button
                onClick={() => dispatch(appState.toggleColorTheme())}
            >
                toggleColor
            </button>
        </div>
    );



}

const HotGlobalOptions = hot(props => (
    <Provider store={props.$ngRedux}>
        <GlobalOptions />
    </Provider>
));

app.component('hotGlobalOptions', react2angular(HotGlobalOptions,null,['$ngRedux']));