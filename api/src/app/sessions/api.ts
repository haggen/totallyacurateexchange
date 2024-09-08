import { z } from "zod";
import { api } from "~/src/api";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import { getInsertValues } from "~/src/shared/sql";
import { select } from "~/src/shared/sql/select";
import { Time } from "~/src/shared/time";

/**
 * Default time to live for sessions.
 */
const TTL = Time.Day;

/**
 * Session schema.
 */
export const Session = z.object({
  id: Id,
  createdAt: AutoDateTime,
  expiresAt: z
    .string()
    .datetime()
    .default(() => new Date(Date.now() + TTL).toISOString()),
  userId: Id,
  token: z
    .string()
    .uuid()
    .default(() => crypto.randomUUID()),
});

/**
 * Session shape.
 */
export type Session = typeof Session;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  api.users.migrate(database);

  database.run(
    `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE
      );
    `,
  );
}

/**
 * Create a new session.
 */
export async function create(
  ctx: Context<Pick<z.input<Session>, "userId" | "expiresAt">>,
) {
  const data = Session.pick({
    createdAt: true,
    expiresAt: true,
    userId: true,
    token: true,
  }).parse(ctx.payload);

  return must(
    await ctx.database.get<z.output<Session>>(
      `INSERT INTO sessions ${getInsertValues(data)} RETURNING *;`,
      data,
    ),
  );
}

/**
 * Find existing sessions.
 */
export async function find(
  ctx: Context<
    { expired?: boolean; limit?: number; offset?: number } & (
      | { id: z.input<typeof Session.shape.id> }
      | { token: string }
      | {}
    )
  >,
) {
  const query = select("*").from("sessions");

  ctx.payload.expired ??= false;

  scope(ctx.payload, "id", (id) =>
    query.where("id = ?", Session.shape.id.parse(id)).limit(1),
  );

  scope(ctx.payload, "token", (token) =>
    query.where("token = ?", Session.shape.token.parse(token)).limit(1),
  );

  scope(ctx.payload, "expired", (shouldIncludeExpired) => {
    if (!shouldIncludeExpired) {
      query.where("expiresAt > ?", new Date().toISOString());
    }
  });

  scope(ctx.payload, "limit", (limit) => query.limit(limit));

  scope(ctx.payload, "offset", (offset) => query.offset(offset));

  return await ctx.database.all<z.output<Session>>(...query.toParams());
}

/**
 * Delete existing session.
 */
export async function destroy(
  ctx: Context<{ id: z.input<typeof Session.shape.id> }>,
) {
  return await ctx.database.get<z.output<Session>>(
    "DELETE FROM sessions WHERE id = $id RETURNING *;",
    {
      id: Session.shape.id.parse(ctx.payload.id),
    },
  );
}
