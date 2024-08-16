import * as Bun from "bun";
import { z } from "zod";
import type { Bindings, Context } from "~/src/shared/database";
import {
  database,
  getInsertValues,
  getPrefixedBindings,
  getUpdateSet,
} from "~/src/shared/database";
import { Email, Id, Name } from "~/src/shared/schema";

export const User = z.object({
  id: Id,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  name: Name,
  email: Email,
  password: z.string().min(15),
});

export type User = typeof User;

export function migrate() {
  database()
    .query(
      `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          password TEXT NOT NULL
        );
      `
    )
    .run();
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
  context: Context<Pick<z.input<User>, "name" | "email" | "password">>
) {
  const createdAt = new Date().toISOString();

  const data = User.omit({ id: true }).parse({
    ...context.payload,
    createdAt,
    updatedAt: createdAt,
  });

  data.password = await password.hash(data.password);

  const query = database().query<User, Bindings>(
    `INSERT INTO users ${getInsertValues(data)} RETURNING *;`
  );
  const user = query.get(getPrefixedBindings(data));

  if (!user) {
    throw new Error(`Query failed: ${query}`);
  }

  return user;
}

export async function update(
  context: Context<
    Partial<Pick<z.input<User>, "name" | "email" | "password">>,
    { id: z.input<typeof Id> }
  >
) {
  const updatedAt = new Date().toISOString();

  const data = User.pick({
    id: true,
    updatedAt: true,
    name: true,
    email: true,
    password: true,
  }).parse({
    ...context.payload,
    id: context.options.id,
    updatedAt,
  });

  if (data.password) {
    data.password = await password.hash(data.password);
  }

  const user = database()
    .query<User, Bindings>(
      `UPDATE users SET ${getUpdateSet({
        name: data.name,
        email: data.email,
        password: data.password,
      })} WHERE id = $id RETURNING *;`
    )
    .get(getPrefixedBindings(data));

  if (!user) {
    throw new Error("Query failed");
  }

  return user;
}
