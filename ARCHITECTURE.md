# Architecture

This is an overview of the webclient directory structure and important files.

## Frameworks and Libraries

- React
- Redux
- TypeScript
- CodeMirror editor
- Droplet blocks mode
- Skulpt for Python
- JS-Interpreter for JavaScript
- WebAudio API

## Directories

- `public/`

    - `index.html` - Outermost entry point, calls index.tsx

- `src/`

    - `index.tsx` - JavaScript entry point

    - `api/` - EarSketch API built-in functions

    - `app/`, `brower/`, `ide/`, `daw/`, ... - EarSketch components

    - `audio/` - Web Audio API sound output

    - `data/` - JSON data for recommendation

    - `locales/` - Language translation files

- `css/` - CSS and LESS files

- `lib/` - Customized libraries and those needing to be separate

- `tests/` - Unit, component, and e2e tests

## Getting started

### App layout

- `src/app/App.tsx` - Application entry point

- `src/browser/Browser.tsx` - Content manager pane

- `src/browser/Curriculum.tsx` - Curriculum pane

- `src/ide/IDE.tsx` - DAW, code editor, console pane

- `src/ide/Editor.tsx` - Code editor

- `src/daw/DAW.tsx` - DAW timeline

### EarSketch API built-in functions

- `src/api/passthrough.ts` - function implementations

- `src/api/api.ts` - function definitions in `API_FUNCTIONS`

### Script interpreters

- `src/api/earsketch.py.ts` - Python config (Skulpt)

- `src/api/earsketch.py.ts` - JavaScript config (JS-Interpreter)

### Web Audio API sound output

- `src/audio/player.ts` - See `play()`, `playTrack()`, `playClip()`

- `/src/app/postRun.ts` - Performs audio slicing and timestretch
