import * as Bun from "bun";
import { z } from "zod";
import { database } from "~/src/database";
import type { Bindings, Context } from "~/src/shared/database";
import {
  QueryError,
  getInsertValues,
  getUpdateSet,
} from "~/src/shared/database";
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

  const result = q.get(data);

  if (!result) {
    throw new QueryError(q);
  }

  return result;
}
