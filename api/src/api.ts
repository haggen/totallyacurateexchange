import * as holdings from "~/src/holdings/api";
import * as orders from "~/src/orders/api";
import * as portfolios from "~/src/portfolios/api";
import * as sessions from "~/src/sessions/api";
import type { Database } from "~/src/shared/database";
import * as stocks from "~/src/stocks/api";
import * as trades from "~/src/trades/api";
import * as users from "~/src/users/api";

/**
 * Data API entrypoint.
 */
export const api = {
  portfolios,
  stocks,
  users,
  sessions,
  holdings,
  orders,
  trades,
};

/**
 * Run all migrations.
 */
export async function migrate(database: Database) {
  for await (const module of Object.values(api)) {
    if (
      typeof module === "object" &&
      module !== null &&
      "migrate" in module &&
      typeof module.migrate === "function"
    ) {
      await module.migrate(database);
    }
  }
}

/**
 * Seed the database.
 */
export async function seed(database: Database) {
  for await (const module of Object.values(api)) {
    if (
      typeof module === "object" &&
      module !== null &&
      "seed" in module &&
      typeof module.seed === "function"
    ) {
      await module.seed(database);
    }
  }
}
