import { createSlice } from "@reduxjs/toolkit"

interface RecommenderState {
    recommendations: string[],
    typeInformation: {
        labels: {
            [key: string]: string
        }
        descriptions: {
            [key: string]: string
        }
    }
    typeIDs: string[]
}
const recommenderSlice = createSlice({
    name: "recommender",
    initialState: {
        recommendations: [],
        typeInformation: {
            labels: {
                others: "Others Like You Use These Sounds",
                fit: "Sounds That Fit Your Script",
                discover: "Discover Different Kinds of Sounds",
                lucky: "Are You Feeling Lucky?",
            },
            descriptions: {
                others: "Recommendations of similar and commonly used sounds with the ones in your script",
                fit: "Recommendations of sounds that sound similar but are rarely used with the ones in your script",
                discover: "Recommendations of sounds that sound different but are commonly used with the ones in your script",
                lucky: "Recommendations of sounds that are different and rarely used with the ones in your script",
            },
        },
        typeIDs: ["others", "fit", "discover", "lucky"],
    } as RecommenderState,
    reducers: {
        setRecommendations(state, { payload }) {
            state.recommendations = payload
        },
        resetRecommendations(state) {
            state.recommendations = []
        },
    },
})

export default recommenderSlice.reducer
export const {
    setRecommendations,
    resetRecommendations,
} = recommenderSlice.actions
