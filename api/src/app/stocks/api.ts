import { z } from "zod";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { AutoDateTime, Id, Name } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import * as sql from "~/src/shared/sql";

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

  const entry = new sql.Entry(data);

  return must(
    await ctx.database.get<z.output<Stock>>(
      `INSERT INTO stocks ${entry} RETURNING *;`,
      ...entry.bindings,
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
  const criteria = new sql.Criteria();
  const limit = new sql.Limit();
  const offset = new sql.Offset();

  scope(ctx.payload, "id", (id) => {
    criteria.set("id = ?", Id.parse(id));
    limit.set(1);
  });

  scope(ctx.payload, "limit", limit.set);
  scope(ctx.payload, "offset", offset.set);

  const q = new sql.Query("SELECT * FROM stocks", criteria, limit, offset);

  return await ctx.database.all<z.output<Stock>>(...q.toParams());
}
