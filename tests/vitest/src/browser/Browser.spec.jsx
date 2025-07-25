import { beforeAll, expect, it, vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react" // component rendering
import { screen } from "@testing-library/dom" // find elements on screen
import "@testing-library/jest-dom/vitest" // assertions
import userEvent from "@testing-library/user-event" // clicking
import "../../AudioContextMock/AudioContext.mock" // jsdom has no AudioContext
import { Provider } from "react-redux" // redux
import store from "../../../../src/reducers" // earsketch redux store
import { Browser } from "../../../../src/browser/Browser"
import * as request from "../../../../src/request"
import * as soundsThunks from "../../../../src/browser/soundsThunks"
import * as scriptsState from "../../../../src/browser/scriptsState"

// mocked modules
vi.mock("i18next")
vi.mock("react-i18next")
vi.mock("../../../../src/app/audiolibrary")
vi.mock("../../../../src/request")
vi.mock("../../../../src/data/recommendationData")

// prepare redux state
let nSounds
let nRegScripts
let nDelScripts

beforeAll(async () => {
    store.dispatch(soundsThunks.getStandardSounds()) // loads mocked sound library
    nSounds = soundsThunks.getStandardSounds().length + 1

    const scripts = await request.getAuth("/scripts/owned") // loads mocked scripts
    store.dispatch(scriptsState.setRegularScripts(scripts))
    nRegScripts = 2
    nDelScripts = 0
})

it("shows and hides content browsers on tab change", async () => {
    const { container } = render(<Provider store={store}><Browser /></Provider>)
    // confirm it renders with mocked data
    await screen.findAllByText("numSounds")
    // TODO: we should search by number of sound Clip components rendered in the list
    await screen.findAllByText("SCRIPTBROWSER.MYSCRIPTS (" + nRegScripts + ")")
    await screen.findAllByText("SCRIPTBROWSER.DELETEDSCRIPTS (" + nDelScripts + ")")

    // locate elements for our test
    const buttonSoundsBrowser = screen.getByText("SOUNDBROWSER.TITLE")
    const buttonScriptsBrowser = screen.getByText("SCRIPT")
    const buttonApiBrowser = screen.getByText("API")

    const divSoundBrowser = container.querySelector("#panel-0").parentNode
    const divScriptBrowser = container.querySelector("#panel-1").parentNode
    const divApiBrowser = container.querySelector("#panel-2").parentNode

    // click tabs and verify background panes become hidden
    // note: toBeVisible() is not applicable here because we do not insert our css into jsdom
    userEvent.click(buttonSoundsBrowser)
    expect(divSoundBrowser).not.toHaveClass("hidden")
    expect(divScriptBrowser).toHaveClass("hidden")
    expect(divApiBrowser).toHaveClass("hidden")

    userEvent.click(buttonScriptsBrowser)
    expect(divSoundBrowser).toHaveClass("hidden")
    expect(divScriptBrowser).not.toHaveClass("hidden")
    expect(divApiBrowser).toHaveClass("hidden")

    userEvent.click(buttonApiBrowser)
    expect(divSoundBrowser).toHaveClass("hidden")
    expect(divScriptBrowser).toHaveClass("hidden")
    expect(divApiBrowser).not.toHaveClass("hidden")
})
