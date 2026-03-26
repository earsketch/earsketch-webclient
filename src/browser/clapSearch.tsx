import audioEmbeddings from "./audio_embeddings.json"

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

type SongsDatabase = SongData[]

class AudioSearchEngine {
    private tokenizer: any = null
    private textModel: any = null
    private songsData: SongsDatabase | null = null
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
            console.log("D: Text model loaded successfully", this.textModel)

            this.songsData = audioEmbeddings as SongsDatabase
            console.log("E: Songs data loaded:", this.songsData.length, "songs")

            this.isReady = true
            console.log(`Audio search engine ready with ${Object.keys(this.songsData).length} songs`)
        } catch (error) {
            console.error("Failed to initialize audio search engine:", error)
            this.isReady = false
            this.initPromise = null
            throw error
        }
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

    async search(query: string, topK: number = 10): Promise<SearchResult[]> {
        if (!this.isReady || !this.songsData) {
            throw new Error("Search engine not initialized. Call initialize() first.")
        }

        try {
            // Generate text embedding
            console.log("Tokenizing query:", query)
            const textInputs = this.tokenizer([query], { padding: true, truncation: true })
            console.log("Text inputs:", textInputs)

            const modelOutput = await this.textModel(textInputs) as any
            console.log("Text embeds shape:", modelOutput.text_embeds)

            const queryEmbedding = Array.from(modelOutput.text_embeds.data) as number[]
            console.log("Query embedding length:", queryEmbedding.length)

            // Calculate similarities
            const results: SearchResult[] = []
            this.songsData.forEach((songData, index) => {
                if (!songData.embedding) return
                const similarity = this.cosineSimilarity(queryEmbedding, songData.embedding)
                results.push({
                    songId: index,
                    filename: songData.filename,
                    similarity,
                })
            })

            // Return top K results
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
        return results.map(r => r.filename)
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
