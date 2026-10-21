# Login duplication diagnostics (#1006)

This branch adds temporary console diagnostics without the duplication fixes.
Remove them before deployment. Use a disposable test account: a successful reproduction can create real
server copies. No code intentionally poisons local storage or forces a reload.

## Baseline reproduction

1. Run `npm run dev`. Open DevTools and enable **Preserve log** for both Console
   and Network. Filter Console by `[login-debug]`.
2. To widen the interval between fetching owned scripts and migrating the
   anonymous snapshot, run:
   ```js
   localStorage.setItem("debug:delayAfterScriptFetch", "15000")
   ```
3. Log in with an account that already owns scripts. Optionally create an
   anonymous script before logging in to exercise local migration too.
4. When `delay started` (key `debug:delayAfterScriptFetch`) appears, try a browser reload. Separately,
   try editing and saving `src/app/App.tsx` during that window. This is a candidate
   file, not a confirmed reproduction; capture Vite's HMR/invalidation messages.
5. Also try a source edit after `login finished`. The promise lock only covers
   an in-progress login.
6. Record the exact file/edit, event sequence, and `/scripts/save` request names.
   Retain the same setup to compare after each fix.

## Reload during a stuck script fetch

Simulates the production report: with many scripts, the IDE is visible but the
script list is still loading; after a reload, scripts load quickly and
de-duplicated copies appear in the script browser. Single tab.

1. Enable **Preserve log** for Console and Network. Log in with the test account
   and wait for `login finished`, so the session starts in its normal state.
   Perform any steps suspected of leading up to the report before continuing.
2. Run:
   ```js
   localStorage.setItem("debug:delayBeforeScriptFetch", "30000")
   ```
3. Reload. When `delay started` (key `debug:delayBeforeScriptFetch`) appears,
   remove the key so the next load fetches immediately, then reload again
   while the delay is still running:
   ```js
   localStorage.removeItem("debug:delayBeforeScriptFetch")
   ```
4. Compare the stuck page and the page after the reload (different `page`):
   - `scripts rehydration input` and `persisted scripts at migration snapshot`:
     `server > 0` on the stuck page means storage was contaminated before it
     loaded (the middleware should also report `persist/REHYDRATE`).
   - `server: 0` on the stuck page but `server > 0` after the reload means the
     stuck page wrote server scripts to storage. Check the middleware's stack
     trace and the "persisted while logged out" error.
   - `Dups triggered!!!` and suffixed `/scripts/save` requests confirm the
     reproduction.

## Multi-tab scenarios

All tabs share `persist:scripts` in localStorage, but each tab has its own
Redux store. Open DevTools with **Preserve log** in *every* tab, since each tab
logs to its own console. Tell tabs apart by `page`. Before each scenario, log
out and close all other EarSketch tabs.

1. **Two logged-out tabs, log in one.** In tab A, create an anonymous script.
   Open tab B (it rehydrates the same local script). Log in in tab A and wait
   for `login finished`. In tab B, edit or create a script so it persists its
   state, then reload tab A and log in or let it auto-login. Then log in in tab B.
2. **Log in in both tabs.** With an anonymous script present in both tabs, log
   in in tab A, then in tab B before or after A finishes.
3. **Log out in one logged-in tab.** Log in so both tabs are logged in (reload
   tab B to auto-login). Log out in tab A, which clears localStorage. In tab B,
   edit and save a script, then reload tab B. Then log in again in tab A.
4. **Log out with unsaved edits in another tab.** Both tabs logged in. Edit a
   script in tab B without saving. Log out in tab A, then log out in tab B.
   Log in again.

For each, record which tab emitted any errors, the `/scripts/save` requests in
each tab's Network panel, and the final script list on the server.

Disable the delay afterward:

```js
localStorage.removeItem("debug:delayAfterScriptFetch")
localStorage.removeItem("debug:delayBeforeScriptFetch")
```

## Interpreting the events

- `page` is `performance.timeOrigin`: it changes on a full page reload.
- `sequence` and diagnostic IDs survive HMR within the same page.
- `instanceID` identifies the App's ref lifetime. Effect cleanup/entry with the
  same ID may be Strict Mode or Fast Refresh, not a new component instance.
- `login joined existing promise` means the overlap guard took effect.
- `startup effect entered` records whether persistence was bootstrapped.
- `scripts rehydration input` records storage data entering the transform.
- `scripts persistence transform` records the scripts entering persistence and
  whether they are kept (`persisted: "input"`) or dropped (`"nothing"`, when
  logged in). It is logged only when the login state changes or the input
  contains server scripts. It is not confirmation that localStorage has
  finished writing. Server scripts persisted while logged out also emit a
  console error.
- `persisted scripts at migration snapshot` reads actual localStorage.
- `migration snapshot` with `server > 0` is the dangerous condition.
- `migrating script` with `local: false`, followed by `migration saved` under a
  suffixed name, demonstrates server scripts being migrated again.
- `Dups triggered!!!` is a console error emitted automatically whenever
  migration saves a server (non-`local/`) script, which always creates a server
  copy. `renamed` shows whether it got a de-duplicated name. It includes the
  login ID and both scripts' names and IDs.
- `Server scripts in regularScripts while logged out` is a console error from a
  Redux middleware, emitted at dispatch time whenever an action leaves non-`local/`
  scripts in memory while logged out. It includes the action type and is
  followed by a `console.trace` whose stack identifies the code that dispatched
  it. `persist/REHYDRATE` means contaminated storage was loaded. The
  keep-unsaved-tabs logout choice is expected to trigger it.
- `Migrating a script whose content already exists on the server` is a console
  error emitted before saving when a migrating script (local or not) has the
  same source as a fetched server script with the same de-duplicated base name
  (`my_script.py`, `my_script_1.py`, ...). It catches re-migration of local
  scripts, e.g. a reload after migration saves. An identical script deliberately
  created while logged out (such as an unedited template) also triggers it.

Server scripts in rehydration/storage point to persistence contamination.
Server scripts in a later migration snapshot with clean storage point toward a
repeated login using already-populated memory. Preserve the complete sequence
before drawing a conclusion.

The logs contain script names and IDs, but no passwords, tokens, or source code.
There are no automatic debugger pauses. The logging and the optional delay are
not gated by build mode, so this must not be deployed. While the delay is set,
every login logs a console warning.
