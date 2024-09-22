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
      ...new sql.Query(
        "UPDATE holdings",
        new sql.Patch({
          shares: holding.shares - order.shares,
        }),
        ["WHERE id = ?", holding.id],
      ).toExpr(),
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
  status: z.string().optional().default("pending,fulfilled,cancelled"),
  hide: Id.optional(),
  from: z.string().date().optional(),
  until: z.string().date().optional(),
  page: z.coerce.number().default(1),
  length: z.coerce.number().default(100),
  sort: z.string().optional().default("createdAt"),
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const params = Params.parse(ctx.req.query());

  const criteria = new sql.Criteria();

  scope(params, "hide", (portfolioId) => {
    criteria.push("portfolioId != ?", portfolioId);
  });

  scope(params, "portfolio", (portfolioId) => {
    criteria.push("portfolioId = ?", portfolioId);
  });

  scope(params, "from", (from) => {
    criteria.push("createdAt >= ?", from);
  });

  scope(params, "until", (until) => {
    criteria.push("createdAt <= ?", until);
  });

  scope(params, "status", (status) => {
    const list = new sql.List(status.split(","));
    criteria.push(`status IN ${list}`, ...list.bindings);
  });

  const order = new sql.Order(
    "CASE status WHEN 'pending' THEN 1 ELSE 2 END ASC",
    "createdAt DESC",
  );
  const pagination = new sql.Pagination(params.length, params.page);

  const orders = await database.all<z.infer<api.orders.Order>>(
    ...new sql.Query(
      "SELECT * FROM orders",
      criteria,
      order,
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

  const portfolio = await database.get<z.infer<api.portfolios.Portfolio>>(
    ...new sql.Query(
      "SELECT * FROM portfolios",
      ["WHERE userId = ?", session.userId],
      "LIMIT 1;",
    ).toExpr(),
  );

  if (!portfolio) {
    throw new HTTPException(Status.NotFound);
  }

  const criteria = new sql.Criteria();
  criteria.push("id = ?", id);
  criteria.push("portfolioId = ?", portfolio.id);
  criteria.push("status = ?", "pending");

  const order = await database.get<z.infer<api.orders.Order>>(
    ...new sql.Query(
      "UPDATE orders",
      new sql.Patch(api.orders.patch({ status: "cancelled" })),
      criteria,
      "RETURNING *;",
    ).toExpr(),
  );

  if (!order) {
    throw new HTTPException(Status.NotFound);
  }

  // We need to refund who posted the order.
  if (order.type === "bid") {
    await database.run(
      ...new sql.Query(
        "UPDATE portfolios",
        new sql.Patch({
          balance: portfolio.balance + order.price * order.shares,
        }),
        ["WHERE id = ?", portfolio.id],
      ).toExpr(),
    );
  } else if (order.type === "ask") {
    const holding = must(
      await database.get<z.infer<api.holdings.Holding>>(
        ...new sql.Query(
          "SELECT * FROM holdings",
          [
            "WHERE portfolioId = ? AND stockId = ?",
            portfolio.id,
            order.stockId,
          ],
          "LIMIT 1;",
        ).toExpr(),
      ),
    );

    await database.run(
      ...new sql.Query(
        "UPDATE holdings",
        new sql.Patch({
          shares: holding.shares + order.shares,
        }),
        ["WHERE id = ?", holding.id],
      ).toExpr(),
    );
  }

  return ctx.json(order);
});
