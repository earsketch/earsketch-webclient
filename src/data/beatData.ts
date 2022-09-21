import beatDataURL from "../data/beat_similarity_indices.json"

export async function getBeatData() {
    return (await fetch(beatDataURL)).json()
}
