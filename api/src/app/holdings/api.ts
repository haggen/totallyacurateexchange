import { z } from "zod";
import { api } from "~/src/api";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { omit } from "~/src/shared/object";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import { getInsertValues, getUpdateSet } from "~/src/shared/sql";
import { select } from "~/src/shared/sql/select";

/**
 * Holding schema.
 */
export const Holding = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  portfolioId: Id,
  stockId: Id,
  quantity: z.number().default(0),
});

/**
 * Holding shape.
 */
export type Holding = typeof Holding;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  await api.portfolios.migrate(database);
  await api.stocks.migrate(database);

  await database.run(
    `
      CREATE TABLE IF NOT EXISTS holdings (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        portfolioId INTEGER NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
        stockId INTEGER NOT NULL REFERENCES stocks(id),
        quantity INTEGER NOT NULL DEFAULT 0,

        UNIQUE (portfolioId, stockId)
      );
    `,
  );
}

/**
 * Create a new holding.
 */
export async function create(
  ctx: Context<Pick<z.input<Holding>, "portfolioId" | "stockId" | "quantity">>,
) {
  const data = Holding.pick({
    createdAt: true,
    updatedAt: true,
    portfolioId: true,
    stockId: true,
    quantity: true,
  }).parse(ctx.payload);

  return must(
    await ctx.database.get<z.output<Holding>>(
      `INSERT INTO holdings ${getInsertValues(data)} RETURNING *;`,
      data,
    ),
  );
}

/**
 * Find existing holdings.
 */
export async function find(
  ctx: Context<
    { limit?: number; offset?: number } & (
      | { id: z.input<typeof Id> }
      | { portfolioId: z.input<typeof Id> }
    )
  >,
) {
  const query = select("*").from("holdings");

  scope(ctx.payload, "id", (id) =>
    query.where("id = ?", Id.parse(id)).limit(1),
  );

  scope(ctx.payload, "portfolioId", (portfolioId) =>
    query.where("portfolioId = ?", Id.parse(portfolioId)),
  );

  scope(ctx.payload, "limit", (limit) => query.limit(limit));

  scope(ctx.payload, "offset", (offset) => query.offset(offset));

  return await ctx.database.all<z.output<Holding>>(...query.toParams());
}

/**
 * Update existing holding.
 */
export async function update(
  ctx: Context<Pick<z.input<Holding>, "id" | "quantity">>,
) {
  const data = z
    .object({
      id: Id,
      updatedAt: Holding.shape.updatedAt,
      quantity: Holding.shape.quantity.optional(),
    })
    .parse(ctx.payload);

  return await ctx.database.get(
    `UPDATE holdings SET ${getUpdateSet(
      omit(data, "id"),
    )} WHERE id = $id RETURNING *;`,
    data,
  );
}
