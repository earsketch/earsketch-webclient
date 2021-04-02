import React, { useState, useEffect, Fragment, LegacyRef } from 'react';
import { hot } from 'react-hot-loader/root';
import { Store } from 'redux';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { react2angular } from 'react2angular';
import { usePopper } from 'react-popper';
import { Placement } from '@popperjs/core';
import parse from 'html-react-parser';

import { pages } from './bubbleData';
import * as bubble from './bubbleState';

const Backdrop = () => {
    return (
        <div className={`w-full h-full z-30 bg-black opacity-60`}/>
    );
};

const NavButton = (props: { tag: string, primary?: boolean, name: string}) => {
    const dispatch = useDispatch();
    const action = props.tag==='proceed' ? bubble.proceed : bubble.dismissBubble;
    const primary = props.primary;
    const readyToProceed = useSelector(bubble.selectReadyToProceed);
    const backgroundColor = primary ? (readyToProceed ? 'bg-black' : 'bg-gray-300') + ' text-white' : 'bg-white';
    const borderColor = primary && !readyToProceed ? 'border-transparent' : 'border-black';
    const pointer = primary && !readyToProceed ? 'cursor-not-allowed' : 'cursor-pointer';

    return (
        <button
            className={`border-2 ${borderColor} rounded-full p-2 px-4 mx-2 ${backgroundColor} ${pointer}`}
            onClick={() => dispatch(action())}
        >
            {props.name}
        </button>
    )
};

const MessageFooter = () => {
    const currentPage = useSelector(bubble.selectCurrentPage);
    const dispatch = useDispatch();

    let buttons;
    if (currentPage === 0) {
        buttons = (
            <Fragment>
                <NavButton name='Skip' tag='dismiss' />
                <NavButton name='Start' tag='proceed' primary />
            </Fragment>
        );
    } else if (currentPage === 9) {
        buttons = (
            <Fragment>
                <div className='w-40' />
                <NavButton name='Close' tag='dismiss' primary/>
            </Fragment>
        );
    } else {
        buttons = (
            <Fragment>
                <NavButton name='Skip tour' tag='dismiss' />
                <NavButton name='Next' tag='proceed' primary />
            </Fragment>
        );
    }

    return (
        <div className='flex justify-between mt-8'>
            <div className='w-1/2'>
                { currentPage===0 && (
                    <div>
                        <div className='text-sm'>Default programming language</div>
                        <select
                            className='border-0 border-b-2 border-black outline-none'
                            name="lang"
                            id="lang"
                            onChange={e => dispatch(bubble.setLanguage(e.currentTarget.value))}
                        >
                            <option value="Python">Python</option>
                            <option value="JavaScript">JavaScript</option>
                        </select>
                    </div>
                )}
            </div>
            <div className='w-1/3 flex justify-evenly'>
                { buttons }
            </div>
        </div>
    );
};

const DismissButton = () => {
    const dispatch = useDispatch();

    return (
        <div
            className='absolute top-0 right-0 m-4 text-3xl cursor-pointer'
            onClick={() => dispatch(bubble.dismissBubble())}
        >
            <span className="icon icon-cross2" />
        </div>
    );
};

const MessageBox = () => {
    const currentPage = useSelector(bubble.selectCurrentPage);

    const [referenceElement, setReferenceElement] = useState<Element|null>(null);
    const [popperElement, setPopperElement] = useState(null);
    const [arrowElement, setArrowElement] = useState(null);

    const placement = pages[currentPage].placement as Placement;
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        placement,
        modifiers: [
            { name: 'arrow', options: { element: arrowElement, padding: -25 } },
            { name: 'offset', options: { offset: [0,20] } },
            { name: 'flip', options: { fallbackPlacements: [] }}
        ],
    });

    const arrowStyle = { ...styles.arrow };
    switch (placement) {
        case 'top':
            Object.assign(arrowStyle, {
                bottom:'-19px',
                borderLeft: '20px solid transparent',
                borderRight: '20px solid transparent',
                borderTop: '20px solid white'
            });
            break;
        case 'bottom':
            Object.assign(arrowStyle, {
                top:'-19px',
                borderLeft: '20px solid transparent',
                borderRight: '20px solid transparent',
                borderBottom: '20px solid white'
            });
            break;
        case 'bottom-start':
            Object.assign(arrowStyle, {
                top:'-19px',
                left: '-270px',
                borderLeft: '20px solid transparent',
                borderRight: '20px solid transparent',
                borderBottom: '20px solid white'
            });
            break;
        case 'left':
            Object.assign(arrowStyle, {
                right:'-19px',
                borderTop: '20px solid transparent',
                borderBottom: '20px solid transparent',
                borderLeft: '20px solid white'
            });
            break;
        case 'left-start':
            Object.assign(arrowStyle, {
                top: '-99px',
                right:'-19px',
                borderTop: '20px solid transparent',
                borderBottom: '20px solid transparent',
                borderLeft: '20px solid white'
            });
            break;
        case 'right':
            Object.assign(arrowStyle, {
                left:'-19px',
                borderTop: '20px solid transparent',
                borderBottom: '20px solid transparent',
                borderRight: '20px solid white'
            });
            break;
        case 'right-start':
            Object.assign(arrowStyle, {
                top: '-99px',
                left:'-19px',
                borderTop: '20px solid transparent',
                borderBottom: '20px solid transparent',
                borderRight: '20px solid white'
            });
            break;
        default:
            break;
    }

    useEffect(() => {
        const ref = pages[currentPage].ref;
        const elem = document.querySelector(ref as string);
        if (ref && elem) setReferenceElement(elem);
        update?.();
    }, [currentPage]);

    return (
        <div
            className={`absolute z-40 w-1/3 bg-white p-8 shadow-xl`}
            ref={setPopperElement as LegacyRef<HTMLDivElement>}
            style={pages[currentPage].ref===null?{}:styles.popper}
            { ...attributes.popper }
        >
            { [0,9].includes(currentPage) && <DismissButton /> }
            <div className='text-3xl font-black mb-4'>
                { pages[currentPage].header }
            </div>
            <div>
                { parse(pages[currentPage].body) }
            </div>
            <MessageFooter />
            <div
                className='w-0 h-0'
                ref={setArrowElement as LegacyRef<HTMLDivElement>}
                style={pages[currentPage].ref===null ? {} : arrowStyle}
            />
        </div>
    );
};

const Bubble = () => {
    const active = useSelector(bubble.selectBubbleActive);
    return (
        <div
            className={`absolute top-0 w-full h-full flex justify-center items-center ${active ? 'inline-block' : 'hide'}`}
        >
            <Backdrop />
            <MessageBox />
        </div>
    );
};

const HotBubble = hot((props: { $ngRedux: Store }) => (
    <Provider store={props.$ngRedux}>
        <Bubble />
    </Provider>
));

// Export as an Angular component.
app.component('hotBubble', react2angular(HotBubble,null,['$ngRedux']));