import { beforeEach, expect, it, vi } from "vitest"
import { Provider } from "react-redux"
import { render, waitFor } from "@testing-library/react"
import d3 from "d3"

import "../../AudioContextMock/AudioContext.mock"
import store from "../../../../src/reducers"
import { DAW } from "../../../../src/daw/DAW"
import { setTracks, setPlayLength } from "../../../../src/daw/dawState"
import { setEditorCursorLine, setScriptMatchesDAW } from "../../../../src/ide/ideState"

window.d3 = d3

// jsdom has no ResizeObserver. The real resize-observer-polyfill captures a
// reference to the native requestAnimationFrame at import time and runs its
// own internal setTimeout/rAF polling loop outside of Vitest's control, which
// can fire after this file's jsdom environment is torn down (a flaky
// "Cannot read properties of null (reading '_location')" crash, more likely
// on slower/throttled CI). This test only asserts on clip CSS classes, not
// the DAW's resize-driven title text, so a no-op stub is sufficient and
// avoids scheduling any real timers.
window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
}

vi.mock("react-i18next")
vi.mock("../../../../src/app/audiolibrary")
vi.mock("../../../../src/data/recommendationData")

function tracksWithClipOnLine(line, callStack) {
    return [
        { clips: [], effects: {}, visible: true },
        {
            clips: [{
                filekey: "SOUND_A", measure: 1, start: 1, end: 2, track: 1,
                sourceLines: callStack ?? [line],
                loopChild: false, loop: false, scale: 1, silence: 0,
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

it("applies source-highlight when editorCursorLine matches a frame in sourceLines", async () => {
    store.dispatch(setScriptMatchesDAW(true))
    store.dispatch(setEditorCursorLine(5))

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
    store.dispatch(setEditorCursorLine(99))

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
    store.dispatch(setEditorCursorLine(5))

    const { container } = render(<Provider store={store}><DAW /></Provider>)
    const clip = await waitFor(() => {
        const el = container.querySelector(".dawAudioClipContainer")
        if (!el) throw new Error("clip not rendered yet")
        return el
    })
    expect(clip.classList.contains("source-highlight")).toBe(false)
})

it("highlights on any line in the call stack (wrapper-function case)", async () => {
    // Clip's innermost line is 3, but it was called from line 7.
    store.dispatch(setTracks(tracksWithClipOnLine(3, [3, 7])))
    store.dispatch(setScriptMatchesDAW(true))

    const select = container => container.querySelector(".dawAudioClipContainer")

    // Hovering the innermost line (inside the wrapper) highlights.
    store.dispatch(setEditorCursorLine(3))
    const first = render(<Provider store={store}><DAW /></Provider>)
    await waitFor(() => {
        const el = select(first.container)
        if (!el) throw new Error("clip not rendered yet")
        return el
    })
    expect(select(first.container).classList.contains("source-highlight")).toBe(true)
    first.unmount()

    // Hovering the call site (line 7) also highlights, since 7 is in the stack.
    store.dispatch(setEditorCursorLine(7))
    const second = render(<Provider store={store}><DAW /></Provider>)
    await waitFor(() => {
        const el = select(second.container)
        if (!el) throw new Error("clip not rendered yet")
        return el
    })
    expect(select(second.container).classList.contains("source-highlight")).toBe(true)
    second.unmount()

    // Unrelated line — no highlight.
    store.dispatch(setEditorCursorLine(99))
    const third = render(<Provider store={store}><DAW /></Provider>)
    await waitFor(() => {
        const el = select(third.container)
        if (!el) throw new Error("clip not rendered yet")
        return el
    })
    expect(select(third.container).classList.contains("source-highlight")).toBe(false)
})
