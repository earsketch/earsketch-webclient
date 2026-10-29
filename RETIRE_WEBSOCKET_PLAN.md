# Plan: Remove remaining WebSocket code

Branch: `retire-ws`

## Background

The client used to open a WebSocket per logged-in user (`${URL_WEBSOCKET}/socket/<username>/`)
for real-time notifications: broadcasts, script shares, collaboration events, and a keepalive heartbeat.
Every feature that relied on it has since been migrated (notifications are fetched over REST from
`/users/notifications` at login) or retired (collaboration).

No production code imports `src/app/websocket.ts` anymore. What remains is dead code,
build configuration, test scaffolding, and stale comments.

Note: `EarSketchWS` in `URL_DOMAIN` and in the Playwright route mocks is the REST API's path
("web service"), not a WebSocket. It stays.

The `ws` package in `package-lock.json` is a transitive dependency of `@vitest/browser`, not ours. It stays.

## Inventory

| Location | What's there | Action |
| --- | --- | --- |
| `src/app/websocket.ts` | Full WebSocket client (connect, keepalive, send, subscribe, logout). Not imported anywhere. | Delete |
| `src/app/__mocks__/websocket.ts` | Vitest mock (`subscribe` stub) | Delete |
| `tests/vitest/src/app/AdminWindow.spec.jsx:14` | `vi.mock("../../../../src/app/websocket")` | Remove line |
| `src/types/global.d.ts:6` | `declare const URL_WEBSOCKET: string` | Remove line |
| `vite.config.ts` (lines 10, 18, 25–26, 106) | Computes `URL_WEBSOCKET` / `wsHost` and injects it via `define` | Remove variable, assignments, and `define` entry |
| `src/user/notification.ts:101` | `handleBroadcast()`: handled pushed broadcast messages. No callers. | Delete |
| `src/user/notification.ts:5` | `user = { isAdmin, loginTime }`: both fields are written but never read (were used by the socket handler) | Delete export |
| `src/app/App.tsx:204–205` | Sets `userNotification.user.loginTime` with a "websocket notifications" comment | Remove |
| `src/app/App.tsx:1094` | Sets `userNotification.user.isAdmin` (unused; component state `setIsAdmin` is what the UI reads) | Remove |
| `src/app/App.tsx:266–267` | Comment about waiting for websocket notifications | Reword to describe why notifications load after shared scripts (avoid re-adding shared scripts from unread share notifications) |
| `src/app/App.tsx:1346` | `// websocket gets closed before onunload in FF` above `onbeforeunload` | Remove or reword the comment |
| `tests/playwright/helpers/actions.ts:51–90` | `visitWithStubWebSocket()` replaces `window.WebSocket` with a stub; its doc comment says the broadcast/share/login specs are skipped, which is no longer true | Delete helper |
| `tests/playwright/e2e/{daw,sound-browser,source-highlight,user-profile}.spec.ts` | Call `visitWithStubWebSocket(page, "/")` | Replace with `page.goto("/")` and drop the import |

Out of scope:
- Deployment/infra config for the server-side WebSocket endpoint. That lives outside this repo; flag it to whoever owns the API so they can retire the endpoint too.
- Leftover polling/notification design (e.g. `notification_type` naming TODOs). Not related to WebSocket removal.

## Steps

Each step is a separate commit, so it's easy to review and revert.

1. **Delete the dead module and its mock.**
   Remove `src/app/websocket.ts`, `src/app/__mocks__/websocket.ts`, and the `vi.mock` line in `AdminWindow.spec.jsx`.
   Verify: `npm run lint`, `npm test`.

2. **Remove the `URL_WEBSOCKET` build constant.**
   Edit `vite.config.ts` and `src/types/global.d.ts`.
   Verify: `npm run lint` (tsc catches stray references), `npm run build` with the required `ES_*` env vars, and `git grep URL_WEBSOCKET` returns nothing.

3. **Remove socket-only notification state and handlers.**
   Delete `handleBroadcast` and the `user` export from `src/user/notification.ts`. Remove the assignments in `App.tsx`.
   Verify: `npm run lint`, `npm test`. Manually log in as an admin and confirm the Admin Window menu item still appears (it reads component state, not `userNotification.user`).

4. **Clean up stale comments in `App.tsx`.**
   Verify: `git grep -i websocket -- src` returns nothing.

5. **Remove the Playwright WebSocket stub.**
   Delete `visitWithStubWebSocket`, switch its four callers to `page.goto("/")`.
   Verify: `npm run dev` in one terminal, `npm run test:e2e` in another. All specs pass, including `broadcasts`, `script-share`, `user-login`.

6. **Final sweep.**
   `git grep -niE "websocket|URL_WEBSOCKET|new WebSocket"` across the repo (excluding `package-lock.json`, `lib/`, `public/newrelic/`) returns nothing relevant.
   In the dev server, log in and check the Network tab's WS filter: no socket connections are opened.
   Notifications (broadcast indicator, share notifications, mark-as-read) still work.

7. **Delete this plan file** before opening the PR, or move its summary into the PR description.

## Risks

- **Low overall.** The module is already unreferenced, so runtime behavior shouldn't change.
- The Playwright stub may have been hiding a socket that some third-party script opens. If an e2e spec fails after step 5, check the browser for unexpected `WebSocket` connections before restoring the stub.
- Custom deployment builds that set or read `URL_WEBSOCKET` externally would break. A search of this repo found no such usage; confirm with whoever maintains the deploy pipeline.

## Results (2026-10-29)

Steps 1–6 are done:

| Step | Commit |
| --- | --- |
| 1. Delete dead module and mock | `2eec2b8f` Remove unused websocket module and its mock |
| 2. Remove `URL_WEBSOCKET` | `239822c2` Remove URL_WEBSOCKET build constant |
| 3. Remove socket-only notification state | `23790fd5` Remove websocket-only notification state and broadcast handler |
| 4. Stale comments | `d069abd6` Update stale websocket comments |
| 5. Playwright stub | `05957fe9` Remove Playwright WebSocket stub |
| 6. Final sweep | No changes needed |

Verification:
- `npm test`: 80/80 pass after each step.
- `tsc -p tsconfig.app.json` and eslint: clean apart from the existing `STATIC_AUDIO_URL_DOMAIN` unused-variable error, which comes from the local-dev commit "Use localhost backend". The existing `getComputedStyle` lint error in `daw.spec.ts` is also unrelated.
- `vite build` (production mode): succeeds, and the output contains no `URL_WEBSOCKET` or socket URL.
- In the browser on :8889 against the local API: login (new user and restored session), the user menu (no Admin Window for a non-admin), the notifications panel, and the sound library all work. The only WebSocket the page opens is Vite's dev-server HMR socket (`ws://localhost:8889/?token=…`). No socket goes to the API.
- `git grep -niE "websocket|URL_WEBSOCKET|new WebSocket"` (excluding vendored files and this plan) returns nothing.

Not verified:
- **Admin Window as an admin user.** The local test user isn't an admin. The removed `userNotification.user.isAdmin` was never read, so behavior shouldn't change.
- **Full e2e suite.** The suite needs the app on :8888 with `main`'s API host, because its mocks intercept `https://api-dev-gw.ersktch.gatech.edu` and the CloudFront audio host. One run on a temporary :8888 server (with this branch's `audiolibrary.ts` local-backend change still in place) had 51 passed and 18 failed. Every failure was either in a spec that never used the removed stub (command-palette, editor, user-login) or in sound loading, which the local-backend `audiolibrary.ts` change breaks under the mocks. The non-sound specs that used the stub all passed: daw, source-highlight, user-profile, and the sound-browser block at line 82. Re-run `npm run test:e2e` on a clean branch before merging.

Before opening the PR:
- Drop the local-dev commits "Use 8889 for local dev", "Use localhost backend", and "Ignore playwright files". Keep the last one only if the team wants `.playwright-mcp/` ignored.
- Re-run `npm run test:e2e` against `npm run dev` on :8888.
- Step 7: delete this file and move this summary into the PR description.
