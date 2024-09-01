import type { Statement } from "bun:sqlite";

/**
 * Query error.
 */
export class QueryError extends Error {
  constructor(query: Statement) {
    super(`Query failed: ${query}`);
  }
}
