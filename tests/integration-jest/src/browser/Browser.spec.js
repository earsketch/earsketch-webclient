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
import * as soundState from "../../../../scripts/src/browser/soundsState"
import * as scriptsState from "../../../../scripts/src/browser/scriptsState"
import * as userProject from "../../../../scripts/src/app/userProject"

// mocked modules
jest.mock("react-i18next")
jest.mock("../../../../scripts/src/app/audiolibrary")
jest.mock("../../../../scripts/src/app/userProject")

// prepare redux state
let nSounds
let nRegScripts
beforeAll(async () => {
    store.dispatch(soundState.getDefaultSounds()) // loads mocked sound library
    nSounds = soundState.getDefaultSounds().length + 1

    const scripts = await userProject.getAuth("/scripts/owned") // loads mocked scripts
    store.dispatch(scriptsState.setRegularScripts(scripts))
    nRegScripts = 2
})

// test content pane
it("renders with mocked data", async () => {
    render(<Provider store={store}><Browser /></Provider>)
    await screen.findByText("SCRIPTBROWSER.DELETEDSCRIPTS (0)")
})
it("shows and hides content browsers on tab change", async () => {
    // render the components
    render(<Provider store={store}><Browser /></Provider>)
    await screen.findByText("SCRIPTBROWSER.DELETEDSCRIPTS (0)")

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

    // expect panes to be hidden after clicking the different tabs
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

// test sound browser
it.skip("folds and unfolds sound folder", async () => {})
it.skip("marks favorites on click", async () => {})
it.skip("previews sounds with play button", async () => {})

// test script browser
it.skip("populates scripts", async () => {})
it.skip("populates shared scripts", async () => {})
it.skip("opens script on click", async () => {})
it.skip("opens context menu on right-click", async () => {})

// test api browser
it.skip("folds and unfolds api descriptions", async () => {})
