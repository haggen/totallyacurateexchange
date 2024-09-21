import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { api } from "~/src/api";
import { must } from "~/src/shared/must";
import { hash } from "~/src/shared/object";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
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
    ...new sql.Query(
      "SELECT * FROM portfolios",
      ["WHERE id = ? AND userId = ?", order.portfolioId, session.userId],
      "LIMIT 1;",
    ).toExpr(),
  );

  if (!portfolio) {
    throw new HTTPException(Status.UnprocessableEntity);
  }

  if (order.type === "ask") {
    const holding = await database.get<z.infer<api.holdings.Holding>>(
      ...new sql.Query(
        "SELECT * FROM holdings",
        [
          "WHERE portfolioId = ? AND stockId = ?",
          order.portfolioId,
          order.stockId,
        ],
        "LIMIT 1;",
      ).toExpr(),
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

const Params = z.object({
  portfolio: Id.optional(),
  from: z.string().date().optional(),
  until: z.string().date().optional(),
  page: z.coerce.number().default(1),
  length: z.coerce.number().default(100),
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const params = Params.parse(ctx.req.query());

  const criteria = new sql.Criteria();
  criteria.push("status = ?", "pending");
  scope(params, "portfolio", (portfolioId) => {
    criteria.push("portfolioId = ?", portfolioId);
  });
  scope(params, "from", (from) => {
    criteria.push("createdAt >= ?", from);
  });
  scope(params, "until", (until) => {
    criteria.push("createdAt <= ?", until);
  });

  const pagination = new sql.Pagination(100, params.page);

  const orders = await database.all<z.infer<api.orders.Order>>(
    ...new sql.Query(
      "SELECT * FROM orders",
      criteria,
      "ORDER BY createdAt DESC",
      pagination,
    ).toExpr(),
  );

  const stocks = hash(
    await database.all<z.infer<api.stocks.Stock>>(
      ...sql.q`SELECT * FROM stocks;`,
    ),
    (stock) => stock.id,
  );

  return ctx.json(
    orders.map((order) => ({
      ...order,
      stock: stocks[order.stockId],
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

app.delete("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const id = Id.parse(ctx.req.param("id"));

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const criteria = new sql.Criteria();
  criteria.push("id = ?", id);
  criteria.push("userId = ?", session.userId);

  const order = await database.get<z.infer<api.orders.Order>>(
    ...sql.q`UPDATE orders SET ${new sql.Patch(api.orders.patch({ status: "cancelled" }))} WHERE ${criteria};`,
  );

  if (!order) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json(order);
});
