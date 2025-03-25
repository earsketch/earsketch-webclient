# Contributing

EarSketch is an open source project happily accepting outside contributions.

## How can I contribute?

Start by look through the github issues. Many big fixes would be a great place to start.

For more complex requests and features, submit an issue and describe your thinking. That will start the converstaion and we'll respond.

See [ARCHITECTURE.md](ARCHITECTURE.md) for details about the project structure and important files.

## Our code review process

All pull requests are reviewed by the respository admins.

Expect to see comments and change requests on your pull requests initially.

Once a pull requests get an approval by at least one admin, we will merge your branch and deploy soon after.

## Pull Requests

To submit a change, fork the repository and checkout a new branch. When you're ready, submit your branch as a pull request.

Before you submit a pull requests:

- Use the webclient locally

- Run test suites

- Fix lint errors

## Writing Text for Internationalization

Before adding any static text to the web client, please internationalize it, so it can be translated! See our [internationalization guide](INTERNATIONALIZATION.md).

Example:

```jsx
return <h1>{t("welcomeMessage")}</h1>
```

## Test Suites

For new functionality and bug fixes, consider submitting one or more tests. Unit, component, and e2e tests are configured for this project.

## Third-Party Libraries

In general, we need to strike a balance between using third-party libraries to incorporate robust functionality with minimal effort and becoming overly dependent on poorly-maintained or otherwise constrained third-party libraries.

Before adding a library to the project, verify the license and active maintenance of the codebase.
