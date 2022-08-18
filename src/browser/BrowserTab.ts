export const BrowserTabType = {
    Sound: 0,
    Script: 1,
    API: 2,
} as const
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type BrowserTabType = typeof BrowserTabType[keyof typeof BrowserTabType]
