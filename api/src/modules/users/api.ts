import * as Bun from "bun";
import { z } from "zod";
import { database } from "~/src/database";
import type { Bindings, Context } from "~/src/shared/database";
import { QueryError } from "~/src/shared/query/error";
import { getInsertValues } from "~/src/shared/query/insert";
import { select, where } from "~/src/shared/query/select";
import { getUpdateSet } from "~/src/shared/query/update";
import { AutoDateTime, Email, Id, Name } from "~/src/shared/schema";

export const User = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  name: Name,
  email: Email,
  password: z.string().min(15),
});

export type User = typeof User;

export function migrate() {
  database().run(
    `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `,
  );
}

export const password = {
  hash(value: string) {
    return Bun.password.hash(value);
  },

  verify(value: string, hash: string) {
    return Bun.password.verify(value, hash);
  },
};

export async function create(
  context: Context<Pick<z.input<User>, "name" | "email" | "password">>,
) {
  const data = User.omit({ id: true }).parse(context.payload);
  data.password = await password.hash(data.password);

  const q = database().query<z.output<User>, Bindings>(
    `INSERT INTO users ${getInsertValues(data)} RETURNING *;`,
  );

  const result = q.get(data);

  if (!result) {
    throw new QueryError(q);
  }

  return result;
}

export async function update(
  context: Context<
    Partial<Pick<z.input<User>, "name" | "email" | "password">>,
    { id: z.input<typeof Id> }
  >,
) {
  const data = User.pick({
    id: true,
    updatedAt: true,
    name: true,
    email: true,
    password: true,
  })
    .partial()
    .parse({
      ...context.payload,
      id: context.options.id,
      updatedAt: undefined,
    });

  if (data.password) {
    data.password = await password.hash(data.password);
  }

  const q = database().query<z.output<User>, Bindings>(
    `UPDATE users SET ${getUpdateSet({
      name: data.name,
      email: data.email,
      password: data.password,
    })} WHERE id = $id RETURNING *;`,
  );

  return q.get(data);
}

export async function find(
  context: Context<
    never,
    | { id: z.input<typeof Id> }
    | { email: string }
    | { limit?: number; offset?: number }
  >,
) {
  const sql = select("*").from("users");

  if ("id" in context.options) {
    sql.merge(where("id = $id", { id: context.options.id }).limit(1));
  } else if ("email" in context.options) {
    sql.merge(
      where("email = $email", { email: context.options.email }).limit(1),
    );
  } else {
    if ("limit" in context.options && context.options.limit) {
      sql.limit(context.options.limit);
    }

    if ("offset" in context.options && context.options.offset) {
      sql.offset(context.options.offset);
    }
  }

  const q = database().query<z.output<User>, Bindings[]>(sql.toString());

  const result = q.all(...sql.bindings);

  if (!result) {
    throw new QueryError(q);
  }

  return result;
}
