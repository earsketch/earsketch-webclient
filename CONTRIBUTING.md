# Contributing

NOTE: The EarSketch webclient is not accepting outside contributions at this time.

## Pull Requests

All changes should be submitted as a pull request, to be reviewed by repository admins.

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
