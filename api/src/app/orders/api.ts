import { z } from "zod";
import { api } from "~/src/api";
import type { Context, Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import { omit } from "~/src/shared/object";
import { AutoDateTime, Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import * as sql from "~/src/shared/sql";

/**
 * Order schema.
 */
export const Order = z.object({
  id: Id,
  createdAt: AutoDateTime,
  updatedAt: AutoDateTime,
  portfolioId: Id,
  stockId: Id,
  status: z.enum(["pending", "completed", "cancelled"]),
  type: z.enum(["bid", "ask"]),
  price: z.coerce.number().gte(0),
  volume: z.coerce.number().gte(0),
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
        status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
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
 * Create a new order.
 */
export async function create(
  ctx: Context<
    Pick<
      z.input<Order>,
      "portfolioId" | "stockId" | "type" | "price" | "volume"
    >
  >,
) {
  const data = Order.pick({
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
    ...ctx.payload,
    status: "pending",
    remaining: ctx.payload.volume,
  });

  const entry = new sql.Entry(data);

  return must(
    await ctx.database.get<z.infer<Order>>(
      `INSERT INTO orders ${entry} RETURNING *;`,
      ...entry.bindings,
    ),
  );
}

/**
 * Find existing orders.
 */
export async function find(
  ctx: Context<
    | {
        type?: z.input<typeof Order.shape.type>;
        price?: number;
        remaining?: number;
        stockId?: z.input<typeof Id>;
        portfolioId?: z.input<typeof Id>;
        limit?: number;
        offset?: number;
      }
    | { id: z.input<typeof Id> }
  >,
) {
  const criteria = new sql.Criteria();
  const limit = new sql.Limit();
  const offset = new sql.Offset();

  scope(ctx.payload, "id", (id) => {
    criteria.set("id = ?", Id.parse(id));
    limit.set(1);
  });

  scope(ctx.payload, "type", (type) => {
    criteria.push("type = ?", Order.shape.type.parse(type));
  });

  scope(ctx.payload, "price", (price) => {
    criteria.push("price <= ?", price);
  });

  scope(ctx.payload, "remaining", (remaining) => {
    criteria.push("remaining >= ?", remaining);
  });

  scope(ctx.payload, "portfolioId", (portfolioId) => {
    criteria.push("portfolioId = ?", Id.parse(portfolioId));
  });

  scope(ctx.payload, "stockId", (stockId) => {
    criteria.push("stockId = ?", Id.parse(stockId));
  });

  scope(ctx.payload, "limit", limit.set);
  scope(ctx.payload, "offset", offset.set);

  const q = new sql.Query("SELECT * FROM orders", criteria, limit, offset);

  return await ctx.database.all<z.infer<Order>>(...q.toParams());
}

/**
 * Update existing order.
 */
export async function update(
  ctx: Context<
    Pick<z.input<Order>, "id"> &
      Partial<Pick<z.input<Order>, "status" | "volume" | "remaining">>
  >,
) {
  const data = z
    .object({
      id: Id,
      updatedAt: Order.shape.updatedAt,
      status: Order.shape.status.optional(),
      remaining: Order.shape.remaining.optional(),
    })
    .parse(ctx.payload);

  const patch = new sql.Patch(omit(data, "id"));

  return await ctx.database.get(
    `UPDATE orders SET ${patch} WHERE id = ? RETURNING *;`,
    ...patch.bindings,
    data.id,
  );
}
