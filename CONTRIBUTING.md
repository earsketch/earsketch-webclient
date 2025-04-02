# Contributing

EarSketch is an open-source project that welcomes contributions from the community.

## How can I contribute?

Start by browsing through the [github issues](https://github.com/earsketch/earsketch-webclient/issues). Fixing an existing bug is a great place to begin.

For more complex requests or new feature ideas, please submit an issue describing your thoughts clearly. This will start the conversation, and we'll respond.

## Our code review process

All pull requests are reviewed by the respository admins.

Expect to see comments and change requests on your pull requests initially.

Once a pull request gets approved by at least one admin, we will merge your branch and deploy soon after.

## Pull Requests

To submit a change, fork the repository and checkout a new branch. When you're ready, submit your branch as a pull request.

Before you submit a pull requests:

- Use the webclient locally

- Run test suites

- Fix lint errors

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

For new functionality and bug fixes, consider submitting one or more tests. Unit, component, and e2e tests are configured for this project.

### Third-Party Libraries

Before adding a library to the project, verify the license and active maintenance of the codebase.
