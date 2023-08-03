// Skulpt AST-walking code; based on https://gist.github.com/acbart/ebd2052e62372df79b025aee60ff450e.
const iterFields = (node: any) => {
    // Return a list of values for each field in `node._fields` that is present on `node`.
    // Notice we skip every other field, since the odd elements are accessor functions.
    const valueList = []
    for (let i = 0; i < node._fields.length; i += 2) {
        const field = node._fields[i]
        if (field in node) {
            valueList.push(node[field])
        }
    }
    return valueList
}

export class NodeVisitor {
    // Visit a node.
    visit(node: any) {
        const methodName = `visit${node._astname}`
        const visitor: Function = (this as any)[methodName] ?? this.genericVisit
        return visitor.apply(this, [node])
    }

    // Called if no explicit visitor function exists for a node.
    genericVisit(node: any) {
        const fieldList = iterFields(node)
        for (const value of Object.values(fieldList)) {
            if (Array.isArray(value)) {
                for (const subvalue of value) {
                    if (subvalue._astname !== undefined) {
                        this.visit(subvalue)
                    }
                }
            } else if (value?._astname !== undefined) {
                this.visit(value)
            }
        }
    }
}
