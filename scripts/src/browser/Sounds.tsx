import React, {useState, useRef, useEffect, ChangeEvent, MouseEvent } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

import * as helpers from '../helpers';
import * as sounds from './soundsState';
import * as appState from '../app/appState';
import * as user from '../user/userState';
import * as tabs from '../editor/tabState';
import { RootState } from '../reducers';
import { SoundEntity } from 'common';

import { SearchBar, Collection, DropdownMultiSelector } from './Browser';

const SoundSearchBar = () => {
    const dispatch = useDispatch();
    const searchText = useSelector(sounds.selectSearchText);
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(sounds.setSearchText(event.target.value));
    const dispatchReset = () => dispatch(sounds.setSearchText(''));
    const props = { searchText, dispatchSearch, dispatchReset };

    return <SearchBar { ...props } />;
};

const FilterItem = ({ category, value }: { category: keyof sounds.Filters, value: string }) => {
    const [highlight, setHighlight] = useState(false);
    const isUtility = value==='Clear';
    const selected = isUtility ? false : useSelector((state: RootState) => state.sounds.filters[category].includes(value));
    const dispatch = useDispatch();
    const theme = useSelector(appState.selectColorTheme);

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
                <i className={`glyphicon glyphicon-ok ${selected ? 'block' : 'hidden'}`} />
            </div>
            <div className='select-none'>
                {value}
            </div>
        </div>
    );
};

const Filters = () => {
    const includeFeaturedArtists = useSelector(sounds.selectFeaturedSoundVisibility);
    const artistsSelector = includeFeaturedArtists ? sounds.selectAllArtists : sounds.selectAllRegularArtists;
    const genresSelector = includeFeaturedArtists ? sounds.selectAllGenres : sounds.selectAllRegularGenres;
    const instrumentsSelector = includeFeaturedArtists ? sounds.selectAllInstruments : sounds.selectAllRegularInstruments;

    const artists = useSelector(artistsSelector);
    const genres = useSelector(genresSelector);
    const instruments = useSelector(instrumentsSelector);
    const numArtistsSelected = useSelector(sounds.selectNumArtistsSelected);
    const numGenresSelected = useSelector(sounds.selectNumGenresSelected);
    const numInstrumentsSelected = useSelector(sounds.selectNumInstrumentsSelected);

    return (
        <div className='p-3'>
            <div className='pb-2 text-lg'>FILTER</div>
            <div className='flex justify-between'>
                <DropdownMultiSelector
                    title='Artists'
                    category='artists'
                    items={artists}
                    position='left'
                    numSelected={numArtistsSelected}
                    FilterItem={FilterItem}
                />
                <DropdownMultiSelector
                    title='Genres'
                    category='genres'
                    items={genres}
                    position='center'
                    numSelected={numGenresSelected}
                    FilterItem={FilterItem}
                />
                <DropdownMultiSelector
                    title='Instruments'
                    category='instruments'
                    items={instruments}
                    position='right'
                    numSelected={numInstrumentsSelected}
                    FilterItem={FilterItem}
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
                    onClick={(event: MouseEvent) => {
                        const elem = event.target as HTMLInputElement;
                        dispatch(sounds.setFilterByFavorites(elem.checked));
                    }}
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

const Clip: React.FC<{ clip: SoundEntity, bgcolor: string }> = ({ clip, bgcolor }) => {
    const dispatch = useDispatch();
    const previewFileKey = useSelector(sounds.selectPreviewFileKey);
    const fileKey = clip.file_key;
    const theme = useSelector(appState.selectColorTheme);

    const tooltip = `File: ${fileKey}
        Folder: ${clip.folder}
        Artist: ${clip.artist}
        Genre: ${clip.genre}
        Instrument: ${clip.instrument}
        Original Tempo: ${clip.tempo}
        Year: ${clip.year}`.replace(/\n\s+/g,'\n');

    const loggedIn = useSelector(user.selectLoggedIn);
    const isFavorite = loggedIn && useSelector(sounds.selectFavorites).includes(fileKey);
    const userName = useSelector(user.selectUserName) as string;
    const isUserOwned = loggedIn && clip.folder === userName.toUpperCase();
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length;
    const ideScope = tabsOpen && helpers.getNgController('ideController').scope();

    return (
        <div className='flex flex-row justify-start'>
            <div className='h-auto border-l-4 border-blue-300' />
            <div className={`flex flex-grow truncate justify-between py-2 ${bgcolor} border ${theme==='light' ? 'border-gray-300' : 'border-gray-700'}`}>
                <div className='flex items-center min-w-0' title={tooltip}>
                    <span className='truncate pl-5'>{fileKey}</span>
                </div>
                <div className='pl-2 pr-4 h-1'>
                    <button
                        className='btn btn-xs btn-action'
                        onClick={() => dispatch(sounds.previewSound(fileKey))}
                        title='Preview sound'
                    >
                        { previewFileKey===fileKey
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

const ClipList = ({ fileKeys }: { fileKeys: string[] }) => {
    const entities = useSelector(sounds.selectAllEntities);
    const theme = useSelector(appState.selectColorTheme);

    return (
        <div className='flex flex-col'>
            {
                fileKeys?.map((v: string) =>
                    <Clip
                        key={v} clip={entities[v]}
                        bgcolor={theme==='light' ? 'bg-white' : 'bg-gray-900'}
                    />
                )
            }
        </div>
    );
};

interface Folder {
    folder: string,
    fileKeys: string[],
    bgTint: boolean,
    index: number,
    expanded: boolean,
    setExpanded: React.Dispatch<React.SetStateAction<Set<number>>>
    listRef: React.RefObject<any>
}

const Folder = ({ folder, fileKeys, bgTint, index, expanded, setExpanded, listRef }: Folder) => {
    const [highlight, setHighlight] = useState(false);
    const theme = useSelector(appState.selectColorTheme);

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
                className={`flex flex-grow truncate justify-between items-center p-3 text-2xl ${bgColor} cursor-pointer border-b border-r ${theme==='light' ? 'border-gray-500' : 'border-gray-700'}`}
                title={folder}
                onClick={() => {
                    setExpanded((v: Set<number>) => {
                        if (expanded) {
                            v.delete(index);
                            return new Set(v);
                        } else {
                            return new Set(v.add(index));
                        }
                    });
                    listRef?.current?.resetAfterIndex(index);
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

const WindowedRecommendations = () => {
    const loggedIn = useSelector(user.selectLoggedIn);
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length;
    const recommendations = useSelector((state: RootState) => state.recommender.recommendations);

    return (
        <Collection
            title='RECOMMENDATIONS'
            visible={loggedIn&&tabsOpen}
            initExpanded={false}
        >
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        height={height}
                        width={width}
                        itemCount={1}
                        itemSize={() => 45}
                    >
                        {({ style }) => {
                            return (
                                <div style={style}>
                                    <ClipList fileKeys={recommendations} />
                                </div>
                            );
                        }}
                    </List>
                )}
            </AutoSizer>
        </Collection>
    );
};

interface WindowedSoundCollection {
    title: string
    folders: string[]
    fileKeysByFolders: any
    filteredListChanged: boolean | number
    visible?: boolean
    initExpanded?: boolean
}

const WindowedSoundCollection: React.FC<WindowedSoundCollection> = ({ title, folders, fileKeysByFolders, filteredListChanged=false, visible=true, initExpanded=true }) => {
    const [expanded, setExpanded] = useState(new Set());
    const listRef = useRef<List>(null);

    useEffect(() => {
        setExpanded(new Set());

        if (listRef?.current) {
            listRef.current.resetAfterIndex(0);
        }
    }, [filteredListChanged]);

    const getItemSize = (index: number) => {
        const folderHeight = 40;
        const clipHeight = 33;
        return folderHeight + (expanded.has(index) ? clipHeight * fileKeysByFolders[folders[index]].length : 0);
    };

    return (
        <Collection
            title={title}
            visible={visible}
            initExpanded={initExpanded}
        >
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        ref={listRef}
                        height={height}
                        width={width}
                        itemCount={folders.length}
                        itemSize={getItemSize}
                    >
                        {({ index, style }) => {
                            const fileKeys = fileKeysByFolders[folders[index]];
                            return (
                                <div style={style}>
                                    <Folder
                                        folder={folders[index]}
                                        fileKeys={fileKeys}
                                        bgTint={index % 2 === 0}
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
        </Collection>
    );
};

const DefaultSoundCollection = () => {
    const folders = useSelector(sounds.selectFilteredRegularFolders);
    const fileKeysByFolders = useSelector(sounds.selectFilteredRegularFileKeysByFolders);
    const filteredListChanged = useSelector(sounds.selectFilteredListChanged);
    const numFileKeys = useSelector(sounds.selectAllRegularFileKeys).length;
    const numFilteredFileKeys = useSelector(sounds.selectFilteredRegularFileKeys).length;
    const filtered = numFilteredFileKeys !== numFileKeys;
    const title = `SOUND COLLECTION (${filtered ? numFilteredFileKeys+'/' : ''}${numFileKeys})`;
    const props = { title, folders, fileKeysByFolders, filteredListChanged };
    return <WindowedSoundCollection { ...props } />;
};

const FeaturedArtistCollection = () => {
    const folders = useSelector(sounds.selectFilteredFeaturedFolders);
    const fileKeysByFolders = useSelector(sounds.selectFilteredFeaturedFileKeysByFolders);
    const filteredListChanged = useSelector(sounds.selectFilteredListChanged);
    const visible = useSelector(sounds.selectFeaturedSoundVisibility);
    const initExpanded = true;
    const numFileKeys = useSelector(sounds.selectFeaturedFileKeys).length;
    const numFilteredFileKeys = useSelector(sounds.selectFilteredFeaturedFileKeys).length;
    const filtered = numFilteredFileKeys !== numFileKeys;
    const artists = useSelector(sounds.selectFeaturedArtists);
    const title = `FEATURED ARTIST${artists.length>1 ? 'S' : ''} (${filtered ? numFilteredFileKeys+'/' : ''}${numFileKeys})`;
    const props = { title, folders, fileKeysByFolders, filteredListChanged, visible, initExpanded };
    return <WindowedSoundCollection { ...props } />;
};

export const SoundBrowser = () => {
    const loggedIn = useSelector(user.selectLoggedIn);

    return (
        <>
            <div className='flex-grow-0'>
                <div className='pb-3'>
                    <SoundSearchBar />
                    <Filters />
                </div>

                <div className={`${loggedIn ? 'flex' : 'hidden'} justify-between px-3 pb-3 mb-2`}>
                    <ShowOnlyFavorites />
                    <AddSound />
                </div>
            </div>

            <div className='h-full flex flex-col justify-start'>
                <DefaultSoundCollection />
                <FeaturedArtistCollection />
                <WindowedRecommendations />
            </div>
        </>
    );
};