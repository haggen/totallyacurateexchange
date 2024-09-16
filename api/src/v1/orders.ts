import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src/api";
import { UnauthorizedError } from "~/src/shared/error";
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
    throw new UnauthorizedError();
  }

  const data = api.orders.create({
    portfolioId: payload.portfolioId,
    stockId: payload.stockId,
    type: payload.type,
    price: payload.price,
    volume: payload.volume,
  });

  const portfolio = await database.get<z.infer<api.portfolios.Portfolio>>(
    "SELECT * FROM portfolios WHERE id = ? AND userId = ? LIMIT 1;",
    data.portfolioId,
    session.userId,
  );

  if (!portfolio) {
    throw new HTTPException(Status.UnprocessableEntity);
  }

  if (data.type === "ask") {
    const holding = await database.get<z.infer<api.holdings.Holding>>(
      "SELECT * FROM holdings WHERE portfolioId = ? AND stockId = ? LIMIT 1;",
      data.portfolioId,
      data.stockId,
    );

    if (!holding) {
      throw new HTTPException(Status.UnprocessableEntity);
    }

    if (holding.volume < data.volume) {
      throw new HTTPException(Status.UnprocessableEntity);
    }

    await database.run(
      ...new sql.Query(
        "UPDATE holdings",
        new sql.Patch({
          volume: holding.volume - data.volume,
        }),
        new sql.Criteria("id = ?", holding.id),
      ).toExpr(),
    );
  } else if (data.type === "bid") {
    const cost = data.price * data.volume;

    if (portfolio.balance < cost) {
      throw new HTTPException(Status.UnprocessableEntity);
    }

    await database.run(
      ...new sql.Query(
        "UPDATE portfolios",
        new sql.Patch({
          balance: portfolio.balance - cost,
        }),
        new sql.Criteria("id = ?", portfolio.id),
      ).toExpr(),
    );
  }

  const entry = new sql.Entry(data);

  const order = must(
    await database.get<z.infer<api.orders.Order>>(
      `INSERT INTO orders ${entry} RETURNING *;`,
      ...entry.bindings,
    ),
  );

  return ctx.json({ data: order }, Status.Created);
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");

  const criteria = new sql.Criteria();

  const orders = await database.all<z.infer<api.orders.Order>>(
    ...new sql.Query(
      "SELECT * FROM orders",
      criteria,
      "ORDER BY createdAt DESC",
    ).toExpr(),
  );

  return ctx.json({ data: orders }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const id = Id.parse(ctx.req.param("id"));

  const criteria = new sql.Criteria();

  criteria.push("id = ?", id);

  const order = await database.get<z.infer<api.orders.Order>>(
    ...new sql.Query("SELECT * FROM orders", criteria, "LIMIT 1").toExpr(),
  );

  if (!order) {
    return ctx.json(undefined, Status.NotFound);
  }

  return ctx.json({ data: order });
});
