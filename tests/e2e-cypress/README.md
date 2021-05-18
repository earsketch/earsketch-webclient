# Cypress end-to-end tests

End-to-end automated testing for the EarSketch web application

Requires nodejs.


## Run test with Cypress GUI

```bash
npm install
npx cypress open
```

Configuration options set in `cypress.json`.

Examples in `cypress/integration/examples/`.


## Test cases

Our custom tests are configured in `test-cases/` (see `cypress.json`)

```
src/api-browser-test.js
src/general-client-test.js
src/scripts-browser-test.js
src/sound-browser-test.js
```
