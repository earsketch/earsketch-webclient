# EarSketch Jest Tests

Run tests with the following command:
```bash
npm run test-jest
```

## Writing a test

Our tests use the Jest and Testing Library frameworks. See these examples for writing tests.

1. Render and verify a component
    - See `src/app/AdminWindow.spec.js`
2. Verify utility functions
    - See `src/esutils.spec.js`

## Mocking modules

You can replace any module with your own mocked functions. Save these in `__mocks__/` next the original module. See `src/app/AdminWindow.spec.js` for examples.
