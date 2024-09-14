import * as Bun from "bun";
import { z } from "zod";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { omit } from "~/src/shared/object";
import { AutoDateTime, Email, Id, Name } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import * as sql from "~/src/shared/sql";
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

  const entry = new sql.Entry(data);

  return must(
    await ctx.database.get<z.infer<User>>(
      `INSERT INTO users ${entry} RETURNING *;`,
      ...entry.bindings,
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
  const criteria = new sql.Criteria();
  const limit = new sql.Limit();
  const offset = new sql.Offset();

  scope(ctx.payload, "id", (id) => {
    criteria.set("id = ?", Id.parse(id));
    limit.set(1);
  });

  scope(ctx.payload, "email", (email) => {
    criteria.set("email = ?", Email.parse(email));
    limit.set(1);
  });

  scope(ctx.payload, "limit", limit.set);
  scope(ctx.payload, "offset", offset.set);

  const q = new sql.Query("SELECT * FROM users", criteria, limit, offset);

  return ctx.database.all<z.infer<User>>(...q.toParams());
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

  const patch = new sql.Patch(omit(data, "id"));

  return await ctx.database.get(
    `UPDATE users SET ${patch} WHERE id = ? RETURNING *;`,
    ...patch.bindings,
    data.id,
  );
}
