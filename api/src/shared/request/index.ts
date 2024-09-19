import { SQLiteError } from "bun:sqlite";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { Database } from "~/src/shared/database";
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
 * Handle request/response error.
 */
export function handleError(err: Error, ctx: Context) {
	if (err instanceof HTTPException) {
		return ctx.json({}, err.status);
	}

	if (err instanceof ZodError) {
		return ctx.json({ error: err }, Status.BadRequest);
	}

	if (err instanceof SQLiteError && err.code?.startsWith("SQLITE_CONSTRAINT")) {
		return ctx.json({ error: err }, Status.Conflict);
	}

	print("error", "Unexpected error", err);

	return ctx.json({}, Status.InternalServerError);
}

/**
 * Get request logger middleware.
 */
export function setLogger() {
	return createMiddleware(async (ctx, next) => {
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
	});
}

/**
 * Middleware that opens a database instance for each request and handles transaction.
 */
export function setRequestDatabaseInstance(open: () => Promise<Database>) {
	return createMiddleware(async (ctx, next) => {
		await using database = await open();
		ctx.set("database", database);

		await database.run("BEGIN;");
		await next();

		if (ctx.error) {
			await database.run("ROLLBACK;");
		} else {
			await database.run("COMMIT;");
		}
	});
}

/**
 * Middleware to fetch session from the request's authorization headers.
 */
export function setRequestSession<T>(
	find: (database: Database, token: string) => Promise<T>,
) {
	return createMiddleware(async (ctx, next) => {
		const database = ctx.get("database");
		const token = getCookie(ctx, "session");

		if (token) {
			const session = await find(database, token);

			if (session) {
				ctx.set("session", session);
			}
		}

		await next();
	});
}
