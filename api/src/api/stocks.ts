import { z } from "zod";
import type { Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { AutoDateTime, Id, Name } from "~/src/shared/schema";
import * as sql from "~/src/shared/sql";
import type { AtLeastOne } from "~/src/shared/types";

/**
 * Stock schema.
 */
export const Stock = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  name: Name,
  price: z.number().default(0),
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
        name TEXT NOT NULL UNIQUE,
        price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0)
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

  const stocks = [
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

  for await (const data of stocks) {
    const entry = new sql.Entry(create(data));
    await database.run(...sql.q`INSERT INTO stocks ${entry};`);
  }
}

/**
 * Create a new stock.
 */
export function create(data: Pick<z.input<Stock>, "name">) {
  return Stock.pick({
    createdAt: true,
    updatedAt: true,
    name: true,
  }).parse(data);
}

/*
 * Create a patch.
 */
export function patch(
  data: AtLeastOne<Pick<z.input<Stock>, "name" | "price">>,
) {
  return z
    .object({
      updatedAt: Stock.shape.updatedAt,
      name: Stock.shape.name.optional(),
      price: Stock.shape.price.optional(),
    })
    .parse(data);
}
