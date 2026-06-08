import { type Page, type Route } from "@playwright/test"
import * as path from "node:path"
import * as fs from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const API_HOST = "api-dev.ersktch.gatech.edu"
export const CLOUDFRONT_HOST = "earsketch-test.ersktch.gatech.edu"
export const TEST_USER = "tester"

export interface AudioMeta {
    artist?: string
    folder: string
    genre?: string
    genreGroup?: string
    instrument?: string
    name: string
    path: string
    public: 0 | 1
    tempo?: number
    year?: number
}

export interface Script {
    created: string
    file_location: string
    id: number
    modified: string
    name: string
    run_status: number
    shareid: string
    soft_delete: boolean
    source_code: string
    username: string
    description?: string
    license_id?: number
}

export interface MockOptions {
    standardAudio?: AudioMeta[]
    standardAudioMeta?: AudioMeta
    userAudio?: AudioMeta[]
    favorites?: unknown[]
    scriptsOwned?: Script[]
    scriptsShared?: Script[]
    notifications?: Array<Record<string, unknown>>
    username?: string
    interceptCurriculum?: boolean
    interceptScriptSave?: boolean
    interceptScriptById?: Script
    interceptScriptImport?: Script
    interceptScriptRename?: Script
    interceptScriptSaveShared?: Script
    interceptUsersEdit?: boolean
    interceptModifyPassword?: { password: string }
    interceptFreesoundSearch?: boolean
    interceptUsersAuth?: boolean
    interceptAudioSample?: boolean
    interceptAudioUpload?: boolean
    interceptAudioRename?: boolean
    interceptAudioDelete?: boolean
    additionalRoutes?: Array<(page: Page) => Promise<void>>
}

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures")

export function readFixture(name: string): Buffer {
    return fs.readFileSync(path.join(FIXTURES_DIR, name))
}

export function readFixtureJson<T = unknown>(name: string): T {
    return JSON.parse(readFixture(name).toString("utf8")) as T
}

const standardLibraryDefault = (sounds: AudioMeta[] = []): AudioMeta[] => sounds.concat([1, 2].map((i) => ({
    artist: "EARSKETCH",
    folder: "EARSKETCH",
    name: `METRONOME0${i}`,
    path: `standard-library/EarSketch/METRONOME0${i}.flac`,
    public: 0 as const,
    tempo: -1,
})))

function fulfillJson(route: Route, body: unknown, status = 200) {
    return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
    })
}

/**
 * Tracks every request that matched a given route pattern, so tests can assert
 * counts.
 */
export class RouteCounter {
    private map = new Map<string, number>()
    bump(key: string) {
        this.map.set(key, (this.map.get(key) ?? 0) + 1)
    }

    count(key: string) {
        return this.map.get(key) ?? 0
    }
}

export async function setupBackend(page: Page, opts: MockOptions = {}): Promise<RouteCounter> {
    const counter = new RouteCounter()
    const username = opts.username ?? TEST_USER

    // Standard audio library — always set if anything is mocked
    const standardAudio = standardLibraryDefault(opts.standardAudio ?? [])
    await page.route(`https://${CLOUDFRONT_HOST}/backend-static/audio-standard_2.json`, (route) => {
        counter.bump("audio_standard")
        return fulfillJson(route, standardAudio)
    })

    // Audio metadata (used to surface a single sound's details)
    if (opts.standardAudioMeta) {
        const meta = opts.standardAudioMeta
        await page.route(`https://${API_HOST}/EarSketchWS/audio/metadata?**`, (route) => {
            const url = new URL(route.request().url())
            const name = url.searchParams.get("name")
            counter.bump("audio_metadata")
            return fulfillJson(route, name === meta.name ? meta : "")
        })
    }

    // Audio sample (.wav) — return the clink fixture, or countdown.wav for DUBSTEP_BASS_WOBBLE_002
    if (opts.interceptAudioSample) {
        const clinkAudio = readFixture("clink.wav")
        const countdownAudio = readFixture("countdown.wav")
        await page.route(`https://${CLOUDFRONT_HOST}/backend-static/standard-library/**`, (route) => {
            counter.bump("audio_sample")
            const url = route.request().url()
            const body = url.includes("DUBSTEP_BASS_WOBBLE_002") ? countdownAudio : clinkAudio
            return route.fulfill({
                status: 200,
                contentType: "application/octet-stream",
                body,
            })
        })
    }

    if (opts.interceptUsersAuth) {
        await page.route(`https://${API_HOST}/EarSketchWS/users/token`, (route) => {
            counter.bump("users_token")
            return route.fulfill({ status: 200, contentType: "text/plain", body: "1".repeat(64) })
        })
        await page.route(`https://${API_HOST}/EarSketchWS/users/info*`, (route) => {
            counter.bump("users_info")
            return fulfillJson(route, { created: "2019-04-22 16:13:06.0", email: "", isAdmin: true, username })
        })
        await page.route(`https://${API_HOST}/EarSketchWS/users/notifications`, (route) => {
            counter.bump("users_notifications")
            return fulfillJson(route, opts.notifications ?? [])
        })
    }

    if (opts.userAudio !== undefined) {
        await page.route(`https://${API_HOST}/EarSketchWS/audio/user?**`, (route) => {
            counter.bump("audio_user")
            return fulfillJson(route, opts.userAudio)
        })
    }

    if (opts.favorites !== undefined) {
        await page.route(`https://${API_HOST}/EarSketchWS/audio/favorites*`, (route) => {
            counter.bump("audio_favorites")
            return fulfillJson(route, opts.favorites)
        })
    }

    if (opts.scriptsOwned !== undefined) {
        await page.route(`https://${API_HOST}/EarSketchWS/scripts/owned`, (route) => {
            counter.bump("scripts_owned")
            return fulfillJson(route, opts.scriptsOwned)
        })
    }

    if (opts.scriptsShared !== undefined) {
        await page.route(`https://${API_HOST}/EarSketchWS/scripts/shared`, (route) => {
            counter.bump("scripts_shared")
            return fulfillJson(route, opts.scriptsShared)
        })
    }

    if (opts.interceptScriptById) {
        const script = opts.interceptScriptById
        await page.route(`https://${API_HOST}/EarSketchWS/scripts/byid?**`, (route) => {
            counter.bump("scripts_by_id")
            return fulfillJson(route, script)
        })
    }

    if (opts.interceptScriptSave) {
        await page.route(`https://${API_HOST}/EarSketchWS/scripts/save`, async (route) => {
            counter.bump("scripts_save")
            const body = route.request().postData() ?? ""
            const params = new URLSearchParams(body)
            const name = params.get("name") ?? ""
            const source = params.get("source_code") ?? ""
            return fulfillJson(route, {
                created: "2022-04-06 14:53:07.0",
                file_location: "",
                id: -1,
                modified: "2022-04-06 14:53:07.0",
                name,
                run_status: 0,
                shareid: `test_${name}`,
                soft_delete: false,
                source_code: source,
                username: TEST_USER,
            })
        })
    }

    for (const [optKey, urlPath, counterKey] of [
        ["interceptScriptImport", "import", "scripts_import"],
        ["interceptScriptRename", "rename", "scripts_rename"],
        ["interceptScriptSaveShared", "saveshared", "scripts_saveshared"],
    ] as const) {
        const script = opts[optKey]
        if (script) {
            await page.route(`https://${API_HOST}/EarSketchWS/scripts/${urlPath}`, (route) => {
                counter.bump(counterKey)
                return fulfillJson(route, script)
            })
        }
    }

    for (const tag of ["upload", "rename", "delete"] as const) {
        const optKey = ("interceptAudio" + tag[0].toUpperCase() + tag.slice(1)) as keyof MockOptions
        if (opts[optKey]) {
            await page.route(`https://${API_HOST}/EarSketchWS/audio/${tag}`, (route) => {
                counter.bump("audio_" + tag)
                return route.fulfill({ status: 204, body: "" })
            })
        }
    }

    if (opts.interceptUsersEdit) {
        await page.route(`https://${API_HOST}/EarSketchWS/users/edit`, (route) => {
            counter.bump("users_edit")
            return fulfillJson(route, {})
        })
    }

    if (opts.interceptModifyPassword) {
        const payload = opts.interceptModifyPassword
        await page.route(`https://${API_HOST}/EarSketchWS/users/modifypwd`, (route) => {
            counter.bump("users_modifypwd")
            return fulfillJson(route, payload)
        })
    }

    if (opts.interceptFreesoundSearch) {
        const results = readFixtureJson("freesound.json")
        await page.route(`https://${API_HOST}/EarSketchWS/audio/freesound/search?**`, (route) => {
            counter.bump("freesound_search")
            return fulfillJson(route, results)
        })
    }

    if (opts.interceptCurriculum) {
        await registerCurriculumRoutes(page, counter)
    }

    for (const fn of opts.additionalRoutes ?? []) {
        await fn(page)
    }

    return counter
}

export async function registerCurriculumRoutes(page: Page, counter?: RouteCounter) {
    const { makeTOC, makeSearchDoc } = await import("./curriculum")
    const gettingStarted = readFixture("getting-started.html").toString("utf8")

    await page.route(/\/curriculum\/[^/]+\/curr_toc\.json$/, (route) => {
        counter?.bump("curriculum_toc")
        const url = route.request().url()
        const locale = url.split("/")[4]
        return fulfillJson(route, makeTOC(locale))
    })
    await page.route(/\/curriculum\/[^/]+\/curr_searchdoc\.json$/, (route) => {
        counter?.bump("curriculum_searchdoc")
        const url = route.request().url()
        const locale = url.split("/")[4]
        return fulfillJson(route, makeSearchDoc(locale))
    })
    // NOTE: Playwright applies route handlers in reverse registration order
    // (most-recent first). Register the catchall before the specific override
    // so the override wins.
    await page.route(/\/curriculum\/[^/]+\/[^/]+\/[^/]+\.html$/, (route) => {
        counter?.bump("curriculum_content")
        const url = route.request().url()
        const filename = url.substring(url.lastIndexOf("/") + 1).replace(".html", "")
        const locale = url.split("/")[4]
        let sectionBody = `
          <div class="sect2"><h3>Test Section Title 1</h3>from locale ${locale}</div>
          <div class="sect2"><h3>Test Section Title 2</h3>from locale ${locale}</div>
          <div class="sect2"><h3>Test Section Title 3</h3>from locale ${locale}</div>`
        if (filename.startsWith("welcome") || filename.startsWith("unit-")) {
            sectionBody = "Landing page body for " + filename
        }
        const body = `
            <html>
            <head></head>
            <body>
              <div class="sect1"><h2>${filename}</h2>
                ${sectionBody}
              </div>
            </body>
            </html>`
        return route.fulfill({ status: 200, contentType: "text/html", body })
    })
    await page.route(/\/curriculum\/[^/]+\/[^/]+\/getting-started\.html$/, (route) => {
        counter?.bump("curriculum_getting_started")
        return route.fulfill({ status: 200, contentType: "text/html", body: gettingStarted })
    })
}
