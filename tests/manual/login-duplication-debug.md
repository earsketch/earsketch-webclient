# Login duplication diagnostics (#1006)

This branch adds development-only console diagnostics without the duplication
fixes. Use a disposable test account: a successful reproduction can create real
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
4. When `delay after fetch started` appears, try a browser reload. Separately,
   try editing and saving `src/app/App.tsx` during that window. This is a candidate
   file, not a confirmed reproduction; capture Vite's HMR/invalidation messages.
5. Also try a source edit after `login finished`. The promise lock only covers
   an in-progress login.
6. Record the exact file/edit, event sequence, and `/scripts/save` request names.
   Retain the same setup to compare after each fix.

Disable the delay afterward:

```js
localStorage.removeItem("debug:delayAfterScriptFetch")
```

## Interpreting the events

- `page` is `performance.timeOrigin`: it changes on a full page reload.
- `sequence` and diagnostic IDs survive HMR within the same page.
- `instanceID` identifies the App's ref lifetime. Effect cleanup/entry with the
  same ID may be Strict Mode or Fast Refresh, not a new component instance.
- `login joined existing promise` means the overlap guard took effect.
- `startup effect entered` records whether persistence was bootstrapped.
- `scripts rehydration input` records storage data entering the transform.
- `scripts persistence transform` records what is being queued for persistence,
  not confirmation that localStorage has finished writing it.
- `persisted scripts at migration snapshot` reads actual localStorage.
- `migration snapshot` with `server > 0` is the dangerous condition.
- `migrating script` with `local: false`, followed by `migration saved` under a
  suffixed name, demonstrates server scripts being migrated again.
- `Dups triggered!!!` is a console error emitted automatically when migration
  saves a server script under a different name. It includes the login ID and
  both scripts' names and IDs.

Server scripts in rehydration/storage point to persistence contamination.
Server scripts in a later migration snapshot with clean storage point toward a
repeated login using already-populated memory. Preserve the complete sequence
before drawing a conclusion.

The logs contain script names and IDs, but no passwords, tokens, or source code.
There are no automatic debugger pauses. All logging and the optional delay are
disabled in production builds.
