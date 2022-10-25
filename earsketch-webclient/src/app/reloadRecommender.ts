import store from "../reducers"
import { isEqual } from "lodash"
import * as scripts from "../browser/scriptsState"
import * as tabs from "../ide/tabState"
import * as sounds from "../browser/soundsState"
import * as recommenderState from "../browser/recommenderState"
import * as recommender from "./recommender"
import reporter from "./reporter"

// Lists of recommendations for Google Analytics data collection, Spring 2022.
const recommendationHistory: string[] = []
const recommendationUsageHistory: string[] = []

export async function reloadRecommendations() {
    const activeTabID = tabs.selectActiveTabID(store.getState())!
    const allScripts = scripts.selectAllScripts(store.getState())
    const { genres, instruments, keys, artists } = sounds.selectFilters(store.getState())

    // Get the modified / unsaved script.
    const script = allScripts[activeTabID]
    if (!script || Object.keys(recommender.soundDict).length === 0) return
    let input: string [] = recommender.addRecInput([], script)

    // If there are no changes to input, and the window isn't blank, don't generate new recommendations.
    if (isEqual(input, recommenderState.selectInput(store.getState())) &&
        recommenderState.selectRecommendations(store.getState()).length > 0 &&
        genres === recommenderState.selectGenres(store.getState()) &&
        instruments === recommenderState.selectInstruments(store.getState()) &&
        keys === recommenderState.selectKeys(store.getState()) &&
        artists === recommenderState.selectArtists(store.getState())) {
        return
    }

    store.dispatch(recommenderState.setInput(input))
    store.dispatch(recommenderState.setGenres(genres))
    store.dispatch(recommenderState.setInstruments(instruments))
    store.dispatch(recommenderState.setKeys(keys))
    store.dispatch(recommenderState.setArtists(artists))

    input.forEach((sound: string) => {
        if (recommendationHistory.includes(sound)) {
            if (!recommendationUsageHistory.includes(sound)) {
                reporter.recommendationUsed(sound)
                recommendationUsageHistory.push(sound)
            }
        }
    })

    let res: string [] = []
    if (input.length === 0) {
        const filteredScripts = Object.values(scripts.selectFilteredActiveScripts(store.getState()))
        if (filteredScripts.length) {
            const lim = Math.min(5, filteredScripts.length)
            for (let i = 0; i < lim; i++) {
                input = recommender.addRecInput([...input], filteredScripts[i])
            }
        }
    }

    // If there are no samples to use for recommendation, just use something random so the window isn't blank.
    if (!input || input.length === 0) {
        input = recommender.addRandomRecInput([])
    }

    const keyNumbers = keys.map((key) => { return recommender.keyLabelToNumber(key) })

    for (const [coUsage, similarity] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        res = res.concat(await recommender.recommend(input, coUsage, similarity, [...genres], [...instruments], res, 3, keyNumbers, [...artists]))
    }

    res.forEach((sound: string) => {
        if (!recommendationHistory.includes(sound)) {
            recommendationHistory.push(sound)
            reporter.recommendation(sound)
        }
    })
    store.dispatch(recommenderState.setRecommendations(res))
}
