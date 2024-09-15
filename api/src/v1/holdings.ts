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

  const portfolios = await database.all<z.infer<api.portfolios.Portfolio>>(
    "SELECT * FROM portfolios WHERE userId = ?;",
    session.userId,
  );

  if (portfolios.length === 0) {
    throw new HTTPException(Status.NotFound);
  }

  const criteria = new sql.Criteria();

  criteria.push(
    ...new sql.In("portfolioId", ...portfolios.map(({ id }) => id)).toParams(),
  );

  const holdings = await database.all<z.infer<api.holdings.Holding>>(
    ...new sql.Query("SELECT * FROM holdings", criteria).toParams(),
  );

  return ctx.json({ data: holdings }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const id = Id.parse(ctx.req.param("id"));

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const portfolios = await database.all<z.infer<api.portfolios.Portfolio>>(
    "SELECT * FROM portfolios WHERE userId = ? LIMIT 1;",
    session.userId,
  );

  if (portfolios.length === 0) {
    throw new HTTPException(Status.NotFound);
  }

  const criteria = new sql.Criteria();

  criteria.push("id = ?", id);
  criteria.push(
    ...new sql.In("portfolioId", ...portfolios.map(({ id }) => id)).toParams(),
  );

  const holding = await database.get<z.infer<api.holdings.Holding>>(
    ...new sql.Query("SELECT * FROM holdings", criteria, "LIMIT 1").toParams(),
  );

  if (!holding) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: holding });
});
