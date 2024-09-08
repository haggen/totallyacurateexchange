import { z } from "zod";
import { api } from "~/src/api";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import { getInsertValues } from "~/src/shared/sql";
import { select } from "~/src/shared/sql/select";

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
        balance INTEGER NOT NULL DEFAULT 0
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

  return must(
    await ctx.database.get<z.output<Portfolio>>(
      `INSERT INTO portfolios ${getInsertValues(data)} RETURNING *;`,
      data,
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
  const query = select("*").from("portfolios");

  scope(ctx.payload, "id", (id) =>
    query.where("id = ?", Id.parse(id)).limit(1),
  );

  scope(ctx.payload, "userId", (userId) =>
    query.where("userId = ?", Id.parse(userId)),
  );

  scope(ctx.payload, "limit", (limit) => query.limit(limit));

  scope(ctx.payload, "offset", (offset) => query.offset(offset));

  return await ctx.database.all<z.output<Portfolio>>(...query.toParams());
}
