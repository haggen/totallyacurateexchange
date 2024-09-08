import { z } from "zod";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { AutoDateTime, Id, Name } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import { getInsertValues } from "~/src/shared/sql";
import { select } from "~/src/shared/sql/select";

/**
 * Stock schema.
 */
export const Stock = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  name: Name,
});

/**
 * Stock shape.
 */
export type Stock = typeof Stock;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  await database.run(
    `
      CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        name TEXT NOT NULL UNIQUE
      );
    `,
  );
}

/**
 * Seed data.
 */
export async function seed(database: Database) {
  const { count } = must(
    await database.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM stocks;",
    ),
  );

  if (count > 0) {
    return;
  }

  const data = [
    { name: "WaffleTech Inc." },
    { name: "QuirkCo Ventures" },
    { name: "FizzBizz Ltd." },
    { name: "NoodleWorks Industries" },
    { name: "ZapTurtle Corp." },
    { name: "BananaFusion Holdings" },
    { name: "Plop & Sons" },
    { name: "ZonkWare Solutions" },
    { name: "GiggleBits Enterprises" },
    { name: "FunkySprocket LLC" },
    { name: "DoodlePlex Innovations" },
    { name: "SnazzyFrogs Trading" },
    { name: "BumbleBop Inc." },
    { name: "SlickPickle Corp." },
    { name: "WobbleWing Dynamics" },
    { name: "FlapJack Solutions" },
    { name: "WizzleBerry Enterprises" },
    { name: "NiftyNoodle Ltd." },
    { name: "SlapDash Inc." },
    { name: "PogoPigeon Industries" },
  ];

  for (const payload of data) {
    await create({ database, payload });
  }
}

/**
 * Create a new stock.
 */
export async function create(ctx: Context<Pick<z.input<Stock>, "name">>) {
  const data = Stock.pick({
    createdAt: true,
    updatedAt: true,
    name: true,
  }).parse(ctx.payload);

  return must(
    await ctx.database.get<z.output<Stock>>(
      `INSERT INTO stocks ${getInsertValues(data)} RETURNING *;`,
      data,
    ),
  );
}

/**
 * Find existing stocks.
 */
export async function find(
  ctx: Context<
    { limit?: number; offset?: number } | { id: z.input<typeof Id> }
  >,
) {
  const query = select("*").from("stocks");

  scope(ctx.payload, "id", (id) =>
    query.where("id = ?", Id.parse(id)).limit(1),
  );

  scope(ctx.payload, "limit", (limit) => query.limit(limit));

  scope(ctx.payload, "offset", (offset) => query.offset(offset));

  return await ctx.database.all<z.output<Stock>>(...query.toParams());
}
