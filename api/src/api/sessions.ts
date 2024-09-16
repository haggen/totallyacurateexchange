import { z } from "zod";
import { api } from "~/src/api";
import type { Database } from "~/src/shared/database";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";
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
export function create(data: { userId: z.input<typeof Id> }) {
  return Session.pick({
    createdAt: true,
    expiresAt: true,
    token: true,
    userId: true,
  }).parse(data);
}

export async function findNotExpiredByToken(database: Database, token: string) {
  return await database.get<z.infer<Session>>(
    ...sql.q`SELECT * FROM sessions WHERE token = ${token} AND expiresAt > ${new Date().toISOString()} LIMIT 1;`,
  );
}
