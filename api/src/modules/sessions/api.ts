import { z } from "zod";
import { database } from "~/src/database";
import type { Bindings, Context } from "~/src/shared/database";
import { QueryError } from "~/src/shared/query/error";
import { getInsertValues } from "~/src/shared/query/insert";
import { select, where } from "~/src/shared/query/select";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { Time } from "~/src/shared/time";

const TTL = Time.Day;

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

export type Session = typeof Session;

export function migrate() {
  database().run(
    `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL
      );
    `,
  );
}

export async function create(
  context: Context<Pick<z.input<Session>, "userId" | "expiresAt">>,
) {
  const data = Session.omit({ id: true }).parse(context.payload);

  const q = database().query<z.output<Session>, Bindings>(
    `INSERT INTO sessions ${getInsertValues(data)} RETURNING *;`,
  );

  const result = q.get(data);

  if (!result) {
    throw new QueryError(q);
  }

  return result;
}

export async function find(
  context: Context<
    never,
    { expired?: boolean } & (
      | { id: z.input<typeof Id> }
      | { token: string }
      | { limit?: number; offset?: number }
    )
  >,
) {
  const sql = select("*").from("sessions");

  if (!context.options.expired) {
    sql.merge(where("expiresAt > ?", new Date().toISOString()));
  }

  if ("id" in context.options) {
    sql.merge(where("id = ?", context.options.id).limit(1));
  } else if ("token" in context.options) {
    sql.merge(where("token = ?", context.options.token).limit(1));
  } else {
    if ("limit" in context.options && context.options.limit) {
      sql.limit(context.options.limit);
    }

    if ("offset" in context.options && context.options.offset) {
      sql.offset(context.options.offset);
    }
  }

  const q = database().query<z.output<Session>, Bindings[]>(sql.toString());

  const result = q.all(...sql.bindings);

  if (!result) {
    throw new QueryError(q);
  }

  return result;
}

export async function destroy(
  context: Context<never, { id: z.input<typeof Id> }>,
) {
  const q = database().query<z.output<Session>, Bindings[]>(
    "DELETE FROM sessions WHERE id = $id RETURNING *;",
  );

  return q.get({ id: context.options.id });
}
