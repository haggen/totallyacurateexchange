import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { api } from "~/src/api";
import { Status } from "~/src/shared/response";

export const app = new Hono();

app.post("/", async (ctx) => {
  const data = await ctx.req.json();

  const [user] = await api.users.find({
    options: {
      email: data.email,
    },
  });

  if (!user) {
    throw new HTTPException(Status.Unauthorized);
  }

  const authenticated = await api.users.password.verify(
    data.password,
    user.password,
  );

  if (!authenticated) {
    throw new HTTPException(Status.Unauthorized);
  }

  const session = await api.sessions.create({
    payload: {
      userId: user.id,
    },
  });

  return ctx.json({ data: session }, Status.Created);
});

app.get("/:id{\\d+}", async (ctx) => {
  const { id } = ctx.req.param();

  const session = await api.sessions.find({
    options: { id },
  });

  return ctx.json({ data: session });
});
