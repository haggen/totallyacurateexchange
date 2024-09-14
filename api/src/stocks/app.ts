import { Hono } from "hono";
import { api } from "~/src/api";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";

export const app = new Hono<Env>();

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
