import { z } from "zod";
import { api } from "~/src/api";
import type { Database } from "~/src/shared/database";
import { AutoDateTime, Id } from "~/src/shared/schema";

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
export function create(
	data: Pick<z.input<Trade>, "bidId" | "askId" | "volume">,
) {
	return Trade.pick({
		executedAt: true,
		bidId: true,
		askId: true,
		volume: true,
	}).parse(data);
}
