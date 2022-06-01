/* eslint-env jest */
import React from "react"
import { render } from "@testing-library/react" // component rendering
import { screen } from "@testing-library/dom" // find elements on screen
import "@testing-library/jest-dom" // assertions
import userEvent from "@testing-library/user-event" // clicking
import "../../AudioContextMock/AudioContext.mock" // jsdom has no AudioContext
import { Provider } from "react-redux" // redux
import store from "../../../../scripts/src/reducers" // earsketch redux store
import { Browser } from "../../../../scripts/src/browser/Browser"
import * as request from "../../../../scripts/src/request"
import * as soundsThunks from "../../../../scripts/src/browser/soundsThunks"
import * as scriptsState from "../../../../scripts/src/browser/scriptsState"

// mocked modules
jest.mock("react-i18next")
jest.mock("../../../../scripts/src/app/audiolibrary")
jest.mock("../../../../scripts/src/request")

// prepare redux state
let nSounds
let nRegScripts
let nDelScripts

beforeAll(async () => {
    store.dispatch(soundsThunks.getDefaultSounds()) // loads mocked sound library
    nSounds = soundsThunks.getDefaultSounds().length + 1

    const scripts = await request.getAuth("/scripts/owned") // loads mocked scripts
    store.dispatch(scriptsState.setRegularScripts(scripts))
    nRegScripts = 2
    nDelScripts = 0
})

// shared logic for rendering the components
beforeEach(async () => {
    render(<Provider store={store}><Browser /></Provider>)
    // confirm it renders with mocked data
    await screen.findAllByText("SOUNDBROWSER.TITLE.COLLECTION (" + nSounds + ")")
    await screen.findAllByText("SCRIPTBROWSER.MYSCRIPTS (" + nRegScripts + ")")
    await screen.findAllByText("SCRIPTBROWSER.DELETEDSCRIPTS (" + nDelScripts + ")")
})

it("renders with mocked data", async () => {
    // automatically tested by the beforeEach()
})

it("shows and hides content browsers on tab change", async () => {
    // locate elements for our test
    const buttonSoundsBrowser = screen.getByText("SOUNDBROWSER.TITLE")
    const buttonScriptsBrowser = screen.getByText("SCRIPT")
    const buttonApiBrowser = screen.getByText("API")
    let elm = screen.getByText("SOUNDBROWSER.TITLE.COLLECTION (" + nSounds + ")")
    const divSoundBrowser = elm.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
    elm = screen.getByText("SCRIPTBROWSER.MYSCRIPTS (" + nRegScripts + ")")
    const divScriptBrowser = elm.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
    elm = screen.getByText("analyze")
    const divApiBrowser = elm.parentNode.parentNode.parentNode.parentNode

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
