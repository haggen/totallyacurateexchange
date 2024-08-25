import { Hono } from "hono";
import { api } from "~/src/api";
import { Status } from "~/src/shared/response";

export const app = new Hono();

app.post("/", async (ctx) => {
  const data = await ctx.req.json();

  const user = await api.users.create({
    payload: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
  });

  return ctx.json(user, Status.Created);
});

app.patch("/:id", async (ctx) => {
  const data = await ctx.req.json();
  const { id } = ctx.req.param();

  const user = await api.users.update({
    payload: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
    options: { id },
  });

  return ctx.json(user);
});
