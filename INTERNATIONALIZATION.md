# Internationalization

## Using text in the webclient

If you are writing text in English that will be user-facing (labels, text, titles/tooltips, names, aria-labels, etc.), that text needs to be added using internationalization so that it can be translated and is not hard-coded in English.

The internationalization (i18n) library that we use is [`i18next`](https://www.i18next.com) and the react plugin [`react-i18next`](https://react.i18next.com)

Let's take a simple example. Say you want a new component like below:

```tsx
const MyComponent = () => {
    return <h1>Hello EarSketch!</h1>
}
```

In order to avoid hard-coded text, you would internationalize by adding the useTranslation hook and referring to the appropriate key you have set in [common.json](../scripts/src/locales/en/common.json)

common.json:
```json
{
  "common": {
    "welcomeMessage": "Hello EarSketch!"
  }
}
```
Component:
```tsx
const MyComponent = () => {
    const { t } = useTranslation()
    return <h1>{t("welcomeMessage")}</h1>
}
```

In the above example, we have used a top-level key (`hello`) form common.json, but the i18next library has also been configured to support dot notation to better organize common.json into logical components if that makes sense for what you are working on.

Ideally, your key names should generically describe the text element they represent, rather than the current value of the text, so `welcomeMessage` is better than `hello`. This allows keys to remain more static while the values can change and helps the translation process on CrowdIn.com (our current translation management/contribution system).

`i18next` also supports placeholder values for user-specific content like username, script names, collaborator names, or other places where reusing the same base string makes sense.

In common.json, the placeholder value is surrounded by ``{{ }}`

common.json:
```json
{
  "common": {
    "welcomeMessage": "Hello {{username}}"
  }
}
```
In the translation function, pass in your placeholders in an object after the key string (this is using the js shorthand for object literal property name notation):
```tsx
const MyComponent = () => {
    const username = useSelector(user.selectUserName)
    const { t } = useTranslation()
    return <h1>{t("welcomeMessage", { username })}</h1>
}
```
Another example without shorthand:
```tsx
const MyCollaboratorComponent = () => {
    const collaborator = getCollaboratorName()
    const { t } = useTranslation()
    return <h1>{t("welcomeMessage", { username: collaborator })}</h1>
}
```
There are some cases where a react hook is not appropriate. In that case you can get the i18n obect and call the `t()` function like so:
```tsx
i18n.t("messages:user.allscriptscloud")
```
