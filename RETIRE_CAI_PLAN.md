# Plan: Retire CAI (Co-Creative AI)

CAI was an experimental assistant used in research studies. It is gated behind
build-time flags that are `false` in every checked-in `.env`, so none of it ships
to users today. This plan removes the dead code while preserving the parts the
**Code Analyzer** (`/codeAnalyzer`) still depends on.

_Revised after review 1 (`RETIRE_CAI_PLAN_REVIEW_1.md`): steps reordered so each
commit stays green, type-check command corrected, extra dependency and dead module
added, final grep given an allowlist, Code Analyzer output diffing added._
_Step 6 decided: remove Code Analyzer time-on-task._
_Step 0 is now a committed snapshot test; step 1 is split into 1a/1b/1c; the layout migration was dropped as unnecessary._

## Current footprint

`src/cai/` is ~9,300 lines across 31 files:

| Path | Purpose | Fate |
| --- | --- | --- |
| `CAI.tsx`, `Chat.tsx` | East-panel UI (assistant + human-human chat) | Delete |
| `caiState.ts`, `caiThunks.ts` | Redux slice + thunks | Delete |
| `dialogue/` | Dialogue tree, student model, history upload | Delete |
| `suggestion/` | Code suggestions | Delete |
| `errorHandling/` | CAI error help | Delete |
| `README.md` | CAI docs | Delete |
| `analysis/soundProfileLookup.ts` | Sound-profile queries; used only by `dialogue/` and `suggestion/` | Delete |
| `analysis/` (rest) | Code/music analysis, creativity assessment | **Keep, move** (used by Code Analyzer) |
| `complexityCalculator/` | Python/JS AST complexity analysis | **Keep, move** (used by `analysis/`) |

Many CAI-only modules import `analysis/` and `complexityCalculator/` (including
`caiState.ts`, `caiThunks.ts`, `dialogue/*`, `suggestion/*` and `errorHandling/*`). So the
CAI-only code must be deleted **before** the shared code is moved, or every
importer would have to be rewritten just to be deleted.

### Feature flags

- `ES_WEB_SHOW_CAI`, `ES_WEB_SHOW_CHAT`, `ES_WEB_UPLOAD_CAI_HISTORY`
- Declared in `src/types/global.d.ts`, set in `.env` (all `false`).
- Injected by the generic `ES_WEB_` prefix loader in `vite.config`, so no Vite changes are needed.

### Call sites outside `src/cai/`

- `src/reducers.ts` registers the `cai` slice.
- `src/app/App.tsx` calls `resetState` on login and logout, forces the east panel to `"CAI"`,
  renders the CAI toggle button in the header, uses the highlight/switch selectors, and guards the bubble tutorial.
- `src/ide/IDE.tsx` renders `<CAI />` / `<Chat />` and dispatches `compileError` / `compileCai` after runs.
- `src/app/postRun.ts` calls `setCurrentOverlap` under `ES_WEB_SHOW_CAI`.
- `src/ide/tabThunks.ts` calls `addTabSwitch` (student model tracking).
- `src/browser/API.tsx`, `Browser.tsx`, `Curriculum.tsx`, `Scripts.tsx`, `ScriptsMenus.tsx`,
  `Sounds.tsx`, `Utils.tsx` and `src/daw/DAW.tsx` do `addUIClick` tracking and `highlight` zones.
- `src/app/codeAnalyzerFunctions.ts` imports `analysis`, `creativityAssessment` and
  `complexityCalculator`. It also fetches `/studies/caihistory` for "time on task".
- `src/app/recommender.ts` has a comment only.

### Styles

- `css/earsketch/chat.less` (imported by `allstyles.less`) is used only by Chat.
- The `.btn-cai` and `.list-cai-content` rules in `css/earsketch/styles.less` are used only by `CAI.tsx`.

### Dependencies

- `fastest-levenshtein` is used only by `src/cai/`. Remove it.
- `@webscopeio/react-textarea-autocomplete` is used only by `src/cai/Chat.tsx`. Remove it,
  along with its ambient `declare module` in `src/types/global.d.ts`.
- `acorn`, `lodash`, `skulpt`, etc. are used elsewhere. Keep them.

### Docs

- `AGENTS.md` mentions the `cai` slice, the CAI east panel, the flags, and has a "CAI" section.

## Checks for every step

Each step gets its own commit and must pass:

- `npm run lint`
- `npx tsc -b`. This matches `npm run build`. Plain `npx tsc --noEmit` checks nothing,
  because the root `tsconfig.json` has `files: []` and only project references.
- `npm test`
- `npm run test:scripts` (includes the Code Analyzer snapshot test from step 0)

## Local browser checks

For anything that needs a real browser, use the Playwright MCP against the local webclient
at `http://localhost:8889`, which talks to the local API at `http://localhost:8080`. This
avoids touching the shared dev API.

## Steps

### 0. Add a Code Analyzer snapshot test

The Code Analyzer has no tests today. Before changing anything, add one to the `scripts`
Vitest project (`tests/vitest/scripts/`, runs in headless Chromium via `npm run test:scripts`):

- Run the existing Python and JavaScript fixture scripts (e.g. `curriculum.scripts.js`)
  through `runScript` from `codeAnalyzerFunctions.ts`. It takes a `Script` object directly
  and doesn't fetch from the API.
- Snapshot each script's `reports` and the CSV produced by the same code path as `download`
  (`generateCSV`).
- Commit the test and its snapshots. Every later step must keep them unchanged, except
  for step 6, which removes the `effort` field on purpose.
- Unknown: `analyzeMusic` looks up sound metadata (`soundDict` in `recommender.ts`). If
  the test harness doesn't provide it, stub it in the test. If stubbing isn't practical,
  fall back to recording reports from `/codeAnalyzer` in the local browser setup below.

### 1a. Unhook CAI from the app

Remove every use of CAI outside `src/cai/`, but **keep the `cai` slice registered in
`reducers.ts`**. The CAI files are still type-checked (`tsconfig.app.json` includes all
of `src/`), and they still compile because the slice they read still exists.
This is the commit that needs real review: a few hundred hand-edited lines.

- `IDE.tsx`: remove the `<CAI />`/`<Chat />` rendering, `showCai`, and the
  `compileError`/`compileCai` dispatches. The curriculum panel becomes the only east panel.
- `App.tsx`: remove the `caiState`/`caiThunks` imports, the `resetState` calls, the
  forced `"CAI"` east kind, `toggleCaiWindow`, the header toggle button, the highlight
  selectors, and the CAI terms in the bubble-tutorial condition.
- Browser components, `DAW.tsx`, `tabThunks.ts`, `postRun.ts`: remove the `addUIClick`,
  `addTabSwitch`, `setCurrentOverlap` and `highlight` dispatches, and any highlight-driven classes.
  Check `Utils.tsx` for a `highlight` prop that becomes unused, and remove it from callers.
- `layoutState.ts`: no migration is needed. `east.kind` is a plain string, and the only
  code that reads it is the two `=== "CAI"` checks removed above. A stale persisted
  `"CAI"` value is therefore never read. Optionally remove `east.kind`, since
  `"CURRICULUM"` would be its only value.

### 1b. Delete CAI-only code

This is almost pure deletion. It's large (~5,700 lines) but simple to review: confirm
nothing outside `src/cai/` changed beyond the lines listed here. It isn't split further
by folder, because `caiState.ts` and `caiThunks.ts` import from every CAI folder, so
deleting any one folder alone breaks the build.

- Delete `CAI.tsx`, `Chat.tsx`, `caiState.ts`, `caiThunks.ts`, `README.md`, `dialogue/`,
  `suggestion/`, `errorHandling/` and `analysis/soundProfileLookup.ts`.
- `reducers.ts`: drop the `cai` slice.
- `analysis/index.ts`: remove the `studentModel.musicAttributes.soundProfile` write
  and the `dialogue/student` import. This is the shared code's only link back into CAI.

### 1c. Prune helpers that only CAI used

This touches code we're keeping, so it gets its own commit.

- Check `complexityCalculator/` for exports that only the deleted code used
  (e.g. `numberOfLeadingSpaces` and `trimCommentsAndWhitespace` in `utils.ts`, which only
  `errorHandling/` used). Remove them if nothing else references them.

### 2. Relocate the Code Analyzer's analysis code

At this point only `analysis/` and `complexityCalculator/` remain under `src/cai/`.

- `git mv src/cai/analysis src/analysis` and
  `git mv src/cai/complexityCalculator src/analysis/complexityCalculator`, then remove the empty `src/cai/`.
- Update the imports in `codeAnalyzerFunctions.ts` and the relative imports inside the moved files.
  Keep this commit a pure move, so `git log --follow` and review stay easy.

### 3. Remove dependencies

- `npm uninstall fastest-levenshtein @webscopeio/react-textarea-autocomplete`
- Remove `declare module "@webscopeio/react-textarea-autocomplete"` from `src/types/global.d.ts`.

### 4. Remove feature flags

- Delete `ES_WEB_SHOW_CAI`, `ES_WEB_SHOW_CHAT` and `ES_WEB_UPLOAD_CAI_HISTORY` from
  `src/types/global.d.ts` and `.env`.
- Ask the team whether any deployment env (CI, server `.env` files outside this repo)
  still sets them. It's harmless if so, but worth cleaning up.

### 5. Remove styles

- Delete `css/earsketch/chat.less` and its import in `allstyles.less`.
- Delete the `.btn-cai` and `.list-cai-content` rules from `styles.less`.
- Grep for any other class names that the deleted components leave unused.

### 6. Remove Code Analyzer time-on-task

**Decision: remove it.** `runScriptHistory` is always called with `useCaiHistory = true`.
It fetches `/studies/caihistory`, which is the activity log that only CAI uploaded
(`dialogue/upload.ts`), and computes time-on-task (`effort.timeOnTask`) from it. With CAI
gone, no new logs are ever recorded, so the figure would be 0 for every current and future script.

- `codeAnalyzerFunctions.ts`: remove `getCaiHistory`, the `useCaiHistory` parameter of
  `runScriptHistory` (and the `true` argument in `CodeAnalyzer.tsx`), `timeOnTaskPercentages`,
  and the time-on-task parameter passed through `runScript`.
- `creativityAssessment.ts`: remove `timeOnTask`, `CaiHistoryNode`, the
  `timeOnTaskPercentage` parameter of `assess`, and the `effort` section of `Assessment`
  (including its entry in `emptyAssessment`).
- Check the CSV export for an `effort`/time-on-task column and remove it.
- Tell the backend team that the client no longer calls `/studies/caihistory` (GET or POST),
  so they can retire the endpoint and archive the study data whenever they choose.

### 7. Update docs

- `AGENTS.md`: remove the `cai` state slice, the "Curriculum or CAI panel" wording,
  the two CAI/Chat flags, and the "CAI (Co-Creative AI)" section. Mention `src/analysis/`
  as Code Analyzer support code.
- Check `README.md`, `INTERNATIONALIZATION.md` and `tests/manual/` for CAI mentions.

### 8. Verify

- `npm run lint`, `npm run build`, `npm test` and `npm run test:scripts`.
- `npm run test:e2e` against `npm run dev`.
- **Code Analyzer equivalence:** the step 0 snapshot test passes. Across the whole branch,
  the only snapshot change is the removed `effort`/time-on-task field (step 6). Its
  baseline value should already be 0, since the CAI flags have been off.
- Manual smoke test:
  - The IDE loads with the curriculum in the east panel.
  - Scripts run in both Python and JavaScript.
  - Opening and closing the curriculum, switching tabs, and logging in and out all work.
- Load the app with a stale localStorage layout of `east.kind = "CAI"`, and confirm
  the curriculum panel appears.
- Run `git grep -niE "\bcai\b|caiState|SHOW_CAI|SHOW_CHAT"`. The only matches should be in this allowlist:
  - this plan and its review files
  - base64 blobs in `public/*.html`, and hashes in `package-lock.json` and font files

## Risks

- **Persisted layout:** `layout` is persisted via redux-persist. A stale `"CAI"` kind is harmless once step 1a removes the code that reads it; step 8 confirms this in the browser.
- **Code Analyzer regression:** it's the only live consumer of the analysis code. The step 0 snapshot test catches changes to its output.
- **Hidden coupling:** `complexityCalculator/utils.ts` reads from the store (`selectAllNames`). Confirm this still works in `/codeAnalyzer` after the move.
