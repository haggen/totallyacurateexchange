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

  const criteria = new sql.Criteria();

  criteria.push("userId = ?", session.userId);

  const portfolios = await database.all<z.infer<api.portfolios.Portfolio>>(
    `SELECT * FROM portfolios ${criteria};`,
    ...criteria.bindings,
  );

  return ctx.json({ data: portfolios }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");
  const id = Id.parse(ctx.req.param("id"));

  if (!session) {
    throw new HTTPException(Status.Unauthorized);
  }

  const criteria = new sql.Criteria();

  criteria.push("id = ?", id);
  criteria.push("userId = ?", session.userId);

  const portfolio = await database.get<z.infer<api.portfolios.Portfolio>>(
    "SELECT * FROM portfolios ${criteria} LIMIT 1;",
    ...criteria.bindings,
  );

  if (!portfolio) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: portfolio });
});
