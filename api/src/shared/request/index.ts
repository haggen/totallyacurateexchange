import { SQLiteError } from "bun:sqlite";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { Database } from "~/src/shared/database";
import { UnauthorizedError } from "~/src/shared/error";
import { print } from "~/src/shared/log";
import { Status } from "~/src/shared/response";

/**
 * Hono env type.
 */
export type Env<S = unknown> = {
  Variables: {
    database: Database;
    session?: S;
  };
};

/**
 * Handle request/response errors.
 */
export function handleErrors(err: Error, ctx: Context) {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if (err instanceof ZodError) {
    return ctx.json({ error: err }, Status.BadRequest);
  }

  if (err instanceof UnauthorizedError) {
    return ctx.json(undefined, Status.Unauthorized, {
      "WWW-Authenticate": "Bearer",
    });
  }

  if (err instanceof SQLiteError && err.code?.startsWith("SQLITE_CONSTRAINT")) {
    return ctx.json({ error: err }, Status.Conflict);
  }

  return ctx.json(undefined, Status.InternalServerError);
}

/**
 * Log requests.
 */
export function getLogger() {
  return async (ctx: Context, next: Next) => {
    performance.mark("request");

    await next();

    const { duration } = performance.measure("request", "request");

    print(
      "log",
      "request",
      ctx.req.method,
      new URL(ctx.req.url).pathname,
      ctx.res.status,
      `${duration.toFixed(2)}ms`,
    );
  };
}

/**
 * Open a database connection for each request.
 */
export function getDatabase(databaseUrl: URL) {
  return async (ctx: Context<Env>, next: Next) => {
    await using database = await Database.open(databaseUrl);
    database.verbose = true;
    ctx.set("database", database);

    try {
      await database.run("BEGIN;");
      await next();
      await database.run("COMMIT;");
    } catch (err) {
      await database.run("ROLLBACK;");
      throw err;
    }
  };
}

/**
 * Read and fetch session data from the request.
 */
export function getAuthentication<T>(
  fetcher: (database: Database, token: string) => Promise<T>,
) {
  return async (ctx: Context<Env>, next: Next) => {
    const database = ctx.get("database");
    const header = ctx.req.header("authorization");

    if (header) {
      const token = header.slice("Bearer ".length);
      const session = await fetcher(database, token);

      if (session) {
        ctx.set("session", session);
      }
    }

    await next();
  };
}
