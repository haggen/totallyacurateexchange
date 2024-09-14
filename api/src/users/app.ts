import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { api } from "~/src";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";

const app = new Hono<Env>();
export default app;

app.post("/", async (ctx) => {
  const database = ctx.get("database");
  const data = await ctx.req.json();

  const user = await api.users.create({
    database,
    payload: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
  });

  const portfolio = await api.portfolios.create({
    database,
    payload: {
      userId: user.id,
    },
  });

  await api.holdings.create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: 1,
      volume: 100,
    },
  });

  return ctx.json({ data: user }, Status.Created);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const { id } = ctx.req.param();

  const [user] = await api.users.find({
    database,
    payload: { id },
  });

  if (!user) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: user });
});

app.patch("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const data = await ctx.req.json();
  const { id } = ctx.req.param();

  const user = await api.users.update({
    database,
    payload: {
      id,
      name: data.name,
      email: data.email,
      password: data.password,
    },
  });

  if (!user) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: user });
});
