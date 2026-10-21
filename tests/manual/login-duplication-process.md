# Login script duplication (#1006): debugging process log

How we debugged and are fixing #1006, in order. Results are in
`login-duplication-findings.md`, and the instrumentation guide is in
`login-duplication-debug.md`. This log is updated and committed at each step.

## Approach

- Instrument first, then reproduce, then fix. Each fix is verified by triggering
  the bug before and after, against every confirmed reproduction.
- Apply fixes one at a time, so it is clear which fix closes which path.
- Record each step in these markdown files and commit incrementally, so the
  reasoning and evidence survive interruptions.
- Use a disposable test account. Reproductions create real server copies.

## Phase 1: Review earlier work

Branch `login-dups-fix` (interrupted earlier attempt) contained:

- temporary logging and a `debugger` pause at login;
- an opt-in delay after the script fetch (`debug:delayAfterScriptFetch`);
- a forced storage-contamination reproduction (`295ca569`);
- two fixes: a persistence filter that keeps only `local/` scripts, and
  skipping non-`local/` scripts in the `postLogin()` migration.

The root cause had not been confirmed. Work restarted on `login-dups-2` with
instrumentation only, so fixes could be re-applied and verified one at a time.

## Phase 2: Instrumentation

Commits `cd2bb0bd`, `4dbe90e3`, `81caff9e`:

- Ran a code review of the instrumentation and fixed the findings. The duplicate
  check now flags every non-`local/` migration, not just renamed ones.
  Persistence logs show their input and only fire when relevant. The
  development-only guards were removed, because this never ships.
- Asked "is this sufficient?" and added:
  - a check that flags migrating a script whose source already exists on the
    server, which catches local scripts migrated twice;
  - Redux middleware with `console.trace`, to find what puts server scripts in
    memory while logged out;
  - multi-tab scenarios in the debugging guide;
  - `debug:delayBeforeScriptFetch` to simulate a stuck `/scripts/owned` fetch.

## Phase 3: Hypotheses and reproduction

| Hypothesis | How tested | Result |
|---|---|---|
| Logout save-all renames scripts | Code reading: `saveAll()` uses `overwrite: true` | Ruled out |
| Reload after migration saves start re-migrates local scripts | Code reading: storage is cleared before the saves | Ruled out |
| Reload while `/scripts/owned` is stuck (user report) | `debug:delayBeforeScriptFetch`, reload | Not reproduced |
| Storage contamination | Forced repro exists; no natural cause found | Not observed; deprioritized |
| **A failed `postLogin()` leaves Redux logged in, then the user logs in again** | Block `/scripts/shared`, log in, unblock, log in | **Reproduced** |
| **Fast Refresh re-runs `App`'s login effect** | Edited files in turn (see findings) | **Reproduced every time via `ScriptCreator.tsx`** |

What made the difference: when the reload hypothesis failed, we re-read the
error handling in `login()`. Its failure path resets only React state, which
led to the blocked-request reproduction. Both reproductions share one root
cause: `login()` runs while already logged in, with server scripts in memory.

## Phase 4: Fixes (in progress)

Plan, one at a time, each verified before and after against both
reproductions:

| # | Fix | Status | Blocked `/scripts/shared` | Fast Refresh (`ScriptCreator.tsx`) |
|---|---|---|---|---|
| A | A failed login actually logs out | not started | | |
| B | `postLogin()` migrates only `local/` scripts | not started | | |
| C | `login()` returns early if already logged in | not started | | |
| D | Persist filter keeps only `local/` IDs | not started | | |

## Phase 5: Cleanup (not started)

- Remove the instrumentation (`src/app/loginDebug.ts` and its call sites, plus
  the middleware in `src/reducers.ts`).
- Consider a regression test: a Playwright test with mocked `/scripts/shared`
  failure that logs in twice and asserts that no `/scripts/save` is sent.
- Delete the duplicate copies from the test account.
