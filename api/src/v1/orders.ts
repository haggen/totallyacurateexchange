import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src/api";
import { must } from "~/src/shared/must";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.post("/", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const payload = await ctx.req.json();

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const order = api.orders.create({
    portfolioId: payload.portfolioId,
    stockId: payload.stockId,
    type: payload.type,
    price: payload.price,
    shares: payload.shares,
  });

  const portfolio = await database.get<z.infer<api.portfolios.Portfolio>>(
    ...sql.q`SELECT * FROM portfolios WHERE id = ${order.portfolioId} AND userId = ${session.userId} LIMIT 1;`,
  );

  if (!portfolio) {
    throw new HTTPException(Status.UnprocessableEntity);
  }

  if (order.type === "ask") {
    const holding = await database.get<z.infer<api.holdings.Holding>>(
      ...sql.q`SELECT * FROM holdings WHERE portfolioId = ${order.portfolioId} AND stockId = ${order.stockId} LIMIT 1;`,
    );

    if (!holding) {
      throw new HTTPException(Status.UnprocessableEntity);
    }

    if (holding.shares < order.shares) {
      throw new HTTPException(Status.UnprocessableEntity);
    }

    await database.run(
      ...sql.q`UPDATE holdings ${new sql.Patch({
        shares: holding.shares - order.shares,
      })} id = ${holding.id};`,
    );
  } else if (order.type === "bid") {
    const total = order.price * order.shares;

    if (portfolio.balance < total) {
      throw new HTTPException(Status.UnprocessableEntity);
    }

    await database.run(
      ...sql.q`UPDATE portfolios ${new sql.Patch({
        balance: portfolio.balance - total,
      })} WHERE id = ${portfolio.id};`,
    );
  }

  Object.assign(
    order,
    must(
      await database.get<z.infer<api.orders.Order>>(
        ...sql.q`INSERT INTO orders ${new sql.Entry(order)} RETURNING *;`,
      ),
    ),
  );

  const stock = must(
    await database.get<z.infer<api.stocks.Stock>>(
      ...sql.q`SELECT * FROM stocks WHERE id = ${order.stockId} LIMIT 1;`,
    ),
  );

  return ctx.json({ order, ...stock }, Status.Created);
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");

  const orders = await database.all<z.infer<api.orders.Order>>(
    ...sql.q`SELECT * FROM orders WHERE status = 'pending' ORDER BY createdAt DESC;`,
  );

  const stocks = await database.all<z.infer<api.stocks.Stock>>(
    ...sql.q`SELECT * FROM stocks;`,
  );

  return ctx.json(
    orders.map((order) => ({
      ...order,
      stock: stocks.find(({ id }) => order.stockId === id),
    })),
    Status.Ok,
  );
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const id = Id.parse(ctx.req.param("id"));

  const criteria = new sql.Criteria();
  criteria.push("id = ?", id);

  const order = await database.get<z.infer<api.orders.Order>>(
    ...sql.q`SELECT * FROM orders ${criteria} LIMIT 1;`,
  );

  if (!order) {
    return ctx.json({}, Status.NotFound);
  }

  const stock = must(
    await database.get<z.infer<api.stocks.Stock>>(
      ...sql.q`SELECT * FROM stocks WHERE id = ${order.stockId} LIMIT 1;`,
    ),
  );

  return ctx.json({ order, ...stock });
});
