import { Hono } from "hono";
import type { z } from "zod";
import { api } from "~/src/api";
import { UnauthorizedError } from "~/src/shared/error";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";

export const app = new Hono<Env<z.infer<typeof api.sessions.Session>>>();

app.get("/", async (ctx) => {
  const database = ctx.get("database");
  const session = ctx.get("session");

  if (!session) {
    throw new UnauthorizedError();
  }

  const portfolios = await api.portfolios.find({
    database,
    payload: { userId: session.userId },
  });

  return ctx.json({ data: portfolios }, Status.Ok);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const { id } = ctx.req.param();

  const stock = await api.portfolios.find({
    database,
    payload: { id },
  });

  return ctx.json({ data: stock });
});
