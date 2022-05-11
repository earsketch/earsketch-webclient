import store from "../reducers"
import * as scripts from "../browser/scriptsState"
import * as tabs from "../ide/tabState"
import * as recommenderState from "../browser/recommenderState"
import * as recommender from "./recommender"
import reporter from "./reporter"

// Lists of recommendations for Google Analytics data collection, Spring 2022.
const recommendationHistory: string[] = []
const recommendationUsageHistory: string[] = []

export function reloadRecommendations() {
    const activeTabID = tabs.selectActiveTabID(store.getState())!
    const allScripts = scripts.selectAllScripts(store.getState())
    // Get the modified / unsaved script.
    const script = allScripts[activeTabID]
    if (!script) return
    let input = recommender.addRecInput([], script)

    input.forEach((sound: string) => {
        if (recommendationHistory.includes(sound)) {
            if (!recommendationUsageHistory.includes(sound)) {
                reporter.recommendationUsed(sound)
                recommendationUsageHistory.push(sound)
            }
        }
    })

    let res = [] as any[]
    if (input.length === 0) {
        const filteredScripts = Object.values(scripts.selectFilteredActiveScripts(store.getState()))
        if (filteredScripts.length) {
            const lim = Math.min(5, filteredScripts.length)
            for (let i = 0; i < lim; i++) {
                input = recommender.addRecInput(input, filteredScripts[i])
            }
        }
    }
    // If there are no samples to use for recommendation, just use something random so the window isn't blank.
    if (input.length === 0) {
        input = recommender.addRandomRecInput(input)
    }
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(v => {
        res = recommender.recommend(res, input, ...v)
    })

    res.forEach((sound: string) => {
        if (!recommendationHistory.includes(sound)) {
            recommendationHistory.push(sound)
            reporter.recommendation(sound)
        }
    })
    store.dispatch(recommenderState.setRecommendations(res))
}
