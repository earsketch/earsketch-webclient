import audiokeysURL from "../data/audiokeys_recommendations.json"

export async function getRecommendationData() {
    return (await fetch(audiokeysURL)).json()
}
