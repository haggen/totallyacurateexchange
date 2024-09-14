import { z } from "zod";
import { api } from "~/src";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { omit } from "~/src/shared/object";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import * as sql from "~/src/shared/sql";

/**
 * Holding schema.
 */
export const Holding = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  portfolioId: Id,
  stockId: Id,
  volume: z.coerce.number().gte(0),
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
        portfolioId INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        stockId INTEGER NOT NULL REFERENCES stocks(id),
        volume INTEGER NOT NULL CHECK (volume >= 0),

        UNIQUE (portfolioId, stockId)
      );
    `,
  );
}

/**
 * Create a new holding.
 */
export async function create(
  ctx: Context<Pick<z.input<Holding>, "portfolioId" | "stockId" | "volume">>,
) {
  const data = Holding.pick({
    createdAt: true,
    updatedAt: true,
    portfolioId: true,
    stockId: true,
    volume: true,
  }).parse(ctx.payload);

  const insert = new sql.Entry(data);

  return must(
    await ctx.database.get<z.output<Holding>>(
      `INSERT INTO holdings ${insert} RETURNING *;`,
      ...insert.bindings,
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
      | { portfolioId: z.input<typeof Id>; stockId?: z.input<typeof Id> }
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

  scope(ctx.payload, "portfolioId", (portfolioId) => {
    criteria.set("portfolioId = ?", Id.parse(portfolioId));
  });

  scope(ctx.payload, "stockId", (stockId) => {
    criteria.set("stockId = ?", Id.parse(stockId));
  });

  scope(ctx.payload, "limit", limit.set);
  scope(ctx.payload, "offset", offset.set);

  const q = new sql.Query("SELECT * FROM holdings", criteria, limit, offset);

  return await ctx.database.all<z.output<Holding>>(...q.toParams());
}

/**
 * Update existing holding.
 */
export async function update(
  ctx: Context<Pick<z.input<Holding>, "id" | "volume">>,
) {
  const data = z
    .object({
      id: Id,
      updatedAt: Holding.shape.updatedAt,
      volume: Holding.shape.volume.optional(),
    })
    .parse(ctx.payload);

  const update = new sql.Patch(omit(data, "id"));

  return await ctx.database.get(
    `UPDATE holdings SET ${update} WHERE id = ? RETURNING *;`,
    ...update.bindings,
    data.id,
  );
}
