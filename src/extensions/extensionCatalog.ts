export const extensionCatalog = [
    {
        id: "code-viz",
        name: "CodeViz",
        descriptionKey: "extension.catalog.codeVizDescription",
        iconClass: "icon-code",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/code-viz/",
    },
    {
        id: "tip-of-the-day",
        name: "Tip of the Day",
        descriptionKey: "extension.catalog.tipOfTheDayDescription",
        iconClass: "icon-star",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/tip-of-the-day/",
    },
    {
        id: "chatbot",
        name: "EarSketch Chatbot",
        descriptionKey: "extension.catalog.chatbotDescription",
        iconClass: "icon-bubbles",
        url: "https://emlbot1.lmc.gatech.edu/",
    },
    {
        id: "sequencer",
        name: "Sequencer",
        descriptionKey: "extension.catalog.sequencerDescription",
        iconClass: "icon-playlist",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/sequencer/",
    },
    {
        id: "code-score",
        name: "Code Score",
        descriptionKey: "extension.catalog.codeScoreDescription",
        iconClass: "icon-music",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/code-score/",
    },
    {
        id: "hydra-viz",
        name: "Hydra Viz",
        descriptionKey: "extension.catalog.hydraVizDescription",
        iconClass: "icon-eye",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/hydra-viz/",
    },
] as const

export type CatalogExtension = typeof extensionCatalog[number]
export type CatalogExtensionId = CatalogExtension["id"]
