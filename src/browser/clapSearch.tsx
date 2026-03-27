import audioEmbeddings from "./audio_embeddings.json"
import esc50Labels from "../../public/prompt_converters/ESC50_class_labels_indices.json"
import fsd50kLabels from "../../public/prompt_converters/FSD50k_class_labels_indices.json"
import gtzanLabels from "../../public/prompt_converters/GTZAN_class_labels.json"
import urbanSoundLabels from "../../public/prompt_converters/UrbanSound8K_class_labels_indices.json"
import vggSoundLabels from "../../public/prompt_converters/VGGSound_class_labels_indices.json"
import audiosetLabels from "../../public/prompt_converters/audioset_class_labels_indices.json"
import audiosetFsd50kLabels from "../../public/prompt_converters/audioset_fsd50k_class_labels_indices.json"

const ALL_LABEL_DICTS: Record<string, number>[] = [
    esc50Labels, fsd50kLabels, gtzanLabels, urbanSoundLabels,
    vggSoundLabels, audiosetLabels, audiosetFsd50kLabels,
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
    embedding: number[]
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
        this.initPromise = this._doInitialize()
        return this.initPromise
    }

    private async _doInitialize(): Promise<void> {
        try {
            console.log("A: Starting initialization...")

            const { AutoTokenizer, ClapTextModelWithProjection, env } = await import("@xenova/transformers")
            console.log("B: Imported transformers successfully")

            // Point ONNX runtime to CDN so WASM files resolve correctly in dev
            env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/"

            // Disable local model lookup — otherwise @xenova/transformers tries localhost first
            // and gets the SPA's index.html back instead of the actual model files
            env.allowLocalModels = false

            // Load tokenizer
            console.log("Loading tokenizer...")
            this.tokenizer = await AutoTokenizer.from_pretrained("Xenova/clap-htsat-unfused")
            const textInputs = this.tokenizer(["tHIS IS A TEST"], { padding: true, truncation: true })
            console.log("C: Tokenizer loaded successfully")

            // Load text model
            console.log("Loading text model...")
            this.textModel = await ClapTextModelWithProjection.from_pretrained("Xenova/clap-htsat-unfused")
            await this.textModel(textInputs)
            console.log("D: Text model loaded successfully")

            this.songsData = audioEmbeddings as SongsDatabase
            console.log("E: Songs data loaded:", this.songsData.length, "songs")

            // Load and encode all training labels for two-stage prompt conversion
            console.log("F: Loading prompt converter labels...")
            const labels = this._loadAllLabels()
            console.log(`F: Encoding ${labels.length} unique labels in batches...`)
            this.labelEmbeddings = await this._encodeLabels(labels)
            console.log(`G: Label embeddings ready (${this.labelEmbeddings.length} labels)`)

            this.isReady = true
            console.log(`Audio search engine ready with ${this.songsData.length} songs and ${this.labelEmbeddings.length} prompt labels`)
        } catch (error) {
            console.error("Failed to initialize audio search engine:", error)
            this.isReady = false
            this.initPromise = null
            throw error
        }
    }

    private _loadAllLabels(): string[] {
        const labelSet = new Set<string>()
        for (const dict of ALL_LABEL_DICTS) {
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
        if (a.length !== b.length) {
            console.warn("Vector length mismatch:", a.length, "vs", b.length)
            return 0
        }

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

    async search(query: string, topK: number = 10): Promise<SearchResult[]> {
        if (!this.isReady || !this.songsData) {
            throw new Error("Search engine not initialized. Call initialize() first.")
        }

        try {
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
            console.log("Final search embedding composed from:", [query, ...topLabels.map(l => l.label)])

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
        } catch (error) {
            console.error("Search failed:", error)
            throw error
        }
    }

    async searchFilenames(query: string, topK: number = 10): Promise<string[]> {
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

export default AudioSearchEngine
export type { SearchResult, SongData, SongsDatabase }
