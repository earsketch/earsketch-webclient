# EarSketch Webclient

Make beats. Learn code.

Check it out at https://earsketch.gatech.edu.

## Getting Started

Run EarSketch on your local machine for development and testing purposes.

### Installing

Install JavaScript dependencies. Node.js v20 required.

```bash
npm install
```

Run the app in development mode.

```bash
npm run dev
```

In your web browser, go to [http://localhost:8888](http://localhost:8888).

See [ARCHITECTURE.md](ARCHITECTURE.md) for details about the project structure and important files.

### Available Scripts

- `npm run dev` - Run the app in the development mode

- `npm run serve-local` - Build for local serving from the `dist` folder

- `npm run build` - Build the app for production to the `dist` folder

- `npm run test` - Run unit tests and sample scripts

- `npm run test-vitest` - Run component tests

- `npm run test-cypress` - Run e2e tests

- `npm run test-cypress-gui` - Run e2e tests in a GUI

## Deployment

Production deployments should use `npm run build` with additional command-line options. See `webpack.build.js` for details.

You may optionally choose to install the curriculum, although the webclient will work without it.

The curriculum HTML is sourced from the earsketch-curriculum repository, and referenced by following the `curriculum` soft link. Clone the repository and place it in the same parent directory as this repository.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details about contributing to EarSketch.

## Reporting Issues

Please report technical issues by submitting a [GitHub issue](https://github.com/earsketch/earsketch-webclient/issues).

## Contact

You may contact our team using the landing page [contact form](https://earsketch.gatech.edu/landing/#/contact).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
