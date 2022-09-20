import beatDataURL from "../data/top_indices.json"
import beatMetaURL from "../data/top_indices_meta.json"

export async function getBeats() {
    return (await fetch(beatDataURL)).json()
}

export async function getBeatsMeta() {
    return (await fetch(beatMetaURL)).json()
}
