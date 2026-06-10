# AGENTS.md

This file provides guidance to coding agents working in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start dev server (connects to api-dev.ersktch.gatech.edu by default)
npm run dev

# Build for production (requires ES_API_HOST, ES_BASE_URI, ES_BASE_URL env vars)
npm run build

# Lint
npm run lint

# Run jsdom unit tests (fast feedback loop)
npm test

# Run a single Vitest test file
npm test tests/vitest/src/esutils.spec.js

# Run script-pipeline tests in headless Chromium via Vitest browser mode
npm run test:scripts

# Run Playwright end-to-end tests (requires `npm run dev` or `npm run serve-local` running on :8888)
npm run test:e2e

# Open Playwright UI mode for interactive debugging
npm run test:e2e:ui

# Build + serve locally with dev API
npm run serve-local
```

Node 24 or 25 is supported (see `engines` in package.json).

## Architecture Overview

EarSketch is a web-based music programming IDE. Users write Python or JavaScript code that calls the EarSketch API to compose music, then a DAW visualizes and plays back the result.

### Application Entry Points

`src/index.tsx` bootstraps the app. It routes to one of three root components based on the URL:
- `/autograder` → `Autograder.tsx`
- `/codeAnalyzer` → `CodeAnalyzer.tsx`
- Default → `App` (the main IDE)

### Redux State

`src/reducers.ts` defines the store. State slices:
- `app` — color theme, font size, locale, modals (`appState.ts`)
- `user` — auth token, login status, notifications (`userState.ts`)
- `ide` — blocks mode, console logs, editor settings (`ideState.ts`)
- `tabs` — open script tabs, active tab (`tabState.ts`)
- `layout` — panel sizes/visibility, persisted to localStorage (`layoutState.ts`)
- `scripts` — regular/shared/readonly scripts (`scriptsState.ts`)
- `sounds` — standard and user audio samples (`soundsState.ts`)
- `api` — API browser panel state (`apiState.ts`)
- `daw` — DAW panel state (`dawState.ts`)
- `curriculum` — curriculum panel state (`curriculumState.ts`)
- `recommender` — sound recommender state (`recommenderState.ts`)
- `cai` — Co-Creative AI assistant state (`caiState.ts`)

Only `layout` is persisted via redux-persist.

Use `useAppDispatch` / `useAppSelector` from `src/hooks.ts` instead of the plain react-redux hooks.

### Script Execution Pipeline

1. User clicks Run in `src/ide/IDE.tsx`
2. `src/app/runner.ts` dispatches to either `runPython` (via Skulpt) or `runJavaScript` (via JS-Interpreter)
3. The API layer (`src/api/passthrough.ts`) is called for each EarSketch API function
4. `passthrough.ts` builds a `DAWData` object (tracks, clips, effects) defined in `src/types/common.ts`
5. `postRun` in `src/app/postRun.ts` sends the result to the DAW
6. `src/daw/DAW.tsx` renders the visual timeline; `src/audio/player.ts` handles Web Audio playback

The JS API adapter is `src/api/earsketch.js.ts`; the Python adapter is `src/api/earsketch.py.ts`. Both delegate to the same `passthrough.ts` functions.

### Layout

The IDE uses `react-split` for resizable panels:
- **West**: Browser (scripts, sounds, API reference, curriculum tabs)
- **Center**: Code editor (`src/ide/Editor.tsx` using CodeMirror 6; or Droplet for blocks mode)
- **East**: Curriculum or CAI panel
- **Bottom**: DAW (`src/daw/DAW.tsx`)

### API Requests

`src/request.ts` provides `get`, `getAuth`, `post`, `postAuth`, etc. All requests go to `URL_DOMAIN` (set at build time from `ES_API_HOST`). Bearer token auth is stored in Redux `user.token`.

### Build-Time Feature Flags

These are injected via Vite `define` and declared in `src/types/global.d.ts`. They are set via `.env` files prefixed with `ES_WEB_`:
- `ES_WEB_SHOW_CAI` — enable CAI assistant panel
- `ES_WEB_SHOW_CHAT` — enable human-human chat
- `ES_WEB_SHOW_LOCALE_SWITCHER` — show language selector
- `ES_WEB_SHOW_COMPETITION_BANNER` / `ES_WEB_SHOW_COMPETITION_SUBMIT`
- `ES_WEB_SHOW_FEATURED_SOUNDS` / `ES_WEB_FEATURED_ARTISTS`
- `ES_WEB_ANALYTICS`

### Internationalization

All user-facing text must use `i18next`. In React components, use the `useTranslation` hook and the `t()` function. Keys live in `src/locales/en/common.json` and other locale folders. Placeholders use `{{variableName}}` syntax. See `INTERNATIONALIZATION.md` for full details.

### CAI (Co-Creative AI)

`src/cai/` contains an experimental AI assistant for research studies. It analyzes user scripts for complexity/creativity, generates dialogue, and handles error help. Controlled by `ES_WEB_SHOW_CAI`. See `src/cai/README.md`.

### Testing

- **Vitest** (`tests/vitest/`): Two projects share the same Vite config:
  - `unit` (`tests/vitest/src/`): jsdom unit tests for utilities and components. Mock modules go in `__mocks__/` directories next to the originals.
  - `scripts` (`tests/vitest/scripts/`): runs Python and JavaScript scripts through `src/app/runner.ts` and asserts on the resulting `DAWData`, exercising Skulpt / JS-Interpreter / Web Audio. Runs in headless Chromium via the Playwright provider; `tests/vitest/scripts/setup.js` registers the `toMatchResult` matcher and loads `lib/kali.min`.
- **Playwright end-to-end** (`tests/playwright/e2e/`): Full browser tests against the running app. Helpers in `tests/playwright/helpers/` provide API-route mocks. Run with `npm run test:e2e` (needs `npm run dev` or `npm run serve-local` on :8888 in another terminal).
- **Manual test plans** (`tests/manual/`): Markdown checklists for manual QA.

### Local Libraries

`lib/skulpt` — Python interpreter (bundled locally)
`lib/droplet` — Blocks-mode editor (bundled locally)
`lib/kali.min` — Audio time-stretching (loaded as a global)
