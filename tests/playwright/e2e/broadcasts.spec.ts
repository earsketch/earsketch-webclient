import { test } from "@playwright/test"

// TODO: Port from cypress when migrating to a real WebSocket mock. The original
// Cypress test relied on cy.stub'ing window.WebSocket with mock-socket and
// driving messages from the test runner. Playwright's split between Node and
// browser contexts means we need to inject mock-socket into the page and drive
// server messages via page.evaluate. Skipped (matches the original Cypress
// it.skip).
test.skip("broadcast notification is received", async () => {
    // intentionally empty
})
