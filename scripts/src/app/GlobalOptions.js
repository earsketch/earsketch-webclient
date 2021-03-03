import React from 'react';
import { react2angular } from 'react2angular'
import { Provider, useSelector, useDispatch } from 'react-redux';

import * as bubble from '../bubble/bubbleState';

class GlobalOptions extends React.Component {

    render() {
        const dispatch = useDispatch();
        return(
            <button
            onClick={() => dispatch(bubble.resume())}
            >
                helloWorld
            </button>
        );
    }


}

app.component('globalOptions', react2angular(GlobalOptions,null,['$ngRedux']));