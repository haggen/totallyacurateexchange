import { z } from "zod";
import { database } from "~/src/database";
import type { Bindings, Context } from "~/src/shared/database";
import { QueryError, getInsertValues } from "~/src/shared/database";
import { select, where } from "~/src/shared/database/query";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { Time } from "~/src/shared/time";

const TTL = Time.Day;

export const Session = z.object({
  id: z
    .string()
    .uuid()
    .default(() => crypto.randomUUID()),
  createdAt: AutoDateTime,
  expiresAt: z
    .string()
    .datetime()
    .default(() => new Date(Date.now() + TTL).toISOString()),
  userId: Id,
});

export type Session = typeof Session;

export function migrate() {
  database().run(
    `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );
    `,
  );
}

export async function create(
  context: Context<Pick<z.input<Session>, "userId" | "expiresAt">>,
) {
  const data = Session.parse(context.payload);

  const q = database().query<z.output<Session>, Bindings>(
    `INSERT INTO sessions ${getInsertValues(data)} RETURNING *;`,
  );

  const result = q.get(data);

  if (!result) {
    throw new QueryError(q);
  }

  return result;
}

export async function destroy(context: Context<never, { id: string }>) {
  const q = database().query<z.output<Session>, Bindings[]>(
    "DELETE FROM sessions WHERE id = $id RETURNING *;",
  );

  const result = q.get({ id: context.options.id });

  if (!result) {
    throw new QueryError(q);
  }

  return result;
}

export async function find(
  context: Context<
    never,
    { expired?: boolean } & (
      | { id?: string }
      | { limit?: number; offset?: number }
    )
  >,
) {
  const sql = select("*").from("sessions");

  if (!context.options.expired) {
    sql.merge(
      where("expiresAt > $expiresAt", { expiresAt: new Date().toISOString() }),
    );
  }

  if ("id" in context.options && context.options.id) {
    sql.merge(where("id = $id", { id: context.options.id }).limit(1));
  } else {
    if ("limit" in context.options && context.options.limit) {
      sql.limit(context.options.limit);
    }

    if ("offset" in context.options && context.options.offset) {
      sql.offset(context.options.offset);
    }
  }

  const q = database().query<z.output<Session>, Bindings[]>(sql.toString());

  const result = q.get(...sql.bindings);

  if (!result) {
    throw new QueryError(q);
  }

  return result;
}
