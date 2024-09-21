import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import { api } from "~/src/api";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env<z.infer<api.sessions.Session>>>();
export default app;

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const criteria = new sql.Criteria();
  criteria.push("id = ?", session.userId);

  const user = await database.get<z.infer<api.users.User>>(
    ...sql.q`SELECT * FROM users ${criteria} LIMIT 1;`,
  );

  if (!user) {
    throw new HTTPException(Status.NotFound);
  }

  const portfolio = await database.get<
    z.infer<api.portfolios.Portfolio> & { total: number }
  >(
    ...sql.q`
      SELECT portfolios.*, portfolios.balance + COALESCE(SUM(stocks.price * holdings.shares), 0) AS total FROM portfolios 
      LEFT JOIN holdings ON holdings.portfolioId = portfolios.id
      LEFT JOIN stocks ON stocks.id = holdings.stockId
      WHERE portfolios.userId = ${session.userId} GROUP BY portfolios.id LIMIT 1;
    `,
  );

  if (!portfolio) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ ...user, portfolio });
});

app.patch("/", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const payload = await ctx.req.json();

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const patch = new sql.Patch(await api.users.patch(payload));

  const criteria = new sql.Criteria();
  criteria.push("id = ?", session.userId);

  const user = await database.get<z.infer<api.users.User>>(
    ...sql.q`UPDATE users ${patch} ${criteria} RETURNING *;`,
  );

  return ctx.json(user);
});
