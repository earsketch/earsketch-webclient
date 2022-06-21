// For Jest, we just import the data directly. (No concern about bundle size.)
import data from "../../data/audiokeys_recommendations.json"

export async function getRecommendationData() {
    return data
}
