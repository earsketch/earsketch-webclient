import React, { createRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import classNames from "classnames"
import { useTranslation } from "react-i18next"

import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import * as sounds from "./soundsState"
import * as soundsThunks from "./soundsThunks"
import { BrowserTabType } from "./BrowserTab"
import { SearchBar } from "./Utils"

import { AudioWaveform } from "../app/AudioWaveForm"

import store from "../reducers"
import { Filters, ShowOnlyFavorites, SoundSearchAndFiltersProps } from "./Sounds"

const SoundSearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(sounds.selectSearchText)
    return (
        <SearchBar
            id="soundSearchBar"
            searchText={searchText}
            dispatchSearch={(e) => dispatch(sounds.setSearchText(e.target.value))}
            dispatchReset={() => dispatch(sounds.setSearchText(""))}
        />
    )
}

const SoundFilters = ({ currentFilterTab, setCurrentFilterTab, setFilterHeight }: SoundSearchAndFiltersProps) => {
    const filterRef: React.RefObject<HTMLDivElement> = createRef()
    useLayoutEffect(() => {
        const soundFilterHeight = filterRef.current?.offsetHeight || 0
        setFilterHeight(soundFilterHeight)
    })

    return (
        <div ref={filterRef} className="pb-1">
            <div className="pb-1">
                <Filters
                    currentFilterTab={currentFilterTab}
                    setCurrentFilterTab={setCurrentFilterTab} />
            </div>
            <div className="flex justify-between px-1.5 py-1 mb-0.5">
                <ShowOnlyFavorites />
            </div>
        </div>
    )
}

export const SoundPreview = () => {
    const { t } = useTranslation()
    const dispatch = useDispatch()

    // folder-structured filtered data
    const folders = useSelector(sounds.selectFilteredRegularFolders)
    const namesByFolders = useSelector(sounds.selectFilteredRegularNamesByFolders)

    // preview state
    const preview = useSelector(sounds.selectPreview)
    const previewNodes = useSelector(sounds.selectPreviewNodes)

    // SoundFilters needs these
    const [currentFilterTab, setCurrentFilterTab] = useState<keyof sounds.Filters>("artists")

    // Build a folder-first queue: [{folder, name}, ...]
    const queue = useMemo(() => {
        const out: Array<{ folder: string; name: string }> = []
        for (const folder of folders) {
            const names: string[] = namesByFolders?.[folder] ?? []
            for (const name of names) out.push({ folder, name })
        }
        return out
    }, [folders, namesByFolders])

    const [index, setIndex] = useState(0)

    // Reset to the first sound whenever filters/search change the queue
    useEffect(() => {
        setIndex(0)
    }, [queue.map((x) => `${x.folder}/${x.name}`).join("|")])

    const current = queue[index] ?? null
    const currentName = current?.name ?? null
    const currentFolder = current?.folder ?? null
    // const currentEntity = currentName ? entities[currentName] : null

    const canPrev = index > 0
    const canNext = index < queue.length - 1

    const stopIfPlaying = (name: string | null) => {
        if (!name) return
        if (preview?.kind === "sound" && preview.name === name) {
            dispatch(soundsThunks.togglePreview({ name, kind: "sound" })) // OFF
        }
    }

    const playNow = (name: string | null) => {
        if (!name) return

        // stop whatever else is playing
        if (preview?.kind === "sound" && preview.name && preview.name !== name) {
            dispatch(soundsThunks.togglePreview({ name: preview.name, kind: "sound" })) // OFF old
        }

        // start this one if not already playing
        if (!(preview?.kind === "sound" && preview.name === name)) {
            dispatch(soundsThunks.togglePreview({ name, kind: "sound" })) // ON new
        }
    }

    const goTo = (nextIndex: number) => {
        const next = queue[nextIndex]
        if (!next) return
        stopIfPlaying(currentName)
        setIndex(nextIndex)
        playNow(next.name)
    }

    const goPrev = () => canPrev && goTo(index - 1)
    const goNext = () => canNext && goTo(index + 1)

    // stop reliably on unmount (no stale preview)
    useEffect(() => {
        return () => {
            const state = store.getState()
            const p = state.sounds?.preview?.value ?? state.sounds?.preview
            if (p?.kind === "sound" && p.name) {
                dispatch(soundsThunks.togglePreview({ name: p.name, kind: "sound" }))
            }
        }
    }, [dispatch])

    // keyboard navigation
    const containerRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                e.preventDefault()
                goPrev()
            } else if (e.key === "ArrowRight") {
                e.preventDefault()
                goNext()
            }
        }
        el.addEventListener("keydown", onKeyDown)
        return () => el.removeEventListener("keydown", onKeyDown)
    }, [index, queue.length])

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className="grow flex flex-col justify-start min-h-0 outline-none"
            role="tabpanel"
            id={"panel-" + BrowserTabType.Sound}
            aria-label="Sound browser"
        >
            <SoundSearchBar />

            <SoundFilters
                currentFilterTab={currentFilterTab}
                setCurrentFilterTab={setCurrentFilterTab}
                setFilterHeight={() => { }}
            />

            {/* Single sound view */}
            <div className="flex flex-col items-center justify-center grow min-h-0 px-4">
                <div className="text-2xl font-semibold tracking-wide mb-2 text-center">
                    {currentName ?? t("soundBrowser.noSoundsFound")}
                </div>

                {currentFolder && (
                    <div className="text-sm text-gray-500 mb-4 text-center">
                        {t("soundBrowser.clip.tooltip.folder")}: {currentFolder}
                    </div>
                )}

                <div className="w-full flex items-center justify-between gap-6">
                    <button
                        onClick={goPrev}
                        disabled={!canPrev}
                        aria-label="Previous sound"
                        title="Previous sound (Left Arrow)"
                        className={classNames(
                            "shrink-0 w-20 h-20 rounded-lg border flex items-center justify-center",
                            canPrev ? "bg-black text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        <span className="text-3xl" aria-hidden="true">
                            ◀
                        </span>
                    </button>

                    <div className="grow flex flex-col items-center">
                        <div className="w-full max-w-2xl border rounded-md bg-white flex items-center justify-center">
                            <AudioWaveform soundName={currentName} height={140} progress={undefined} />
                        </div>
                    </div>

                    <button
                        onClick={goNext}
                        disabled={!canNext}
                        aria-label="Next sound"
                        title="Next sound (Right Arrow)"
                        className={classNames(
                            "shrink-0 w-20 h-20 rounded-lg border flex items-center justify-center",
                            canNext ? "bg-black text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        <span className="text-3xl" aria-hidden="true">
                            ▶
                        </span>
                    </button>
                </div>
                {currentName && (
                    <button
                        onClick={() => {
                            dispatch(soundsThunks.togglePreview({ name: currentName, kind: "sound" }))
                        }}
                        className="mt-4 w-16 h-16 rounded-lg bg-black text-white flex items-center justify-center"
                        aria-label={preview?.kind === "sound" && preview.name === currentName ? "Stop sound" : "Play sound"}
                        title={preview?.kind === "sound" && preview.name === currentName ? "Stop" : "Play"}>

                        {preview?.kind === "sound" && preview.name === currentName
                            ? (previewNodes ? (<span className="text-xl">Stop</span>) : (<div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />))
                            : (<span className="text-xl">Play</span>
                            )}
                    </button>
                )}
                <div className="mt-4 text-sm text-gray-500">
                    {queue.length > 0 ? `${index + 1} / ${queue.length}` : ""}
                </div>
            </div>
        </div>
    )
}
