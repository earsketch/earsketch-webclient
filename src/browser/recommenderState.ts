import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "../reducers"

interface RecommenderState {
    recommendations: string[],
    input: string[],
    genres: string[],
    instruments: string[],
    keys: string[],
    artists: string[],
    typeInformation: {
        labels: {
            [key: string]: string
        }
        descriptions: {
            [key: string]: string
        }
    }
    typeIDs: string[],
}
const recommenderSlice = createSlice({
    name: "recommender",
    initialState: {
        recommendations: [],
        input: [],
        genres: [],
        instruments: [],
        keys: [],
        artists: [],
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
        setInput(state, { payload }) {
            state.input = payload
        },
        setGenres(state, { payload }) {
            state.genres = payload
        },
        setInstruments(state, { payload }) {
            state.instruments = payload
        },
        setKeys(state, { payload }) {
            state.keys = payload
        },
        setArtists(state, { payload }) {
            state.artists = payload
        },
    },
})

export default recommenderSlice.reducer
export const {
    setRecommendations,
    resetRecommendations,
    setInput,
    setGenres,
    setInstruments,
    setKeys,
    setArtists,
} = recommenderSlice.actions

export const selectRecommendations = (state: RootState) => state.recommender.recommendations

export const selectInput = (state: RootState) => state.recommender.input

export const selectGenres = (state: RootState) => state.recommender.genres

export const selectInstruments = (state: RootState) => state.recommender.instruments

export const selectKeys = (state: RootState) => state.recommender.keys

export const selectArtists = (state: RootState) => state.recommender.artists
