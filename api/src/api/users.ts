import * as Bun from "bun";
import { z } from "zod";
import type { Database } from "~/src/shared/database";
import { AutoDateTime, Email, Id, Name } from "~/src/shared/schema";

/**
 * User schema.
 */
export const User = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  name: Name,
  email: Email,
  password: z.string().min(12),
});

/**
 * User shape.
 */
export type User = typeof User;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  await database.run(
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

/**
 * Password utilities.
 */
export const password = {
  /**
   * Hash plain text password.
   */
  hash(value: string) {
    return Bun.password.hash(value);
  },

  /**
   * Verify plain text password against hash.
   */
  verify(value: string, hash: string) {
    return Bun.password.verify(value, hash);
  },
};

/**
 * Create new user.
 */
export async function create(
  data: Pick<z.input<User>, "name" | "email" | "password">,
) {
  const user = User.pick({
    createdAt: true,
    updatedAt: true,
    name: true,
    email: true,
    password: true,
  }).parse(data);

  user.password = await password.hash(user.password);

  return user;
}

/**
 * Create a patch.
 */
export async function patch(
  data: Partial<Pick<z.input<User>, "name" | "email" | "password">>,
) {
  const user = z
    .object({
      updatedAt: User.shape.updatedAt,
      name: User.shape.name.optional(),
      email: User.shape.name.optional(),
      password: User.shape.name.optional(),
    })
    .parse(data);

  if (user.password) {
    user.password = await password.hash(user.password);
  }

  return user;
}
