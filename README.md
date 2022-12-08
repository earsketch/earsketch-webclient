# EarSketch Webclient

Make beats. Learn code.

Check it out at https://earsketch.gatech.edu.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Installing

Install dependencies. Node.js v14 required.

```bash
npm install
```

Run the app in development mode.

```bash
npm run serve
```

In your web browser, go to [http://localhost:8888](http://localhost:8888). Start the quick tour, "run", and "play".

### Available Scripts

- `npm run serve` - Runs the app in the development mode.

- `npm run serve-local` - Builds for local serving from the `build` folder.

- `npm run build` - Builds the app for production to the `build` folder.

- `npm run test` - Run unit tests and script example tests

- `npm run test-jest` - Run component tests

- `npm run test-cypress` - Run e2e tests

- `npm run test-cypress-gui` - Run e2e tests in a GUI

## Deployment

Production deployment should use the `npm run build` script, with command-line options provided. See `webpack.build.js`.

The curriculum HTML is sourced elsewhere, by following the `curriculum` soft link. These files can be omitted, and are not publicly available at this time.

## Issues / Contact

Please use our contact form at https://earsketch.gatech.edu/landing/#/contact.

## Contributing

This project is not accepting outside contributions at this time.  See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
