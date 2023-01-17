# Architecture

This is an overview of the webclient architecture.

## Libraries

- React
- Redux
- TypeScript
- CodeMirror editor
- Droplet blocks mode
- Skulpt for Python
- JS-Interpreter for JavaScript
- WebAudio API

## Layout

- `css/` Custom styles

    - `earsketch/` - LESS files built into CSS before every build/run/serve or by running `npm run build-css` manually.

- `src/` - Source code

    - `index.js` - Outermost entry point, loads modules in order

    - `api/` - EarSketch API for use in user code

    - `app/`, `brower/`, `ide/`, `daw/`, ... - EarSketch components

    - `data/` - JSON data for recommendation

    - `locales/` - Language translation files

    - `model/` - Audio effects for use in user code

- `lib/` - Customized libraries and those needing to be separate

- `tests/` - Unit, component, and e2e tests
