export const extensionCatalog = [
    {
        id: "code-viz",
        name: "CodeViz",
        iconClass: "icon-code",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/code-viz/",
    },
    {
        id: "tip-of-the-day",
        name: "Tip of the Day",
        iconClass: "icon-star",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/tip-of-the-day/",
    },
    {
        id: "chatbot",
        name: "EarSketch Chatbot",
        iconClass: "icon-bubbles",
        url: "https://emlbot1.lmc.gatech.edu/",
    },
    {
        id: "sequencer",
        name: "Sequencer",
        iconClass: "icon-playlist",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/sequencer/",
    },
    {
        id: "code-score",
        name: "Code Score",
        iconClass: "icon-music",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/code-score/",
    },
    {
        id: "hydra-viz",
        name: "Hydra Viz",
        iconClass: "icon-eye",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/hydra-viz/",
    },
    {
        id: "teacher-pages",
        name: "Teacher Pages",
        iconClass: "icon-book",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/teacher-pages/",
    },
    {
        id: "jumping-jacks",
        name: "Jumping Jacks",
        iconClass: "icon-user",
        url: "https://earsketch-client-test.s3.us-east-1.amazonaws.com/extensions/jumping-jacks/",
    },
] as const

export type CatalogExtension = typeof extensionCatalog[number]
export type CatalogExtensionId = CatalogExtension["id"]

export const contentManagerExtensionIds: readonly CatalogExtensionId[] = [
    "hydra-viz",
    "jumping-jacks",
]
