import { test } from "@playwright/test"

// TODO: Port the shared-script import flow with name conflicts once the
// mock-socket bridge is in place. The original Cypress test relied on driving
// share-script notifications via the WebSocket. See broadcasts.spec.ts for
// the same blocker. Original Cypress test was also skipped.
test.skip("imports a shared script with a name conflict", async () => {
    // intentionally empty
})
