import * as sqlite from "bun:sqlite";
import { print } from "~/src/shared/log";

/**
 * Type of database binding value.
 */
export type Binding = string | number | boolean | null;

/**
 * Database instance wrap.
 */
export class Database {
  /** Actual database instance. */
  instance: sqlite.Database | undefined;

  /** If it should log queries. */
  verbose = false;

  /**
   * Open a database connection.
   */
  static async open(url: URL) {
    const database = new Database();
    await database.open(url);
    return database;
  }

  /**
   * Open a database connection.
   */
  async open(url: URL) {
    if (url.protocol !== "sqlite:") {
      throw new Error(
        `Unsupported database protocol ${JSON.stringify(url.protocol)}`,
      );
    }

    this.instance = new sqlite.Database(url.pathname.slice(1), {
      strict: true,
    });

    // Enabling SQLite's write-ahead improves performance of concurrent writes.
    this.instance.exec("PRAGMA journal_mode = WAL;");
  }

  /**
   * Close the database connection.
   */
  async close() {
    this.instance?.close(true);
    this.instance = undefined;
    return Promise.resolve();
  }

  /**
   * Support `using database = new Database()`.
   */
  async [Symbol.asyncDispose]() {
    await this.close();
  }

  /**
   * Prepare statement and execute it synchronously.
   */
  execute<T>(
    operation: "run" | "all" | "get",
    sql: string,
    ...bindings: Binding[]
  ) {
    if (!this.instance) {
      throw new Error("Database is closed");
    }

    performance.mark("query");

    try {
      return this.instance.query<T, Binding[]>(sql)[operation](...bindings);
    } finally {
      const { duration } = performance.measure("query", "query");
      print("log", "database.run", sql, bindings, `${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Prepare statement and run it, with no returning value.
   */
  async run(sql: string, ...bindings: Binding[]) {
    return this.execute<void>("run", sql, ...bindings);
  }

  /**
   * Prepare statement and return at most a single record.
   */
  async get<T>(sql: string, ...bindings: Binding[]) {
    return this.execute<T>("get", sql, ...bindings) as T | undefined;
  }

  /**
   * Prepare statement and return all records.
   */
  async all<T>(sql: string, ...bindings: Binding[]) {
    return this.execute<T[]>("all", sql, ...bindings) as T[];
  }

  /**
   * Run the given function inside a transaction.
   */
  async transaction(tx: () => Promise<void>) {
    if (!this.instance) {
      throw new Error("Database is closed");
    }

    try {
      await this.run("BEGIN;");
      await tx();
      await this.run("COMMIT;");
    } catch (err) {
      await this.run("ROLLBACK;");
      throw err;
    }
  }
}
