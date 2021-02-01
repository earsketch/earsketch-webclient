import Split from 'split.js';
import * as layout from './layoutState';
import store from '../reducers';

export const horizontalSplits = Split(['#sidebar-container','#content','#curriculum-container'], {
    gutterSize: 6,
    minSize: 45,
    snapOffset: 0,
    sizes: layout.selectHorzRatio(store.getState()),
    gutterStyle(dimension) {
        return {
            width: '6px',
            cursor: 'ew-resize',
            'background-color': 'black',
            'z-index': 100
        }
    },
    onDragEnd(ratio) {
        store.dispatch(layout.setHorzSizesFromRatio(ratio));
    }
});

export const verticalSplits = Split(['#devctrl','#coder','#console-frame'], {
    direction: 'vertical',
    gutterSize: 6,
    minSize: 50,
    sizes: layout.selectVertRatio(store.getState()),
    snapOffset: 0,
    elementStyle(dimension, size, gutterSize) {
        return {
            'flex-basis': `calc(${size}% - ${gutterSize}px)`,
        }
    },
    gutterStyle(dimension, gutterSize) {
        return {
            'flex-basis': gutterSize + 'px',
            height: '6px',
            cursor: 'ns-resize',
            'background-color': 'black',
            'z-index': 100
        }
    },
    onDragEnd(ratio) {
        store.dispatch(layout.setVertSizesFromRatio(ratio));
    }
});