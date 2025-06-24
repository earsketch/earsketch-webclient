# Contributing

EarSketch is an open-source project that welcomes contributions from the community.

## How can I contribute?

Start by browsing through the [GitHub issues](https://github.com/earsketch/earsketch-webclient/issues). Fixing an existing bug is a great place to begin.

For more complex requests or new feature ideas, please submit an issue describing your thoughts clearly. This will start the conversation, and we'll respond.

## Our code review process

All pull requests are reviewed by repository admins.

Expect to receive comments and change requests during your initial submissions.

Once a pull request has been approved by at least one admin, we will merge your branch and deploy it soon afterward.

## Pull Requests

To submit changes, fork the repository and check out a new branch. When your changes are ready, submit your branch as a pull request.

Before submitting a pull request, please ensure you:

- Run the web client locally.

- Execute all test suites.

- Fix any linting errors.

## Code

### Overview

See [ARCHITECTURE.md](ARCHITECTURE.md) for details about the project structure and important files.

### Writing Text for Internationalization

Before adding any static text to the web client, please internationalize it, so it can be translated! See our [internationalization guide](INTERNATIONALIZATION.md).

Example:

```jsx
return <h1>{t("welcomeMessage")}</h1>
```

### Test Suites

When adding new functionality or fixing bugs, please consider including tests. Unit, component, and end-to-end tests are configured for this project.

### Third-Party Libraries

Before adding a library to the project, verify its licensing and ensure the project is actively maintained.
