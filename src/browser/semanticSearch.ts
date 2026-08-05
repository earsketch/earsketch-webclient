// CLAP text->audio search engine. Not wired into the app yet — test from the
// browser devtools console while the dev server is up:
//   const m = await import("/src/browser/semanticSearch.ts")
//   await m.audioSearchEngine.initialize()
//   await m.audioSearchEngine.search("chill lo-fi beat")
import { AutoTokenizer, ClapTextModelWithProjection, env } from "@xenova/transformers"

// Serve the model + wasm runtime from public/ instead of CDN/HuggingFace, so search works
// fully offline. allowRemoteModels is off so a path typo hard-fails instead of silently
// falling back to a ~500 MB download from HuggingFace.
env.allowLocalModels = true
env.allowRemoteModels = false
env.localModelPath = "/models/"
env.backends.onnx.wasm.wasmPaths = "/ort/"

const MODEL_ID = "Xenova/clap-htsat-unfused"

interface SearchResult {
    songId: number
    filename: string
    entityName: string
    similarity: number
}

interface SongData {
    filename: string
    path: string
    embedding?: number[]
    // The real EarSketch sound-library entity name for this clip, added by
    // tools/relabel_audio_embeddings.js via a (parent folder, filename) path match against the
    // library's own metadata. null for the ~5% of clips that script couldn't confidently match
    // (e.g. packs reorganized/removed from the library since the embeddings were computed).
    entityName?: string | null
}

interface LabelEmbedding {
    label: string
    embedding: number[]
}

type SongsDatabase = SongData[]

class AudioSearchEngine {
    private tokenizer: any = null
    private textModel: any = null
    private songsData: SongsDatabase | null = null
    private labelEmbeddings: LabelEmbedding[] = []
    private isReady: boolean = false
    private initPromise: Promise<void> | null = null

    async initialize(): Promise<void> {
        if (this.isReady) return
        if (this.initPromise) return this.initPromise
        this.initPromise = this._doInitialize().catch(error => {
            this.isReady = false
            this.initPromise = null // allow retrying instead of wedging on a stale rejected promise
            throw error
        })
        return this.initPromise
    }

    private async _doInitialize(): Promise<void> {
        // Purge any poisoned cache entries: transformers.js checks the "transformers-cache"
        // Cache Storage entry before the allowLocalModels guard runs, so if it ever probed
        // /models/... before those files existed, Vite's SPA fallback response (index.html,
        // status 200) may be cached there and served instead of the real JSON/ONNX files.
        if (typeof window.caches !== "undefined") {
            try {
                const transformersCache = await window.caches.open("transformers-cache")
                const keys = await transformersCache.keys()
                await Promise.all(keys.map(async (req) => {
                    const res = await transformersCache.match(req)
                    if (res?.headers.get("content-type")?.includes("text/html")) {
                        console.log("Purging poisoned cache entry:", req.url)
                        await transformersCache.delete(req)
                    }
                }))
            } catch (_e) {
                // Ignore errors (e.g. SecurityError in incognito/iframe)
            }
        }

        console.log("Loading tokenizer...")
        this.tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID)

        console.log("Loading text model...")
        this.textModel = await ClapTextModelWithProjection.from_pretrained(MODEL_ID)
        console.log("Text model loaded successfully")

        console.log("Loading audio embeddings...")
        this.songsData = await (await fetch("/embeddings/audio_embeddings.json")).json() as SongsDatabase
        console.log("Songs data loaded:", this.songsData.length, "songs")

        // Precomputed offline by tools/precompute_label_embeddings.js — avoids running ~15
        // sequential model forward passes (one per batch of labels) on every page load.
        // Re-run that script if public/embeddings/prompt_converters/*.json changes.
        console.log("Loading precomputed label embeddings...")
        this.labelEmbeddings = await (await fetch("/embeddings/label_embeddings.json")).json() as LabelEmbedding[]
        console.log(`Label embeddings ready (${this.labelEmbeddings.length} labels)`)

        this.isReady = true
        console.log(`Audio search engine ready with ${this.songsData.length} songs and ${this.labelEmbeddings.length} prompt labels`)
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0
        }

        return dotProduct / (magnitudeA * magnitudeB)
    }

    // Stage 1: map the free-form query to the closest training labels
    private findClosestLabels(queryEmbedding: number[], topK: number = 3): { label: string, embedding: number[], similarity: number }[] {
        return this.labelEmbeddings
            .map(l => ({ ...l, similarity: this.cosineSimilarity(queryEmbedding, l.embedding) }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
    }

    // Average a set of embedding vectors element-wise
    private averageEmbeddings(embeddings: number[][]): number[] {
        const dim = embeddings[0].length
        const avg = new Array(dim).fill(0)
        for (const emb of embeddings) {
            for (let i = 0; i < dim; i++) avg[i] += emb[i]
        }
        return avg.map(v => v / embeddings.length)
    }

    async search(query: string, topK: number = 20): Promise<SearchResult[]> {
        if (!this.isReady || !this.songsData) {
            throw new Error("Search engine not initialized. Call initialize() first.")
        }

        // Encode the raw query
        const textInputs = this.tokenizer([query], { padding: true, truncation: true })
        const modelOutput = await this.textModel(textInputs) as any
        const queryEmbedding = Array.from(modelOutput.text_embeds.data) as number[]

        // Stage 1: find the top-3 training labels closest to the query
        const topLabels = this.findClosestLabels(queryEmbedding, 3)
        console.log("Prompt conversion — top labels:", topLabels.map(l => `${l.label} (${l.similarity.toFixed(3)})`))

        // Stage 2: build a search embedding from the query + top labels (equal weight)
        const searchEmbedding = this.averageEmbeddings([
            queryEmbedding,
            ...topLabels.map(l => l.embedding),
        ])

        // Stage 3: score all audio embeddings against the composite search embedding
        const results: SearchResult[] = []
        this.songsData.forEach((songData, index) => {
            if (!songData.embedding || !songData.entityName) return
            const similarity = this.cosineSimilarity(searchEmbedding, songData.embedding)
            results.push({ songId: index, filename: songData.filename, entityName: songData.entityName, similarity })
        })

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
    }

    // Real EarSketch entity names, in rank order — safe to look up directly in the sound
    // library (e.g. allEntities[name]), no fuzzy matching required.
    async searchEntityNames(query: string, topK: number = 20): Promise<string[]> {
        const results = await this.search(query, topK)
        console.log("Search results:", results.map(r => ({ entityName: r.entityName, similarity: r.similarity })))
        return results.map(r => r.entityName)
    }

    getIsReady(): boolean {
        return this.isReady
    }

    getDatabaseSize(): number {
        return this.songsData ? this.songsData.length : 0
    }
}

export const audioSearchEngine = new AudioSearchEngine()
export default AudioSearchEngine
export type { SearchResult, SongData, SongsDatabase }
