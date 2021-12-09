import React from "react"
import renderer from "react-test-renderer"
import SpecialLink from "./SpecialLink"

describe("Link custom component", () => {
    it("renders correctly", () => {})

    // demo of react-test-renderer
    const component = renderer.create(
        <SpecialLink page="http://www.gatech.edu">Georgia Tech</SpecialLink>
    )
    let tree = component.toJSON()

    // demo of jest snapshot testing
    expect(tree).toMatchInlineSnapshot(`
<a
  className="normal"
  href="http://www.gatech.edu"
  onMouseEnter={[Function]}
  onMouseLeave={[Function]}
>
  Georgia Tech
</a>
`)
})
