# Login script duplication (#1006): findings

## Symptom

After logging in, every one of a user's scripts is re-saved on the server under
a de-duplicated name (`my_script.py` → `my_script_1.py`). The copies appear in
the script browser one by one as the saves return. It mostly affects users with
many scripts, whose IDE appears stuck with scripts still loading.

## Reproduction (confirmed)

Use a disposable test account. A successful reproduction creates real copies on
the server.

1. `npm run dev`, open DevTools, enable **Preserve log** in Console and Network,
   and filter Console by `[login-debug]`.
2. In the Network panel, right-click a `/scripts/shared` request and choose
   **Block request URL**.
3. Log in. The login modal shows "Login failed due to network error." and the UI
   shows the user as logged out.
4. Unblock `/scripts/shared` and log in again from the modal.
5. Every script is re-saved with a `_1` suffix. Console shows `login started`
   with `loggedIn: true`, a `migration snapshot` containing all server scripts,
   and one `Dups triggered!!!` per script.

A plain reload while `/scripts/owned` is slow (`debug:delayBeforeScriptFetch`)
does **not** reproduce it: both pages load clean storage with no server scripts.

## Root cause

`login()` in `src/app/App.tsx`:

1. dispatches `user.login(...)`, so Redux is logged in;
2. calls `postLogin()`, which fetches all server scripts into
   `scripts.regularScripts`;
3. a later step in `postLogin()` throws: `getSharedScripts().unwrap()` or
   `openShare()`;
4. the `catch`/`finally` reports "Login failed due to network error." and calls
   `setLoginState("logged-out")`. This resets only the React UI state. Nothing
   dispatches `user.logout()` or clears the scripts.

The app is left half logged in. On the next login, `postLogin()` snapshots
`regularScripts` as "scripts created while logged out" and migrates each one
with `saveScript({ overwrite: false })`. Their names already exist on the
server, so `selectNextScriptName` gives every script a `_N` suffix.

Users with many scripts are more likely to see slow requests time out or fail
partway through `postLogin()`, and then log in again.

### Related path: Vite Fast Refresh (dev only)

Fast Refresh re-runs `App`'s startup effect. That effect calls
`login({ token })` while already logged in, and `loginInProgressRef` only guards
a login that is still in progress. The result is the same migration of all
server scripts. It cannot happen in production.

**Reproduction (confirmed, every time):** in `npm run dev`, log in and wait for
`login finished` with `succeeded: true`. Add a comment inside the
`ScriptCreator` component (`src/app/ScriptCreator.tsx`, above `return <>`) and
save. Every script is re-saved with a `_1` suffix.

Likely mechanism (inferred from the import graph, not traced):
`ScriptCreator.tsx` also exports `validateScriptName`, so it cannot Fast Refresh
on its own and the update spreads to its importers. `Rename.tsx` (components
only) accepts it and schedules a React refresh. `IDE.tsx` (also exports
non-components) passes it on to `App.tsx`, which re-executes and registers a new
`App`. The scheduled refresh then re-runs `App`'s effects.

Other edits tried:

| File edited | Result |
|---|---|
| `App.tsx`, inside `App`'s JSX | no duplicates |
| `src/browser/API.tsx` (components only) | no duplicates |
| `src/esutils.ts` | no duplicates |
| `src/top/LocaleSelector.tsx` (imported only by `App.tsx`) | no duplicates |
| `src/ide/EditorHeader.tsx` | duplicates when edited twice quickly |
| `src/app/CommandPalette.tsx` (imports and is imported by `App.tsx`) | possibly once, unconfirmed |

## Ruled out or not observed

- **Logout save-all:** `saveAll()` saves with `overwrite: true`, so it never
  renames. Only the login migration and the Command Palette's save-as-copy use
  `overwrite: false`.
- **Reload after migration saves start:** storage is cleared when
  `/scripts/owned` lands, before any migration save starts.
- **Storage contamination** (server scripts in `persist:scripts`): possible in
  theory, but not observed. Candidate causes are the keep-unsaved-tabs logout, a
  save that resolves after logout, and multiple tabs.

## Proposed fixes

| # | Fix | Expected: blocked `/scripts/shared` | Expected: Fast Refresh |
|---|---|---|---|
| A | A failed login actually logs out: dispatch `user.logout()` and reset the scripts | fixed | no effect |
| B | `postLogin()` migrates only `local/` scripts | fixed | fixed |
| C | `login()` returns early if already logged in | fixed (once A is reverted) | fixed |
| D | Persist filter keeps only `local/` IDs, both when saving and loading | no effect | no effect |

A fixes the root cause. B is a safety net for any path that puts server scripts
in the migration snapshot. C prevents double logins. D is hardening for the
storage path. Each fix is verified on its own, before and after, against the
reproductions above.

## Notes

- Temporary instrumentation lives in `src/app/loginDebug.ts` and is not gated by
  build mode. Remove it before deployment. See `login-duplication-debug.md`.
- Earlier work: branch `login-dups-fix` contains fixes B and D, and a forced
  storage-contamination reproduction (`295ca569`).
