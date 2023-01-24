# EarSketch Webclient

Make beats. Learn code.

Check it out at https://earsketch.gatech.edu.

## Getting Started

Run EarSketch on your local machine for development and testing purposes.

### Installing

Install JavaScript dependencies. Node.js v14 required.

```bash
npm install
```

Run the app in development mode.

```bash
npm run serve
```

In your web browser, go to [http://localhost:8888](http://localhost:8888). Start the quick tour, "run", and "play".

### Available Scripts

- `npm run serve` - Run the app in the development mode

- `npm run serve-local` - Build for local serving from the `build` folder

- `npm run build` - Build the app for production to the `build` folder

- `npm run test` - Run unit tests and sample scripts

- `npm run test-jest` - Run component tests

- `npm run test-cypress` - Run e2e tests

- `npm run test-cypress-gui` - Run e2e tests in a GUI

## Deployment

Production deployments should use `npm run build` with additional command-line options. See `webpack.build.js` for details.

The curriculum HTML is sourced elsewhere, by following the `curriculum` soft link. These files can be omitted, and are not publicly available at this time.

## Issues / Contact

Please use our contact form at https://earsketch.gatech.edu/landing/#/contact.

## Contributing

The EarSketch webclient is not accepting outside contributions at this time. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
