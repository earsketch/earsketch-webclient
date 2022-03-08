/* eslint-env jest */
import React from "react"
import { render } from "@testing-library/react" // component rendering
import { screen } from "@testing-library/dom" // find elements on screen
import "@testing-library/jest-dom" // assertions
import userEvent from "@testing-library/user-event" // clicking

test("uses jest-dom", () => {
    document.body.innerHTML = `
    <span data-testid="not-empty"><span data-testid="empty"></span></span>
    <div data-testid="visible">Visible Example</div>
    `

    expect(screen.queryByTestId("not-empty")).not.toBeEmptyDOMElement()
    expect(screen.getByText("Visible Example")).toBeVisible()
})

test("uses jest-dom and userEvent.click", () => {
    render(
        <div>
            <label htmlFor="checkbox">Check</label>
            <input id="checkbox" type="checkbox" />
        </div>
    )

    userEvent.click(screen.getByText("Check"))
    expect(screen.getByLabelText("Check")).toBeChecked()
})
