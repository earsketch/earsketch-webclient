# Architecture

This is an overview of the webclient architecture.

## Libraries

- React
- Redux
- TypeScript
- CodeMirror editor
- Droplet blocks mode
- Skulpt
- JS-Interpreter
- WebAudio API

## Layout

- `src/` - main source directory

    - `index.js` - Outermost entry point: loads modules in order.

    - `api/` - Defines the EarSketch API for use in user code

    - `app/`, `brower/`, `ide/`, `daw/`, ... - EarSketch components

    - `data/` - JSON data for recommendation

    - `locales/` - Language translation files

    - `model/` - User-accessible audio effects

- `lib/` - Customized libraries and those needing to be separate

- `tests/` - unit, component, and e2e tests
