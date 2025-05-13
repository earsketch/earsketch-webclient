import audiokeysURL from "./audiokeys_recommendations.json"
import beatDataURL from "./beat_similarity_indices.json"
import beatTimestampsURL from "./beat_timestamps.json"

export async function getRecommendationData() {
    return (await fetch(audiokeysURL)).json()
}

export async function getBeatData() {
    return (await fetch(beatDataURL)).json()
}

type BeatTimestampData = {
    beat_timestamps: number[],
    duration: number
}

let timestampDataPromise: Promise<{ [key: string]: BeatTimestampData }>
export async function getTimestampData() {
    if (timestampDataPromise) {
        return await timestampDataPromise
    }
    return (timestampDataPromise = fetch(beatTimestampsURL).then(r => r.json()))
}
