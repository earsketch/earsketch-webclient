/* eslint-env jest */
import React from "react"
import ReactDOM from "react-dom"
import { act } from "react-dom/test-utils"
import pretty from "pretty"
import "../mocks/AudioContext.mock"
import { AdminWindow } from "../../../scripts/src/app/AdminWindow"

jest.mock("../../../scripts/src/app/userProject")
jest.mock("../../../scripts/src/app/websocket")
jest.mock("../../../scripts/src/Utils")

let container

beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
})

afterEach(() => {
    document.body.removeChild(container)
    container = null
})

it("can render", () => {
    act(() => {
        ReactDOM.render(<AdminWindow close={() => {}} />, container)
    })
    expect(
        pretty(container.innerHTML)
    ).toMatchInlineSnapshot(`
"<div class=\\"modal-header\\">
  <h3>Admin Window</h3>
</div>
<div class=\\"modal-body\\">
  <div class=\\"modal-section-body\\">
    <div class=\\"mx-2 px-4 pb-1\\">
      <div class=\\"font-bold text-3xl p-2\\">Manage Admins</div>
      <div class=\\"p-2 text-left w-full border border-gray-300 h-40 bg-grey-light overflow-y-scroll\\"></div>
    </div>
    <div class=\\"m-2 p-4 py-1\\">
      <form class=\\"flex items-center\\"><input type=\\"text\\" class=\\"m-2 w-1/4 form-control\\" placeholder=\\"Username\\" required=\\"\\"><input type=\\"submit\\" class=\\"btn btn-primary\\" value=\\"ADD ADMIN\\"></form>
    </div>
  </div>
  <div class=\\"modal-section-body\\">
    <div class=\\"m-2 p-4 border-t border-gray-400\\">
      <div class=\\"font-bold text-3xl p-2\\">Send Broadcast</div>
      <form><input type=\\"text\\" class=\\"m-2 w-10/12 form-control\\" placeholder=\\"Message\\" required=\\"\\" maxlength=\\"500\\">
        <div class=\\"flex items-center\\"><input type=\\"text\\" class=\\"m-2 w-1/4 form-control\\" placeholder=\\"Hyperlink (optional)\\" maxlength=\\"500\\"><input type=\\"number\\" class=\\"m-2 w-1/4 form-control\\" placeholder=\\"Days until expiration\\" min=\\"1\\" max=\\"14\\"><input type=\\"submit\\" class=\\"btn btn-primary\\" value=\\"SEND\\"></div>
      </form>
    </div>
  </div>
  <div class=\\"modal-section-body\\">
    <div class=\\"m-2 p-4 border-t border-gray-400\\">
      <div class=\\"font-bold text-3xl p-2\\">Password Change</div>
      <form class=\\"flex items-center\\"><input type=\\"text\\" class=\\"m-2 w-1/4 form-control\\" placeholder=\\"Username or Email\\" required=\\"\\"><input type=\\"submit\\" class=\\"btn btn-primary\\" value=\\"SEARCH USERS\\"></form>
    </div>
  </div>
</div>
<div>mocked footer for testing</div>"
`)
})
