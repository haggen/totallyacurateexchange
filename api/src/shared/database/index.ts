import * as sqlite from "bun:sqlite";
import { print } from "~/src/shared/log";

/**
 * Type of database binding value.
 */
export type Value = string | number | boolean | null;

/**
 * Type of database bindings.
 */
export type Bindings = Value | Record<string, Value>;

/**
 * Context of a database operation.
 */
export type Context<P extends Record<string, unknown> = never> = {
  database: Database;
  payload: P;
};

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

    // Enabling SQLite's write-ahead improves concurrent writes performance.
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
   * Prepare statement and run it, with no returning value.
   */
  async run(sql: string, ...bindings: Bindings[]) {
    if (!this.instance) {
      throw new Error("Database is closed");
    }
    if (this.verbose) {
      print("log", "database.run", sql, bindings);
    }
    this.instance.query<never, Bindings[]>(sql).run(...bindings);
  }

  /**
   * Prepare statement and return at most a single record.
   */
  async get<T>(sql: string, ...bindings: Bindings[]) {
    if (!this.instance) {
      throw new Error("Database is closed");
    }
    if (this.verbose) {
      print("log", "database.get", sql, bindings);
    }
    return this.instance.query<T, Bindings[]>(sql).get(...bindings);
  }

  /**
   * Prepare statement and return all records.
   */
  async all<T>(sql: string, ...bindings: Bindings[]) {
    if (!this.instance) {
      throw new Error("Database is closed");
    }
    if (this.verbose) {
      print("log", "database.all", sql, bindings);
    }
    return this.instance.query<T, Bindings[]>(sql).all(...bindings);
  }
}
