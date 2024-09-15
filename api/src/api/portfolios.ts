import { z } from "zod";
import { api } from "~/src/api";
import type { Database } from "~/src/shared/database";
import { AutoDateTime, Id } from "~/src/shared/schema";

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
export function create(data: Pick<z.input<Portfolio>, "userId" | "balance">) {
  return Portfolio.pick({
    createdAt: true,
    updatedAt: true,
    userId: true,
    balance: true,
  }).parse(data);
}
