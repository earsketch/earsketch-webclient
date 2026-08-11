export const extensionCatalog = [
    {
        id: "code-viz",
        name: "CodeViz",
        descriptionKey: "extension.catalog.codeVizDescription",
        iconClass: "icon-code",
        url: "http://localhost:5173",
    },
    {
        id: "tip-of-the-day",
        name: "Tip of the Day",
        descriptionKey: "extension.catalog.tipOfTheDayDescription",
        iconClass: "icon-star",
        url: "http://localhost:5174",
    },
    {
        id: "chatbot",
        name: "EarSketch Chatbot",
        descriptionKey: "extension.catalog.chatbotDescription",
        iconClass: "icon-bubbles",
        url: "https://emlbot1.lmc.gatech.edu/",
    },
] as const

export type CatalogExtension = typeof extensionCatalog[number]
export type CatalogExtensionId = CatalogExtension["id"]
