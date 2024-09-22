import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import type { api } from "~/src/api";
import { hash } from "~/src/shared/object";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const portfolio = await database.get<z.infer<api.portfolios.Portfolio>>(
    ...sql.q`SELECT id FROM portfolios WHERE userId = ${session.userId} LIMIT 1;`,
  );

  if (!portfolio) {
    throw new HTTPException(Status.NotFound);
  }

  const criteria = new sql.Criteria();

  criteria.push("portfolioId = ?", portfolio.id);
  criteria.push("shares > ?", 0);

  const holdings = await database.all<z.infer<api.holdings.Holding>>(
    ...sql.q`SELECT * FROM holdings ${criteria};`,
  );

  const stocks = hash(
    await database.all<z.infer<api.stocks.Stock>>(
      ...sql.q`SELECT * FROM stocks;`,
    ),
    (stock) => stock.id,
  );

  return ctx.json(
    holdings.map((holdings) => ({
      ...holdings,
      stock: stocks[holdings.stockId],
    })),
    Status.Ok,
  );
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const id = Id.parse(ctx.req.param("id"));

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const criteria = new sql.Criteria();
  criteria.push("holdings.id = ?", id);
  criteria.push("portfolios.userId = ?", session.userId);

  const holding = await database.get<z.infer<api.holdings.Holding>>(
    ...sql.q`SELECT holdings.* FROM holdings JOIN portfolios ON portfolios.id = holdings.portfolioId ${criteria} LIMIT 1;`,
  );

  if (!holding) {
    throw new HTTPException(Status.NotFound);
  }

  const stock = await database.get<z.infer<api.stocks.Stock>>(
    ...sql.q`SELECT * FROM stocks WHERE id = ${holding.stockId} LIMIT 1;`,
  );

  return ctx.json({ ...holding, stock });
});
