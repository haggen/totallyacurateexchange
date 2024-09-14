import { z } from "zod";
import { api } from "~/src";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import * as sql from "~/src/shared/sql";

/**
 * Trade schema.
 */
export const Trade = z.object({
  id: Id,
  executedAt: AutoDateTime,
  bidId: Id,
  askId: Id,
  volume: z.coerce.number().gte(0),
});

/**
 * Trade shape.
 */
export type Trade = typeof Trade;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  await api.orders.migrate(database);

  await database.run(
    `
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY,
        executedAt TEXT NOT NULL,
        bidId INTEGER NOT NULL REFERENCES orders(id),
        askId INTEGER NOT NULL REFERENCES orders(id),
        volume INTEGER NOT NULL CHECK (volume >= 0),

        UNIQUE (bidId, askId),
        CHECK (bidId != askId)
      );
    `,
  );
}

/**
 * Create a new trade.
 */
export async function create(
  ctx: Context<Pick<z.input<Trade>, "bidId" | "askId" | "volume">>,
) {
  const data = Trade.pick({
    executedAt: true,
    bidId: true,
    askId: true,
    volume: true,
  }).parse({
    ...ctx.payload,
  });

  const entry = new sql.Entry(data);

  return must(
    await ctx.database.get<z.infer<Trade>>(
      `INSERT INTO trades ${entry} RETURNING *;`,
      ...entry.bindings,
    ),
  );
}

/**
 * Find existing trades.
 */
export async function find(
  ctx: Context<
    | {
        orderId?: z.input<typeof Id>;
        limit?: number;
        offset?: number;
      }
    | { id: z.input<typeof Id> }
  >,
) {
  const criteria = new sql.Criteria();
  const limit = new sql.Limit();
  const offset = new sql.Offset();

  scope(ctx.payload, "id", (id) => {
    criteria.set("id = ?", Id.parse(id));
    limit.set(1);
  });

  scope(ctx.payload, "orderId", (portfolioId) => {
    criteria.push(
      "(bidId = ? OR askId = ?)",
      Id.parse(portfolioId),
      Id.parse(portfolioId),
    );
  });

  scope(ctx.payload, "limit", limit.set);
  scope(ctx.payload, "offset", offset.set);

  const q = new sql.Query("SELECT * FROM trades", criteria, limit, offset);

  return await ctx.database.all<z.infer<Trade>>(...q.toParams());
}
