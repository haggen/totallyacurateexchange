import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import type { api } from "~/src/api";
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

  const holdings = await database.all<z.infer<api.holdings.Holding>>(
    ...sql.q`SELECT * FROM holdings ${criteria};`,
  );

  const stocks = await database.all<z.infer<api.stocks.Stock>>(
    ...sql.q`SELECT * FROM stocks WHERE id IN (${new sql.List(holdings.map((holding) => holding.stockId))}) LIMIT ${holdings.length};`,
  );

  return ctx.json(
    {
      data: holdings.map((holdings) => ({
        ...holdings,
        stock: stocks.find((stock) => stock.id === holdings.stockId),
      })),
    },
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

  return ctx.json({ data: { ...holding, stock } });
});
