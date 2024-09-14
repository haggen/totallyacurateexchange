# Totally Acurate Exchange

This is the web API for Totally Acurate Exchange.

## Development

Start the server with `bun start`.

You may run the test suite with `bun test`.

Code can be auto fixed with `bun fix`.

### Design

This is a [Hono](https://hono.dev/) application, written in [TypeScript](https://www.typescriptlang.org) and ran on [Bun](https://bun.sh), with [SQLite](https://www.sqlite.org) as database.

- `./src/server.ts` starts the web server.
- `./src/test.ts` sets up the test suite, i.e. pre-loaded when we run `bun test`.
- `./src/config.ts` handles application global parameters. Most parameters can be set using environment variables.
- `./src/api.ts` is the entrypoint for the application's data API.
- `./src/shared` holds packages that are shared across the whole application.

Shared code can only ever import from other shared packages or public packages, and must never import application code, i.e. from `./src/*`.

Also, shared packages must be testable in isolation, i.e. without the application.
