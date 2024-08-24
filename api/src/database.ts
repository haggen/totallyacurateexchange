import type { Database } from "bun:sqlite";
import { api } from "~/src/api";
import { getConfig } from "~/src/config";
import { open } from "~/src/shared/database";

/**
 * Global database instance.
 */
let globalDatabaseInstance: Database;

/**
 * Get global database instance.
 */
export function database() {
  return globalDatabaseInstance;
}

/**
 * Run all migrations.
 */
export function migrate() {
  api.users.migrate();
}

/**
 * (Re)initialize global database instance and run migrations.
 */
export function prepare() {
  globalDatabaseInstance?.close(false);
  globalDatabaseInstance = open(getConfig("databaseUrl"));

  migrate();
}
