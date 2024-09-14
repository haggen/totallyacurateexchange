import { z } from "zod";
import { api } from "~/src/api";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import * as sql from "~/src/shared/sql";
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
 * Session shape type.
 */
export type Session = typeof Session;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  await api.users.migrate(database);

  await database.run(
    `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,

        CHECK (expiresAt > createdAt)
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

  const entry = new sql.Entry(data);

  return must(
    await ctx.database.get<z.output<Session>>(
      `INSERT INTO sessions ${entry} RETURNING *;`,
      ...entry.bindings,
    ),
  );
}

/**
 * Find existing sessions.
 */
export async function find(
  ctx: Context<
    { expired?: boolean; limit?: number; offset?: number } & (
      | { id: z.input<typeof Id> }
      | { token: string }
      | {}
    )
  >,
) {
  ctx.payload.expired ??= false;

  const criteria = new sql.Criteria();
  const limit = new sql.Limit();
  const offset = new sql.Offset();

  scope(ctx.payload, "expired", (expired) => {
    if (!expired) {
      criteria.push("expiresAt > ?", new Date().toISOString());
    }
  });

  scope(ctx.payload, "id", (id) => {
    criteria.push("id = ?", Id.parse(id));
    limit.set(1);
  });

  scope(ctx.payload, "token", (token) => {
    criteria.push("token = ?", Session.shape.token.parse(token));
    limit.set(1);
  });

  scope(ctx.payload, "limit", limit.set);
  scope(ctx.payload, "offset", offset.set);

  const q = new sql.Query("SELECT * FROM sessions", criteria, limit, offset);

  return await ctx.database.all<z.output<Session>>(...q.toParams());
}

/**
 * Delete existing session.
 */
export async function discard(ctx: Context<{ id: z.input<typeof Id> }>) {
  return await ctx.database.get<z.output<Session>>(
    "DELETE FROM sessions WHERE id = ? RETURNING *;",
    Id.parse(ctx.payload.id),
  );
}
