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

  const stocks = await database.all<z.infer<api.stocks.Stock>>(
    ...sql.q`SELECT * FROM stocks ORDER BY name ASC;`,
  );

  return ctx.json(stocks);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const id = Id.parse(ctx.req.param("id"));

  const criteria = new sql.Criteria();
  criteria.push("id = ?", id);

  const stock = await database.get<z.infer<api.stocks.Stock>>(
    ...sql.q`SELECT * FROM stocks ${criteria} LIMIT 1;`,
  );

  if (!stock) {
    return ctx.json({}, Status.NotFound);
  }

  return ctx.json(stock);
});
