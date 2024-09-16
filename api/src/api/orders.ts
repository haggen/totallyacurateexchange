import { z } from "zod";
import { api } from "~/src/api";
import type { Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { random } from "~/src/shared/random";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";

/**
 * Order schema.
 */
export const Order = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  portfolioId: Id,
  stockId: Id,
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  type: z.enum(["bid", "ask"]),
  price: z.coerce.number().gte(0),
  volume: z.coerce.number().gt(0),
  remaining: z.coerce.number().gte(0),
});

/**
 * Order shape.
 */
export type Order = typeof Order;

/**
 * Run migrations.
 */
export async function migrate(database: Database) {
  await api.portfolios.migrate(database);
  await api.stocks.migrate(database);

  await database.run(
    `
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        portfolioId INTEGER NOT NULL REFERENCES portfolios(id),
        stockId INTEGER NOT NULL REFERENCES stocks(id),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
        type TEXT NOT NULL CHECK (type IN ('bid', 'ask')),
        price INTEGER NOT NULL CHECK (price >= 0),
        volume INTEGER NOT NULL CHECK (volume > 0),
        remaining INTEGER NOT NULL CHECK (remaining >= 0),

        CHECK (volume >= remaining)
      );
    `,
  );
}

/**
 * Seed the database.
 */
export async function seed(database: Database) {
  await api.stocks.seed(database);

  await database.transaction(async () => {
    const { count } = must(
      await database.get<{ count: number }>(
        "SELECT COUNT(*) AS count FROM orders;",
      ),
    );

    if (count > 0) {
      return;
    }

    const stockmaster = must(
      await database.get<z.infer<api.users.User>>(
        ...new sql.Query(
          "INSERT INTO users",
          new sql.Entry(
            await api.users.create({
              name: "Stockmaster",
              email: "stockmaster@totallyacurateexchange.crz.li",
              password: random.string(15),
            }),
          ),
          "RETURNING *",
        ).toExpr(),
      ),
    );

    const portfolio = must(
      await database.get<z.infer<api.portfolios.Portfolio>>(
        ...new sql.Query(
          "INSERT INTO portfolios",
          new sql.Entry(api.portfolios.create({ userId: stockmaster.id })),
          "RETURNING *",
        ).toExpr(),
      ),
    );

    const stocks = await database.all<z.infer<api.stocks.Stock>>(
      "SELECT * FROM stocks;",
    );

    for await (const stock of stocks) {
      await database.run(
        ...new sql.Query(
          "INSERT INTO orders",
          new sql.Entry(
            create({
              portfolioId: portfolio.id,
              stockId: stock.id,
              type: "ask",
              price: random.number(100, 1000),
              volume: random.number(50, 100),
            }),
          ),
        ).toExpr(),
      );
    }
  });
}

/**
 * Create a new order.
 */
export function create(
  data: Pick<
    z.input<Order>,
    "portfolioId" | "stockId" | "type" | "price" | "volume"
  >,
) {
  return Order.pick({
    createdAt: true,
    updatedAt: true,
    portfolioId: true,
    stockId: true,
    status: true,
    type: true,
    price: true,
    volume: true,
    remaining: true,
  }).parse({
    ...data,
    status: "pending",
    remaining: data.volume,
  });
}

/**
 * Create a patch.
 */
export function patch(
  data: Partial<
    Pick<z.input<Order>, "status" | "type" | "price" | "volume" | "remaining">
  >,
) {
  const patch = z
    .object({
      updatedAt: Order.shape.updatedAt,
      status: Order.shape.status.optional(),
      type: Order.shape.type.optional(),
      price: Order.shape.price.optional(),
      volume: Order.shape.volume.optional(),
      remaining: Order.shape.remaining.optional(),
    })
    .parse(data);

  if (patch.remaining === 0) {
    patch.status = "completed";
  }

  return patch;
}
