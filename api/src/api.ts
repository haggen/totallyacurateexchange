import * as holdings from "~/src/app/holdings/api";
import * as portfolios from "~/src/app/portfolios/api";
import * as sessions from "~/src/app/sessions/api";
import * as stocks from "~/src/app/stocks/api";
import * as users from "~/src/app/users/api";
import type { Database } from "~/src/shared/database";

/**
 * Data API entrypoint.
 */
export const api = {
  portfolios,
  stocks,
  users,
  sessions,
  holdings,
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
