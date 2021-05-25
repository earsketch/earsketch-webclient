import React from 'react';
import { Store } from 'redux';
import { Provider, useSelector } from 'react-redux';
import { react2angular } from 'react2angular';
import * as appState from '../app/appState';

const Footer = () => {
    const embedMode = useSelector(appState.selectEmbedMode);

    return (
        <div className={`${embedMode ? 'hidden' : 'flex'} justify-between bg-black text-white p-3`}>
            <div>V{BUILD_NUM}</div>
            <div className='space-x-6'>
                <a className='text-white' href="https://www.teachers.earsketch.org" target="_blank">TEACHERS</a>
                <a className='text-white' href="https://earsketch.gatech.edu/landing/#/contact" target="_blank">HELP / CONTACT</a>
            </div>
        </div>
    );
};

const FooterContainer = (props: { $ngRedux: Store }) => {
    return (
        <Provider store={props.$ngRedux}>
            <Footer />
        </Provider>
    );
}

app.component('appFooter', react2angular(FooterContainer, null, ['$ngRedux']));