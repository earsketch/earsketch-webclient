import React, { useState, useRef, useEffect } from 'react';
import { hot } from 'react-hot-loader/root';
import { react2angular } from 'react2angular';
import { Provider, useSelector, useDispatch } from 'react-redux';

import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { usePopper } from 'react-popper';

import * as helpers from 'helpers';
import * as sounds from './soundsState';

const theme = 'light';

const SearchBar = () => {
    const dispatch = useDispatch();
    const searchText = useSelector(sounds.selectSearchText);

    return (
        <form className='p-3 pb-1' onSubmit={e => e.preventDefault()}>
            <label className={`w-full border-b-2 flex justify-between  items-center ${theme === 'light' ? 'border-black' : 'border-white'}`}>
                <input
                    className='w-full outline-none p-1 bg-transparent'
                    type='text'
                    placeholder='Search'
                    value={searchText}
                    onChange={event => dispatch(sounds.setSearchText(event.target.value))}
                />
                {
                    searchText.length!==0 &&
                    (
                        <i
                            className='icon-cross2 pr-1 cursor-pointer'
                            onClick={() => dispatch(sounds.setSearchText(''))}
                        />
                    )
                }
            </label>
        </form>
    )
};

const FilterItem = ({ category, value }) => {
    const [highlight, setHighlight] = useState(false);
    const isUtility = ['Select All','Clear'].includes(value);
    const selected = isUtility ? false : useSelector(state => state.sounds.filters[category].includes(value));
    const dispatch = useDispatch();

    return (
        <div
            className={`flex justify-left cursor-pointer pr-8 ${ theme==='light' ? (highlight ? 'bg-blue-200' : 'bg-white') : (highlight ? 'bg-blue-500' : 'bg-black')}`}
            onClick={() => {
                if (isUtility) {
                    dispatch(sounds.resetFilter(category));
                } else {
                    if (selected) dispatch(sounds.removeFilterItem({ category, value }));
                    else dispatch(sounds.addFilterItem({ category, value }));
                }
            }}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
        >
            <div className='w-8'>
                <i className={`glyphicon glyphicon-ok ${(!isUtility&&selected) ? 'block' : 'hidden'}`} />
            </div>
            <div className='select-none'>
                {value}
            </div>
        </div>
    );
}

const DropdownFilter = props => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [referenceElement, setReferenceElement] = useState(null);
    const [popperElement, setPopperElement] = useState(null);
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        modifiers: [{ name: 'offset', options: { offset: [0,5] } }]
    });

    const handleClick = event => {
        setPopperElement(ref => {
            if (!ref.contains(event.target)) {
                setShowTooltip(false);
            }
            return ref;
        });
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClick);
        return (() => document.removeEventListener('mousedown', handleClick));
    }, []);

    let margin;
    if (props.position==='left') margin = 'mr-2';
    else if (props.position==='right') margin = 'ml-2';
    else margin = 'mx-1';

    const category = props.category.toLowerCase();
    const numSelected = useSelector(state => state.sounds.filters[category].length);

    return (
        <>
            <div
                ref={setReferenceElement}
                onClick={() => {setShowTooltip(show => {
                    update();
                    return !show;
                })}}
                className={`flex justify-between vertical-center w-1/3 truncate border-b-2 cursor-pointer select-none ${margin} ${theme==='light' ? 'border-black' : 'border-white'}`}
            >
                <div className='flex justify-left truncate'>
                    <div className='truncate min-w-0'>
                        {props.category}
                    </div>
                    <div className='ml-1'>
                        {numSelected ? `(${numSelected})` : ''}
                    </div>
                </div>
                <i className='icon icon-arrow-down2 text-lg p-2' />
            </div>
            <div
                ref={setPopperElement}
                style={showTooltip ? styles.popper : { display:'none' }}
                {...attributes.popper}
                className={`border border-black p-2 z-50 ${theme==='light' ? 'bg-white' : 'bg-black'}`}
            >
                <div>
                    <FilterItem
                        value='Clear'
                        category={category}
                    />
                    <hr className={`border-1 my-2 ${theme==='light' ? ' border-black' : 'border-white'}`} />
                    {
                        props.items.map(item => <FilterItem
                            key={item}
                            value={item}
                            category={category}
                        />)
                    }
                </div>
            </div>
        </>
    )
};

const Filters = () => {
    const artists = useSelector(sounds.selectAllRegularArtists);
    const genres = useSelector(sounds.selectAllRegularGenres);
    const instruments = useSelector(sounds.selectAllRegularInstruments);
    return (
        <div className='p-3'>
            <div className='pb-2 text-lg'>FILTER</div>
            <div className='flex justify-between'>
                <DropdownFilter
                    category='Artists'
                    items={artists}
                    position='left'
                />
                <DropdownFilter
                    category='Genres'
                    items={genres}
                    position='center'
                />
                <DropdownFilter
                    category='Instruments'
                    items={instruments}
                    position='right'
                />
            </div>
        </div>
    );
};

const ShowOnlyFavorites = () => {
    const dispatch = useDispatch();
    return (
        <div className='flex items-center'>
            <div className='pr-2'>
                <input
                    type="checkbox"
                    style={{margin:0}}
                    onClick={event => dispatch(sounds.setFilterByFavorites(event.target.checked))}
                />
            </div>
            <div className='pr-1'>
                Show only
            </div>
            <i className='icon icon-star-full2 fav-icon' />
        </div>
    );
};

const AddSound = () => {
    const ngRootScope = helpers.getNgRootScope();
    return (
        <div
            className='flex items-center rounded-full py-1 bg-black text-white cursor-pointer'
            onClick={() => ngRootScope.$broadcast('uploadModal')}
        >
            <div className='align-middle rounded-full bg-white text-black p-1 ml-2 mr-3 text-sm'>
                <i className='icon icon-plus2' />
            </div>
            <div className='mr-3'>
                Add sound
            </div>
        </div>
    );
};

const previewClip = async (fileKey, playing, setPlaying, bsNode, setBsNode) => {
    if (!playing) {
        setPlaying(true);
        const audioLibrary = helpers.getNgService('audioLibrary');
        await audioLibrary.getAudioClip(fileKey,-1).then(buffer => {
            const actx = helpers.getNgService('audioContext');
            const bs = actx.createBufferSource();
            bs.buffer = buffer;
            bs.connect(actx.destination);
            bs.start(0);
            bs.onended = () => {
                setPlaying(false);
            };
            setBsNode(bs);
        });
    } else {
        if (bsNode) {
            bsNode.stop();
        }
        setPlaying(false);
    }
}

const Clip = ({ clip, bgcolor }) => {
    const dispatch = useDispatch();
    const [playing, setPlaying] = useState(false);
    const [bsNode, setBsNode] = useState(null);
    const fileKey = clip.file_key;

    const tooltip = `File: ${fileKey}
        Folder: ${clip.folder}
        Artist: ${clip.artist}
        Genre: ${clip.genre}
        Instrument: ${clip.instrument}
        Original Tempo: ${clip.tempo}
        Year: ${clip.year}`.replace(/\n\s+/g,'\n');

    const loggedIn = useSelector(state => state.user.loggedIn);
    const isFavorite = loggedIn && useSelector(sounds.selectFavorites).includes(fileKey);
    const isUserOwned = loggedIn && clip.folder === useSelector(state => state.user.username).toUpperCase();
    const tabsOpen = useSelector(state => !!state.app.numTabsOpen);
    const ideScope = tabsOpen && helpers.getNgController('ideController').scope();

    return (
        <div className='flex flex-row justify-start'>
            <div className='h-auto border-l-4 border-blue-300' />
            <div className={`flex flex-grow truncate justify-between py-2 ${bgcolor} border border-gray-300`}>
                <div className='flex items-center min-w-0' title={tooltip}>
                    <span className='truncate pl-5'>{fileKey}</span>
                </div>
                <div className='pl-2 pr-4 h-1'>
                    <button
                        className='btn btn-xs btn-action'
                        onClick={() => previewClip(fileKey, playing, setPlaying, bsNode, setBsNode)}
                        title='Preview sound'
                    >
                        { playing
                            ? <i className='icon icon-stop2' />
                            : <i className='icon icon-play4' />
                        }
                    </button>
                    {
                        loggedIn &&
                        (
                            <button
                                className='btn btn-xs btn-action'
                                onClick={() => dispatch(sounds.markFavorite({ fileKey, isFavorite }))}
                                title='Mark as favorite'
                            >
                                { isFavorite
                                    ? <i className='icon icon-star-full2 fav-icon' />
                                    : <i className='icon icon-star-empty3 fav-icon' />
                                }
                            </button>
                        )
                    }
                    {
                        (tabsOpen && ideScope) &&
                        (
                            <button
                                className='btn btn-xs btn-action'
                                onClick={() => ideScope.pasteCode(fileKey)}
                                title='Paste to editor'
                            >
                                <i className='icon icon-paste2' />
                            </button>
                        )
                    }
                    {
                        (loggedIn && isUserOwned) &&
                        (
                            <>
                                <button
                                    className='btn btn-xs btn-action'
                                    onClick={() => {
                                        const mainScope = helpers.getNgMainController().scope();
                                        mainScope.renameSound(clip);
                                    }}
                                    title='Rename sound'
                                >
                                    <i className='icon icon-pencil3' />
                                </button>
                                <button
                                    className='btn btn-xs btn-action'
                                    onClick={() => {
                                        const mainScope = helpers.getNgMainController().scope();
                                        mainScope.deleteSound(clip);
                                    }}
                                    title='Delete sound'
                                >
                                    <i className='icon icon-backspace' />
                                </button>
                            </>
                        )
                    }
                </div>
            </div>
        </div>
    );
};

const ClipList = ({ fileKeys }) => {
    const entities = useSelector(sounds.selectAllEntities);
    return (<div className='flex flex-col'>{
        fileKeys && fileKeys.map(v => (
            <Clip
                key={v} clip={entities[v]}
                bgcolor={theme==='light' ? 'bg-white' : 'bg-gray-900'}
            />
        ))
    }</div>);
};

const Folder = ({ folder, fileKeys, bgTint, index, expanded, setExpanded, listRef }) => {
    const [highlight, setHighlight] = useState(false);
    let bgColor;
    if (highlight) {
        bgColor = theme==='light' ? 'bg-blue-200' : 'bg-blue-500';
    } else {
        if (theme==='light') {
            bgColor = bgTint ? 'bg-white' : 'bg-gray-300';
        } else {
            bgColor = bgTint ? 'bg-gray-900' : 'bg-gray-800';
        }
    }

    return (<>
        <div className={`flex flex-row justify-start`}>
            {
                expanded &&
                (<div className='h-auto border-l-4 border-blue-500' />)
            }
            <div
                className={`flex flex-grow truncate justify-between items-center p-3 text-2xl ${bgColor} cursor-pointer border ${theme==='light' ? 'border-gray-500' : 'border-gray-700'}`}
                title={folder}
                onClick={() => {
                    setExpanded(v => {
                        if (expanded) {
                            v.delete(index);
                            return new Set(v);
                        } else {
                            return new Set(v.add(index));
                        }
                    });
                    listRef && listRef.current.resetAfterIndex(index);
                }}
                onMouseEnter={() => setHighlight(true)}
                onMouseLeave={() => setHighlight(false)}
            >
                <div className='truncate'>{folder}</div>
                <span className="btn btn-xs w-1/12 text-2xl">
                        {
                            expanded
                                ? <i className="icon icon-arrow-down2" />
                                : <i className="icon icon-arrow-right2" />
                        }
                    </span>
            </div>
        </div>
        { expanded && <ClipList fileKeys={fileKeys} /> }
    </>);
};

const Collection = ({ title, visible, children }) => {
    const [expanded, setExpanded] = useState(false);
    const [highlight, setHighlight] = useState(false);

    return (<>
        <div className={`flex flex-row justify-start`}>
            {
                expanded &&
                (<div className='h-auto border-l-4 border-orange-400' />)
            }
            <div
                className={`flex flex-grow justify-between items-center p-3 text-2xl border border-gray-800 cursor-pointer select-none ${visible ? 'block' : 'hidden'}`}
                style={{
                    backgroundColor: highlight ? '#334657' : '#223546',
                    color: '#F5AE3C'
                }}
                title={title}
                onClick={() => setExpanded(v => !v)}
                onMouseEnter={() => setHighlight(true)}
                onMouseLeave={() => setHighlight(false)}
            >
                <div className='flex items-center truncate py-1'>
                    <i className='icon-album pr-3' />
                    <div className='truncate'>{title}</div>
                </div>
                <div className="w-1/12 text-2xl">
                    {
                        expanded
                            ? <i className="icon icon-arrow-down2" />
                            : <i className="icon icon-arrow-right2" />
                    }
                </div>
            </div>
        </div>
        { expanded && children }
    </>);
};

const RecommendationFolder = () => {
    const loggedIn = useSelector(state => state.user.loggedIn);
    const tabsOpen = useSelector(state => !!state.app.numTabsOpen);
    const recommendations = useSelector(state => state.recommender.recommendations);

    return (
        <Collection
            title='RECOMMENDATIONS'
            visible={loggedIn&&tabsOpen}
        >
            <ClipList fileKeys={recommendations} />
        </Collection>
    );
};

const FeaturedArtists = () => {
    const visible = useSelector(sounds.selectFeaturedSoundVisibility);
    const artists = useSelector(sounds.selectFeaturedArtists);
    const folders = useSelector(sounds.selectFeaturedFolders);
    const fileKeysByFolders = useSelector(sounds.selectFeaturedFileKeysByFolders);
    const [expanded, setExpanded] = useState(new Set());

    return (
        <Collection
            title={'FEATURED ARTIST' + (artists.length>1 ? 'S' : '')}
            visible={folders && visible}
        >
            <div className='flex flex-row justify-start'>
                <div className='h-auto border-l-4 border-orange-300' />
                <div className='flex flex-col flex-grow truncate justify-between'>
                    {
                        folders && folders.map((v,i) => (
                            <Folder
                                key={v}
                                folder={v}
                                fileKeys={fileKeysByFolders[v]}
                                bgTint={i%2===0}
                                index={i}
                                expanded={expanded.has(i)}
                                setExpanded={setExpanded}
                            />
                        ))
                    }
                </div>
            </div>
        </Collection>
    );
}

const WindowedFolderList = () => {
    const folders = useSelector(sounds.selectFilteredFolders);
    const fileKeysByFolders = useSelector(sounds.selectFilteredFileKeysByFolders);
    const [expanded, setExpanded] = useState(new Set());
    const listRef = useRef(null);
    const filteredListChanged = useSelector(sounds.selectFilteredListChanged);

    useEffect(() => {
        setExpanded(new Set());

        if (listRef && listRef.current) {
            listRef.current.resetAfterIndex(0);
        }
    }, [filteredListChanged]);

    const getItemSize = index => {
        const folderHeight = 43;
        const clipHeight = 32;
        return folderHeight + (expanded.has(index) && clipHeight * fileKeysByFolders[folders[index]].length);
    };

    return (
        <AutoSizer>
            {({height, width}) => (
                <List
                    ref={listRef}
                    height={height}
                    itemCount={folders.length}
                    itemSize={getItemSize}
                    width={width}
                >
                    {({ index, style }) => {
                        const fileKeys = fileKeysByFolders[folders[index]];
                        return (
                            <div style={style}>
                                <Folder
                                    folder={folders[index]}
                                    fileKeys={fileKeys}
                                    bgTint={index%2===0}
                                    index={index}
                                    expanded={expanded.has(index)}
                                    setExpanded={setExpanded}
                                    listRef={listRef}
                                />
                            </div>
                        );
                    }}
                </List>
            )}
        </AutoSizer>
    );
}

const ContentManagerTitleBar = () => {
    const layoutScope = helpers.getNgController('layoutController').scope();
    return (
        <div className='flex items-center p-3 text-2xl'>
            <div className='pl-3 pr-4'>
                CONTENT MANAGER
            </div>
            <div>
                <div
                    className='flex justify-end w-12 h-7 p-1 bg-black rounded-full cursor-pointer'
                    onClick={() => {
                        layoutScope.closeSidebarTabs();
                        layoutScope.$applyAsync();
                    }}
                >
                    <div className='w-5 h-5 bg-white rounded-full'>&nbsp;</div>
                </div>
            </div>
        </div>
    )
};

const ContentManagerTabs = () => {
    const layoutScope = helpers.getNgController('layoutController').scope();
    return (
        <div
            className='flex justify-between text-center'
            style={{
                backgroundColor: '#223546',
                color: 'white'
            }}
        >
            <div
                className='p-3 w-1/3 border-b-4 cursor-pointer'
                style={{
                    color: '#F5AE3C',
                    borderColor: '#F5AE3C'
                }}
            >
                <i className='icon-headphones pr-2' />
                SOUNDS
            </div>
            <div
                className='p-3 w-1/3 cursor-pointer'
                onClick={() => layoutScope.openSidebarTab('script')}
            >
                <i className='icon-embed2 pr-2' />
                SCRIPTS
            </div>
            <div
                className='p-3 w-1/3 cursor-pointer'
                onClick={() => layoutScope.openSidebarTab('api')}
            >
                <i className='icon-book pr-2' />
                APIs
            </div>
        </div>
    )
};

const HotSoundCollections = hot(props => {
    return (
        <Provider store={props.$ngRedux}>
            <div
                className={`flex flex-col absolute h-full w-full text-left ${theme==='light' ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
                style={{marginTop:-12}}
            >
                <div className='flex-grow-0'>
                    <ContentManagerTitleBar />
                    <ContentManagerTabs />
                    <SearchBar />
                    <Filters />

                    <div className='flex justify-between p-3 mb-2'>
                        <ShowOnlyFavorites />
                        <AddSound />
                    </div>

                    <RecommendationFolder />
                    <FeaturedArtists />
                </div>

                <div className='flex-grow'>
                    <WindowedFolderList />
                </div>
            </div>
        </Provider>
    )
});

app.component('soundCollections', react2angular(HotSoundCollections,null,['$ngRedux']));

// TODO: Move this elsewhere.
export { ContentManagerTitleBar };