// TODO: Temporarily including these types from https://github.com/nathancahill/split/blob/master/packages/react-split/index.d.ts
//       because they don't seem to be included correctly in the NPM package.
import React from "react"
import { Options } from "split.js"

export interface SplitProps {
    sizes?: Options["sizes"]
    minSize?: Options["minSize"]
    maxSize?: Options["maxSize"]
    expandToMin?: Options["expandToMin"]
    gutterSize?: Options["gutterSize"]
    gutterAlign?: Options["gutterAlign"]
    snapOffset?: Options["snapOffset"]
    dragInterval?: Options["dragInterval"]
    direction?: Options["direction"]
    cursor?: Options["cursor"]
    gutter?: Options["gutter"]
    elementStyle?: Options["elementStyle"]
    gutterStyle?: Options["gutterStyle"]
    onDrag?: Options["onDrag"]
    onDragStart?: Options["onDragStart"]
    onDragEnd?: Options["onDragEnd"]
    collapsed?: Number
    className?: string
    children: React.ReactNode
}

declare class Split extends React.Component<SplitProps, any> {}

export default Split
