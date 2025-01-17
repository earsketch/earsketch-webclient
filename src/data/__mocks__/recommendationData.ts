// For Jest, we just import the data directly. (No concern about bundle size.)
import recommendationData from "../audiokeys_recommendations.json"
import beatData from "../beat_similarity_indices.json"

export async function getRecommendationData() {
    return recommendationData
}

export async function getBeatData() {
    return beatData
}
