# Totally Acurate Exchange

This is the web API for Totally Acurate Exchange.

## Development

Start the server with `bun start`. You may run the test suite with `bun test`. Code can be auto formatted and fixed with `bun fix`.

### Architecture

This is a [Hono](https://hono.dev/) application, written in [TypeScript](https://www.typescriptlang.org) and ran on [Bun](https://bun.sh), with [SQLite](https://www.sqlite.org) as database.

- `./src` is the root of the codebase. Source files here can hold global state.
- `./src/server.ts` starts the web server.
- `./src/test.ts` sets up the test suite, i.e. pre-loaded when we run `bun test`.
- `./src/config.ts` holds application wide parameters. Most parameters can be set from environment variables.
- `./src/api.ts` is the entrypoint for the application's data API.

Features are implemented as modules, each with its own directory under `./src/app`.

> [!IMPORTANT]
> A module should never import directly from another module, but it can use another's module API via the export from the entrypoint `~/src/api`.

Most modules will export a data API, which must be available from `./src/api.ts`. Modules can also export a Hono application, which needs to be imported and mounted at `./src/server.ts`.

> [!TIP]
> If a module's API exports a `migrate()` function, it will be automatically invoked by `migrate()` exported from `./src/api.ts`.

`./src/shared` holds packages that are shared across the whole application.

> [!IMPORTANT]
> Shared code can only ever import from other shared packages or public packages, and must never import application code, i.e. from `./src/*` or `./src/app/**/*`.
