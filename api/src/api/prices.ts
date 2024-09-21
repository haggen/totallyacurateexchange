import { z } from "zod";
import { api } from "~/src/api";
import type { Database } from "~/src/shared/database";
import { AutoDateTime, Id } from "~/src/shared/schema";

/**
 * Price schema.
 */
export const Price = z.object({
  id: Id,
  createdAt: AutoDateTime,
  stockId: Id,
  value: z.number().gte(0),
});

/**
 * Price shape.
 */
export type Price = typeof Price;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  await api.stocks.migrate(database);

  await database.run(
    `
      CREATE TABLE IF NOT EXISTS prices (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        stockId INTEGER NOT NULL REFERENCES stocks(id),
        value INTEGER NOT NULL CHECK (value >= 0)
      );
    `,
  );
}

/**
 * Create a new price.
 */
export function create(data: Pick<z.input<Price>, "stockId" | "value">) {
  return Price.pick({
    createdAt: true,
    stockId: true,
    value: true,
  }).parse(data);
}
