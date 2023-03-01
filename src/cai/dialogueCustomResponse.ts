import { CAIMessage } from "./caiState"
import { explainError } from "./dialogue"

export async function handleNodePayload(dialogue: any, customMessage: any) {
    if (customMessage.type !== "node") {
        throw new Error("Invalid custom message type")
    }
    const text = await dialogue.processUtterance(explainError())
    return {
        sender: "CAI",
        text: text,
        date: Date.now(),
    } as CAIMessage
}

export async function handleFaqExamplePayload(dialogue: any, customMessage: any) {
    const FAQ_EXAMPLES: any = {
        fitMedia: "fitMedia(HIPHOP_SYNTHPLUCKLEAD_005, 1, 1, 5)",
        "for loop": "for example, this code:\r\n\r\nfor measure in range(1, 5):\r\n    makeBeat(OS_SNARE03, 1, measure, \"0---0---0-0-0---\")\r\n\r\nputs the same beat in measures 1-5 on track 1",
        "custom functions": "def sectionA(start, end):\r\n    fitMedia(melody2, 1, start, end)\r\n    fitMedia(brass1, 2, start, end)\r\n    setEffect(2, VOLUME, GAIN, -20, start, -10, end)\r\nsectionA(1,5)",
        makeBeat: "makeBeat(DUBSTEP_FILTERCHORD_002, 1, 1, \"-00-00+++00--0-0\")\r\nmakeBeat(OS_CLOSEDHAT01, 2, 1, \"0--0--000--00-0-\")",
        conditional: "a = readInput(\"Do you like hip-hop music? Yes/No.\")\r\n\r\nif (a == \"yes\" or a == \"Yes\" or a == \"YES\"):\r\n    print(\"Hip-hop it is!\")\r\n    fitMedia(YG_NEW_HIP_HOP_ARP_1, 1, 1, 9)\r\nelse:\r\n    print(\"Ok, here is some funk.\")\r\nfitMedia(YG_NEW_FUNK_ELECTRIC_PIANO_4, 1, 1, 9)",
        userInput: "answer = readInput(\"What tempo would you like for your music? Choose a number between 45 and 220\")\r\n# converting to a number\r\ntempo = int(answer)\r\n\r\n# setting the tempo\r\nsetTempo(tempo)",
        setEffect: "something like setEffect(1, VOLUME, GAIN, 2)",
        setTempo: "for example\r\nsetTempo(120)\r\nsets the tempo to 120",
    }
    if (customMessage.type !== "faq_example") {
        throw new Error("Invalid custom message type")
    }
    return {
        sender: "CAI",
        text: dialogue.processUtterance(FAQ_EXAMPLES[customMessage.FAQType]),
        date: Date.now(),
    } as CAIMessage
}
