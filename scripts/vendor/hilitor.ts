// Original JavaScript code by Chirp Internet: www.chirp.com.au
// Please acknowledge use of this code by including this header.

const COLORS = ["#ff6", "#a0ffff", "#9f9", "#f99", "#f6f"]

export class Hilitor {
    colorIdx = 0
    openLeft = false
    openRight = false
    wordColor = Object.create(null)
    targetNode: HTMLElement
    hiliteTag: string
    matchRegex: RegExp
    skipTags: RegExp

    constructor(id: string, tag?: string) {
        this.targetNode = document.getElementById(id) || document.body
        this.hiliteTag = tag || "EM"
        this.skipTags = new RegExp("^(?:" + this.hiliteTag + "|SCRIPT|FORM|SPAN)$")
    }

    setMatchType(type: "left" | "right" | "open") {
        switch (type) {
            case "left":
                this.openLeft = false
                this.openRight = true
                break
            case "right":
                this.openLeft = true
                this.openRight = false
                break
            case "open":
                this.openLeft = this.openRight = true
                break
            default:
                this.openLeft = this.openRight = false
        }
    }

    setRegex(input: string) {
        input = input.replace(/^[^\w]+|[^\w]+$/g, "").replace(/[^\w'-]+/g, "|")
        input = input.replace(/^\||\|$/g, "")
        if (input) {
            let re = "(" + input + ")"
            if (!this.openLeft) re = "\\b" + re
            if (!this.openRight) re = re + "\\b"
            this.matchRegex = new RegExp(re, "i")
            return true
        }
        return false
    }

    // recursively apply word highlighting
    hiliteWords(node: Node) {
        if (node === undefined || !node) return
        if (!this.matchRegex) return
        if (this.skipTags.test(node.nodeName)) return

        node.childNodes.forEach(child => this.hiliteWords(child))
        if (node.nodeType === 3) { // NODE_TEXT
            let nv, regs
            if ((nv = node.nodeValue) && (regs = this.matchRegex.exec(nv))) {
                if (!this.wordColor[regs[0].toLowerCase()]) {
                    this.wordColor[regs[0].toLowerCase()] = COLORS[this.colorIdx++ % COLORS.length]
                }

                const match = document.createElement(this.hiliteTag)
                match.appendChild(document.createTextNode(regs[0]))
                match.style.backgroundColor = this.wordColor[regs[0].toLowerCase()]
                match.style.fontStyle = "inherit"
                match.style.color = "#000"

                const after = (node as Text).splitText(regs.index)
                after.nodeValue = after.nodeValue!.substring(regs[0].length)
                node.parentNode!.insertBefore(match, after)
            }
        };
    }

    // remove highlighting
    remove() {
        const arr = document.getElementsByTagName(this.hiliteTag)
        let el
        while (arr.length && (el = arr[0])) {
            const parent = el.parentNode!
            parent.replaceChild(el.firstChild!, el)
            parent.normalize()
        }
    }

    // start highlighting at target node
    apply(input: string) {
        this.remove()
        if (input === undefined || !input) return
        if (this.setRegex(input)) {
            this.hiliteWords(this.targetNode)
        }
    }
}
