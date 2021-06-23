import Split from 'split.js';

import * as layout from './layoutState';
import store from '../reducers';

export const resetHorizontalSplits = () => {
    const horizontalSplits = layout.getHorizontalSplits();
    horizontalSplits?.setSizes(layout.selectHorizontalRatio(store.getState()));
};

export const toggleHorizontalDrag = (index: number, state: boolean) => {
    const gutter = document.getElementById(`gutter-horizontal-${index}`);
    if (gutter) gutter.style['pointerEvents'] = state ? 'auto' : 'none';
};

export const initialize = () => {
    const horizontalSplits = Split(['#sidebar-container','#content','#curriculum-container'], {
        gutterSize: layout.getGutterSize(),
        minSize: layout.getMinSize(),
        snapOffset: 0,
        sizes: layout.selectHorizontalRatio(store.getState()),
        gutter(index, direction) {
            const gutter = document.createElement('div');
            gutter.className = `gutter gutter-${direction}`;
            gutter.id = `gutter-${direction}-${index-1}`; // Given index starts at 1.
            return gutter;
        },
        gutterStyle() {
            return {
                width: `${layout.getGutterSize()}px`,
                cursor: 'col-resize'
            }
        },
        onDragEnd(ratio) {
            store.dispatch(layout.setHorizontalSizesFromRatio(ratio));
        }
    });

    const verticalSplits = Split(['#devctrl','#coder','#console-frame'], {
        direction: 'vertical',
        gutterSize: layout.getGutterSize(),
        minSize: layout.getMinSize(),
        sizes: layout.selectVerticalRatio(store.getState()),
        snapOffset: 0,
        elementStyle(dimension, size, gutterSize) {
            return {
                'flex-basis': `calc(${size}% - ${gutterSize}px)`,
            }
        },
        gutter(index, direction) {
            const gutter = document.createElement('div');
            gutter.className = `gutter gutter-${direction}`;
            gutter.id = `gutter-${direction}-${index-1}`; // Given index starts at 1.
            return gutter;
        },
        gutterStyle(dimension, gutterSize) {
            return {
                'flex-basis': gutterSize + 'px',
                height: `${layout.getGutterSize()}px`,
                cursor: 'row-resize'
            }
        },
        onDragEnd(ratio) {
            store.dispatch(layout.setVerticalSizesFromRatio(ratio));
        }
    });

    // Initialize the reference data in layout reducer.
    // TODO: Remove this hack when we port split.js to the react version.
    layout.setHorizontalSplits(horizontalSplits);
    layout.setVerticalSplits(verticalSplits);

    // Initialize the draggability for the horizontal gutters.
    !layout.isWestOpen(store.getState()) && toggleHorizontalDrag(0, false);
    !layout.isEastOpen(store.getState()) && toggleHorizontalDrag(1, false);
};

export const destroy = () => {
    const horizontalSplits = layout.getHorizontalSplits();
    const verticalSplits = layout.getVerticalSplits();
    horizontalSplits?.destroy();
    verticalSplits?.destroy();
    layout.setHorizontalSplits(null);
    layout.setVerticalSplits(null);
};
