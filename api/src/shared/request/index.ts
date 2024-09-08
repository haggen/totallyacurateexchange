import { SQLiteError } from "bun:sqlite";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { Database } from "~/src/shared/database";
import { print } from "~/src/shared/log";
import { Status } from "~/src/shared/response";

/**
 * Hono env type.
 */
export type Env = {
  Variables: {
    database: Database;
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

  if (err instanceof SQLiteError && err.code?.startsWith("SQLITE_CONSTRAINT")) {
    return ctx.json({ error: err }, Status.Conflict);
  }

  return ctx.json(null, Status.InternalServerError);
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
export function getDatabaser(databaseUrl: URL) {
  return async (ctx: Context<Env>, next: Next) => {
    await using database = await Database.open(databaseUrl);
    ctx.set("database", database);
    await next();
  };
}
