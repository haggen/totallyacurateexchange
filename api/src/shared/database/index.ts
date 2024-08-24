import { Database, type Statement } from "bun:sqlite";
import type { z } from "zod";
import type { Id } from "~/src/shared/schema";

export type { SQLQueryBindings as Bindings } from "bun:sqlite";

/**
 * Session type.
 */
export type Session = {
  userId: z.infer<typeof Id>;
};

/**
 * Helper type for optional context properties.
 */
type Optional<K extends string, T extends Record<string, unknown>> = [
  T,
] extends [never]
  ? // biome-ignore lint/complexity/noBannedTypes: Not sure what else to use.
    {}
  : { [key in K]: T };

/**
 * Context for database operations.
 */
export type Context<
  P extends Record<string, unknown> = never,
  O extends Record<string, unknown> = never,
> = { session?: Session } & Optional<"options", O> & Optional<"payload", P>;

/**
 * Open a new database.
 */
export function open(url: URL) {
  if (url.protocol !== "sqlite:") {
    throw new Error(
      `Unsupported database protocol ${JSON.stringify(url.protocol)}`,
    );
  }

  const database = new Database(url.pathname.slice(1), { strict: true });

  // Enabling SQLite's write-ahead improves concurrent writes performance.
  database.exec("PRAGMA journal_mode = WAL;");

  return database;
}

/**
 * Get SQL for insert values.
 */
export function getInsertValues<T extends Record<string, unknown>>(data: T) {
  return `(${Object.keys(data).join(", ")}) VALUES (${Object.keys(data)
    .map((key) => `$${key}`)
    .join(", ")})`;
}

/**
 * Get SQL for update values.
 */
export function getUpdateSet<T extends Record<string, unknown>>(data: T) {
  return Object.entries(data)
    .map(([key, value]) => (value !== undefined ? `${key} = $${key}` : ""))
    .filter(Boolean)
    .join(", ");
}

/**
 * Query error.
 */
export class QueryError extends Error {
  constructor(query: Statement) {
    super(`Query failed: ${query}`);
  }
}
