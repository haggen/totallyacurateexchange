import { z } from "zod";
import { api } from "~/src/api";
import type { Database } from "~/src/shared/database";
import { AutoDateTime, Id } from "~/src/shared/schema";

/**
 * Holding schema.
 */
export const Holding = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  portfolioId: Id,
  stockId: Id,
  shares: z.coerce.number().gte(0),
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
        shares INTEGER NOT NULL CHECK (shares >= 0),

        UNIQUE (portfolioId, stockId)
      );
    `,
  );
}

/**
 * Create a new holding.
 */
export function create(
  data: Pick<z.input<Holding>, "portfolioId" | "stockId" | "shares">,
) {
  return Holding.pick({
    createdAt: true,
    updatedAt: true,
    portfolioId: true,
    stockId: true,
    shares: true,
  }).parse(data);
}

/**
 * Create a patch.
 */
export function patch(data: Partial<Pick<z.input<Holding>, "shares">>) {
  return z
    .object({
      updatedAt: Holding.shape.updatedAt,
      shares: Holding.shape.shares.optional(),
    })
    .parse(data);
}
