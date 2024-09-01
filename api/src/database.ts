import type { Database } from "bun:sqlite";
import { api } from "~/src/api";
import { getConfig } from "~/src/config";
import { open } from "~/src/shared/database";

/**
 * Global database instance.
 */
let instance: Database;

/**
 * Get global database instance.
 */
export function database() {
  return instance;
}

/**
 * Run all migrations.
 */
export function migrate() {
  for (const module of Object.values(api)) {
    if (
      typeof module === "object" &&
      module !== null &&
      "migrate" in module &&
      typeof module.migrate === "function"
    ) {
      module.migrate();
    }
  }
}

/**
 * (Re)initialize global database instance and run migrations.
 */
export function prepare() {
  instance?.close(false);
  instance = open(getConfig("databaseUrl"));

  migrate();
}
