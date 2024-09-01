# Totally Acurate Exchange

This is the web API for Totally Acurate Exchange.

## Development

Start the server with `bun start`. You may run the test suite with `bun test`. Code can be auto formatted and fixed with `bun fix`.

### Architecture

This is a [Hono](https://hono.dev/) application, written [TypeScript](https://www.typescriptlang.org) and ran on [Bun](https://bun.sh), with [SQLite](https://www.sqlite.org) as database.

- `./src` is the root of the codebase. Source files here can hold global state.
- `./src/server.ts` starts the web server.
- `./src/test.ts` sets up the test suite, i.e. pre-loaded when we run `bun test`.
- `./src/database.ts` holds the global database instance.
- `./src/config.ts` holds application wide parameters. Most parameters can be set from environment variables.
- `./src/api.ts` is the entrypoint for the application's data API.

Features are implemented as modules, each with its own directory under `./src/modules`.

> [!IMPORTANT]
> A module should never import directly from another module.

Most modules will export a data API, which needs to be imported from `./src/api.ts`, and a Hono application, which needs to be registered at `./src/server.ts`.

> [!TIP]
> If the API exports a `migrate()` function, it will be automatically invoked by `./src/database.ts:prepare()`, in the order established at `./src/api.ts`.

`./src/shared` holds code that is shared across the whole application as packages.

> [!IMPORTANT]
> Shared code can only ever import from other shared packages and must never import application code, i.e. from `./src` or `./src/modules`.
