// Helper functions for making API requests.

import esconsole from "./esconsole"
import * as user from "./user/userState"
import store from "./reducers"

export function form(obj: { [key: string]: string | Blob; } = {}) {
    const data = new FormData()
    for (const [key, value] of Object.entries(obj)) {
        data.append(key, value)
    }
    return data
}
// Our API has the following kinds of endpoints:
// - GETs that take query params and return JSON or plain text.
// - POSTs that take x-www-form-urlencoded and return JSON, plain text, or nothing.
// - POSTs that take multipart/form-data and return JSON or nothing.
// Some endpoints return nothing on success, in which case their response code is 204.
// Many endpoints require authentication. These all accept Basic authentication (username + password),
// and most of them also accept Bearer authentication (token). This allows us to avoid storing the user's
// password in the client.

async function fetchAPI(endpoint: string, init?: RequestInit) {
    init = {
        ...init,
        headers: {
            ...init?.headers,
            // add custom headers here
            "X-EarSketch-Version": `${BUILD_NUM}`.split("-")[0],
        },
    }
    try {
        const response = await fetch(URL_DOMAIN + endpoint, init)
        if (!response.ok) {
            throw Object.assign(new Error(`error code: ${response.status}`), { code: response.status })
        } else if (response.status === 204) {
            return undefined
        } else if (response.headers.get("Content-Type") === "application/json") {
            return response.json()
        } else {
            return response.text()
        }
    } catch (err) {
        esconsole(`request failed: ${endpoint}`, ["error", "user"])
        esconsole(err, ["error", "user"])
        throw err
    }
}
// Expects query parameters, returns JSON.

export function get(endpoint: string, params?: { [key: string]: string; }, headers?: HeadersInit) {
    return fetchAPI(endpoint + (params ? "?" + new URLSearchParams(params) : ""), { headers })
}

export async function getAuth(endpoint: string, params?: { [key: string]: string; }) {
    return get(endpoint, params, { Authorization: "Bearer " + user.selectToken(store.getState()) })
}

export async function getBasicAuth(endpoint: string, username: string, password: string, params?: { [key: string]: string; }) {
    return get(endpoint, params, { Authorization: "Basic " + btoa(username + ":" + password) })
}
// Expects form data, returns JSON or a string depending on response content type.

export async function post(endpoint: string, data?: { [key: string]: string; }, headers?: HeadersInit) {
    return fetchAPI(endpoint, {
        method: "POST",
        body: new URLSearchParams(data),
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    })
}

export async function postAuth(endpoint: string, data: { [key: string]: string; } = {}) {
    return post(endpoint, data, { Authorization: "Bearer " + user.selectToken(store.getState()) })
}

export async function postBasicAuth(endpoint: string, username: string, password: string, data: { [key: string]: string; } = {}) {
    return post(endpoint, data, { Authorization: "Basic " + btoa(username + ":" + password) })
}

export async function postForm(endpoint: string, data: { [key: string]: string | Blob; }) {
    return fetchAPI(endpoint, {
        method: "POST",
        body: form(data),
        headers: {
            Authorization: "Bearer " + user.selectToken(store.getState()),
            "Content-Type": "multipart/form-data",
        },
    })
}
