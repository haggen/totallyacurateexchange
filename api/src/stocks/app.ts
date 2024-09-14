import { Hono } from "hono";
import { api } from "~/src";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";

const app = new Hono<Env>();
export default app;

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const stocks = await api.stocks.find({ database, payload: {} });

  return ctx.json({ data: stocks }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const { id } = ctx.req.param();

  const stock = await api.stocks.find({
    database,
    payload: { id },
  });

  return ctx.json({ data: stock });
});
