import React from 'react';
import { react2angular } from 'react2angular';

const Footer = () => (
    <div className='flex justify-between bg-black text-white p-3'>
        <div>V{BUILD_NUM}</div>
        <div className='space-x-6'>
            <a className='text-white' href="https://www.teachers.earsketch.org" target="_blank">TEACHERS</a>
            <a className='text-white' href="https://earsketch.gatech.edu/landing/#/contact" target="_blank">HELP / CONTACT</a>
        </div>
    </div>
);

app.component('appFooter', react2angular(Footer));