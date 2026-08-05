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

// Doc mentions 7 dictionaries; ESC50_class_labels_indices_space.json is left out
// pending confirmation on whether it's a duplicate or an intentionally distinct variant.
const LABEL_FILES = [
    "ESC50_class_labels_indices.json",
    "FSD50k_class_labels_indices.json",
    "GTZAN_class_labels.json",
    "UrbanSound8K_class_labels_indices.json",
    "VGGSound_class_labels_indices.json",
    "audioset_class_labels_indices.json",
    "audioset_fsd50k_class_labels_indices.json",
]
const LABEL_BATCH_SIZE = 64

interface SearchResult {
    songId: number
    filename: string
    similarity: number
}

interface SongData {
    filename: string
    path: string
    embedding?: number[]
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

        console.log("Loading prompt converter labels...")
        const labels = await this._loadAllLabels()
        console.log(`Encoding ${labels.length} unique labels in batches...`)
        this.labelEmbeddings = await this._encodeLabels(labels)
        console.log(`Label embeddings ready (${this.labelEmbeddings.length} labels)`)

        this.isReady = true
        console.log(`Audio search engine ready with ${this.songsData.length} songs and ${this.labelEmbeddings.length} prompt labels`)
    }

    private async _loadAllLabels(): Promise<string[]> {
        const labelSet = new Set<string>()
        for (const file of LABEL_FILES) {
            const dict: Record<string, number> = await (await fetch(`/embeddings/prompt_converters/${file}`)).json()
            Object.keys(dict).forEach(label => labelSet.add(label))
        }
        return Array.from(labelSet)
    }

    private async _encodeLabels(labels: string[]): Promise<LabelEmbedding[]> {
        const result: LabelEmbedding[] = []
        for (let i = 0; i < labels.length; i += LABEL_BATCH_SIZE) {
            const batch = labels.slice(i, i + LABEL_BATCH_SIZE)
            const inputs = this.tokenizer(batch, { padding: true, truncation: true })
            const output = await this.textModel(inputs) as any
            const flatData: Float32Array = output.text_embeds.data
            const embeddingDim = flatData.length / batch.length
            for (let j = 0; j < batch.length; j++) {
                result.push({
                    label: batch[j],
                    embedding: Array.from(flatData.slice(j * embeddingDim, (j + 1) * embeddingDim)),
                })
            }
        }
        return result
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
            if (!songData.embedding) return
            const similarity = this.cosineSimilarity(searchEmbedding, songData.embedding)
            results.push({ songId: index, filename: songData.filename, similarity })
        })

        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
    }

    async searchFilenames(query: string, topK: number = 20): Promise<string[]> {
        const results = await this.search(query, topK)
        console.log("Search results:", results.map(r => ({ filename: r.filename, similarity: r.similarity })))
        return results.map(r => r.filename.replace(/\.[^.]+$/, ""))
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
