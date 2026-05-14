import { beforeEach, expect, it, vi } from "vitest"
import { Provider } from "react-redux"
import { render, waitFor } from "@testing-library/react"
import d3 from "d3"
import ResizeObserver from "resize-observer-polyfill"

import "../../AudioContextMock/AudioContext.mock"
import store from "../../../../src/reducers"
import { DAW } from "../../../../src/daw/DAW"
import { setTracks, setPlayLength } from "../../../../src/daw/dawState"
import { setEditorHoverLine, setScriptMatchesDAW } from "../../../../src/ide/ideState"

window.d3 = d3
window.ResizeObserver = ResizeObserver

vi.mock("react-i18next")
vi.mock("../../../../src/app/audiolibrary")
vi.mock("../../../../src/data/recommendationData")

function tracksWithClipOnLine(line) {
    return [
        { clips: [], effects: {}, visible: true },
        {
            clips: [{
                filekey: "SOUND_A", measure: 1, start: 1, end: 2, track: 1,
                sourceLine: line, loopChild: false, loop: false, scale: 1, silence: 0,
            }],
            effects: {},
            visible: true,
        },
    ]
}

beforeEach(() => {
    store.dispatch(setPlayLength(4))
    store.dispatch(setTracks(tracksWithClipOnLine(5)))
})

it("applies source-highlight when editorHoverLine matches clip sourceLine", async () => {
    store.dispatch(setScriptMatchesDAW(true))
    store.dispatch(setEditorHoverLine(5))

    const { container } = render(<Provider store={store}><DAW /></Provider>)
    const clip = await waitFor(() => {
        const el = container.querySelector(".dawAudioClipContainer")
        if (!el) throw new Error("clip not rendered yet")
        return el
    })
    expect(clip.classList.contains("source-highlight")).toBe(true)
})

it("does not apply source-highlight when line doesn't match", async () => {
    store.dispatch(setScriptMatchesDAW(true))
    store.dispatch(setEditorHoverLine(99))

    const { container } = render(<Provider store={store}><DAW /></Provider>)
    const clip = await waitFor(() => {
        const el = container.querySelector(".dawAudioClipContainer")
        if (!el) throw new Error("clip not rendered yet")
        return el
    })
    expect(clip.classList.contains("source-highlight")).toBe(false)
})

it("does not apply source-highlight when scriptMatchesDAW is false", async () => {
    store.dispatch(setScriptMatchesDAW(false))
    store.dispatch(setEditorHoverLine(5))

    const { container } = render(<Provider store={store}><DAW /></Provider>)
    const clip = await waitFor(() => {
        const el = container.querySelector(".dawAudioClipContainer")
        if (!el) throw new Error("clip not rendered yet")
        return el
    })
    expect(clip.classList.contains("source-highlight")).toBe(false)
})
