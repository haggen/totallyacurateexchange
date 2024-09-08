import * as Bun from "bun";
import { z } from "zod";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { omit } from "~/src/shared/object";
import { AutoDateTime, Email, Id, Name } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import { getInsertValues, getUpdateSet } from "~/src/shared/sql";
import { select } from "~/src/shared/sql/select";
import type { AtLeastOne } from "~/src/shared/types";

/**
 * User schema.
 */
export const User = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  name: Name,
  email: Email,
  password: z.string().min(15),
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
  ctx: Context<Pick<z.input<User>, "name" | "email" | "password">>,
) {
  const data = User.pick({
    createdAt: true,
    updatedAt: true,
    name: true,
    email: true,
    password: true,
  }).parse(ctx.payload);

  data.password = await password.hash(data.password);

  return must(
    await ctx.database.get<z.infer<User>>(
      `INSERT INTO users ${getInsertValues(data)} RETURNING *;`,
      data,
    ),
  );
}

/**
 * Find existing users.
 */
export async function find(
  ctx: Context<
    | { id: z.input<typeof Id> }
    | { email: string }
    | { limit?: number; offset?: number }
  >,
) {
  const query = select("*").from("users");

  scope(ctx.payload, "id", (id) =>
    query.where("id = ?", User.shape.id.parse(id)).limit(1),
  );

  scope(ctx.payload, "email", (email) =>
    query.where("email = ?", User.shape.email.parse(email)).limit(1),
  );

  scope(ctx.payload, "limit", (limit) => query.limit(limit));

  scope(ctx.payload, "offset", (offset) => query.offset(offset));

  return ctx.database.all<z.infer<User>>(...query.toParams());
}

/**
 * Update existing user.
 */
export async function update(
  ctx: Context<
    Pick<z.input<User>, "id"> &
      AtLeastOne<Pick<z.input<User>, "name" | "email" | "password">>
  >,
) {
  const data = z
    .object({
      id: User.shape.id,
      updatedAt: User.shape.updatedAt,
      name: User.shape.name.optional(),
      email: User.shape.email.optional(),
      password: User.shape.password.optional(),
    })
    .parse(ctx.payload);

  if (data.password) {
    data.password = await password.hash(data.password);
  }

  return await ctx.database.get(
    `UPDATE users SET ${getUpdateSet(
      omit(data, "id"),
    )} WHERE id = $id RETURNING *;`,
    data,
  );
}
