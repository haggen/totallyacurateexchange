import { Hono } from "hono";
import { DateTime } from "luxon";
import { z } from "zod";
import type { api } from "~/src/api";
import { hash } from "~/src/shared/object";
import type { Env } from "~/src/shared/request";
import { Id } from "~/src/shared/schema";
import { scope } from "~/src/shared/scope";
import { sql } from "~/src/shared/sql";

const app = new Hono<Env>();
export default app;

const Params = z.object({
  stockId: Id.optional(),
  from: z
    .string()
    .datetime()
    .optional()
    .default(() => DateTime.now().minus({ month: 1 }).toISO()),
  until: z
    .string()
    .datetime()
    .optional()
    .default(() => DateTime.now().toISO()),
  page: z.coerce.number().default(1),
  length: z.coerce.number().default(100),
});

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const params = Params.parse(ctx.req.query());

  const criteria = new sql.Criteria();
  scope(params, "stockId", (stockId) => criteria.push("stockId = ?", stockId));
  criteria.push("createdAt >= ?", params.from);
  criteria.push("createdAt <= ?", params.until);

  const pagination = new sql.Pagination(100, params.page);

  const prices = await database.all<z.infer<api.prices.Price>>(
    ...new sql.Query(
      "SELECT * FROM prices",
      criteria,
      "ORDER BY createdAt DESC",
      pagination,
    ).toExpr(),
  );

  const stocks = hash(
    await database.all<z.infer<api.stocks.Stock>>("SELECT * FROM stocks;"),
    (stock) => stock.id,
  );

  return ctx.json(
    prices.map((price) => ({
      ...prices,
      stock: stocks[price.stockId],
    })),
  );
});
