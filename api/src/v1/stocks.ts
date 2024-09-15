import { Hono } from "hono";
import type { z } from "zod";
import type { api } from "~/src/api";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { Id } from "~/src/shared/schema";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env>();
export default app;

app.get("/", async (ctx) => {
  const database = ctx.get("database");

  const criteria = new sql.Criteria();

  const stocks = await database.all<z.infer<api.stocks.Stock>>(
    ...new sql.Query(
      "SELECT * FROM stocks",
      criteria,
      "ORDER BY name ASC",
    ).toParams(),
  );

  return ctx.json({ data: stocks }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const id = Id.parse(ctx.req.param("id"));

  const criteria = new sql.Criteria();

  criteria.push("id = ?", id);

  const stock = await database.get<z.infer<api.stocks.Stock>>(
    ...new sql.Query(
      "SELECT * FROM stocks",
      criteria,
      "ORDER BY name ASC",
    ).toParams(),
  );

  if (!stock) {
    return ctx.json(undefined, Status.NotFound);
  }

  return ctx.json({ data: stock });
});
