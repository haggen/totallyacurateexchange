import { z } from "zod";
import { api } from "~/src";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { omit } from "~/src/shared/object";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import * as sql from "~/src/shared/sql";

/**
 * Portfolio schema.
 */
export const Portfolio = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  userId: Id,
  balance: z.number().default(10_000),
});

/**
 * Portfolio shape.
 */
export type Portfolio = typeof Portfolio;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  await api.users.migrate(database);

  await database.run(
    `
      CREATE TABLE IF NOT EXISTS portfolios (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0)
      );
    `,
  );
}

/**
 * Create a new portfolio.
 */
export async function create(
  ctx: Context<Pick<z.input<Portfolio>, "userId" | "balance">>,
) {
  const data = Portfolio.pick({
    createdAt: true,
    updatedAt: true,
    userId: true,
    balance: true,
  }).parse(ctx.payload);

  const entry = new sql.Entry(data);

  return must(
    await ctx.database.get<z.output<Portfolio>>(
      `INSERT INTO portfolios ${entry} RETURNING *;`,
      ...entry.bindings,
    ),
  );
}

/**
 * Find existing portfolios.
 */
export async function find(
  ctx: Context<
    { limit?: number; offset?: number } & (
      | { id: z.input<typeof Id> }
      | { userId: z.input<typeof Id> }
    )
  >,
) {
  const criteria = new sql.Criteria();
  const limit = new sql.Limit();
  const offset = new sql.Offset();

  scope(ctx.payload, "id", (id) => {
    criteria.set("id = ?", Id.parse(id));
    limit.set(1);
  });

  scope(ctx.payload, "userId", (userId) => {
    criteria.push("userId = ?", Id.parse(userId));
  });

  scope(ctx.payload, "limit", limit.set);
  scope(ctx.payload, "offset", offset.set);

  const q = new sql.Query("SELECT * FROM portfolios", criteria, limit, offset);

  return await ctx.database.all<z.output<Portfolio>>(...q.toParams());
}

/**
 * Update an existing portfolio.
 */
export async function update(
  ctx: Context<
    Pick<z.input<Portfolio>, "id"> &
      Partial<Pick<z.input<Portfolio>, "balance">>
  >,
) {
  const data = Portfolio.pick({
    id: true,
    updatedAt: true,
    balance: true,
  }).parse(ctx.payload);

  const patch = new sql.Patch(omit(data, "id"));

  return await ctx.database.get<z.output<Portfolio>>(
    `UPDATE portfolios SET ${patch} WHERE id = ? RETURNING *;`,
    ...patch.bindings,
    data.id,
  );
}
