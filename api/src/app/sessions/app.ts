import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { api } from "~/src/api";
import type { Env } from "~/src/shared/request";
import { Status } from "~/src/shared/response";

export const app = new Hono<Env>();

app.post("/", async (ctx) => {
  const database = ctx.get("database");
  const data = await ctx.req.json();

  const [user] = await api.users.find({
    database,
    payload: {
      email: data.email,
    },
  });

  if (!user) {
    throw new HTTPException(Status.NotFound);
  }

  const authenticated = await api.users.password.verify(
    data.password,
    user.password,
  );

  if (!authenticated) {
    throw new HTTPException(Status.Unauthorized);
  }

  const session = await api.sessions.create({
    database,
    payload: {
      userId: user.id,
    },
  });

  return ctx.json({ data: session }, Status.Created);
});

app.get("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const { id } = ctx.req.param();

  const [session] = await api.sessions.find({
    database,
    payload: { id },
  });

  if (!session) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: session });
});

app.delete("/:id{\\d+}", async (ctx) => {
  const database = ctx.get("database");
  const { id } = ctx.req.param();

  const session = await api.sessions.destroy({
    database,
    payload: { id },
  });

  if (!session) {
    throw new HTTPException(Status.NotFound);
  }

  return ctx.json({ data: session }, Status.NoContent);
});
