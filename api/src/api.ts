import * as sessions from "~/src/app/sessions/api";
import * as users from "~/src/app/users/api";
import type { Database } from "~/src/shared/database";

/**
 * Data API entrypoint.
 */
export const api = {
  users,
  sessions,
};

/**
 * Run all migrations.
 */
export function migrate(database: Database) {
  for (const module of Object.values(api)) {
    if (
      typeof module === "object" &&
      module !== null &&
      "migrate" in module &&
      typeof module.migrate === "function"
    ) {
      module.migrate(database);
    }
  }
}
