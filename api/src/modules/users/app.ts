import { Hono } from "hono";
import { api } from "~/src/api";
import { Status } from "~/src/shared/response";

export const app = new Hono();

app.post("/", async (context) => {
  const data = await context.req.json();

  const user = await api.users.create({
    payload: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
  });

  return context.json(user, { status: Status.Created });
});

app.patch("/:id", async (context) => {
  const data = await context.req.json();
  const { id } = context.req.param();

  const user = await api.users.update({
    payload: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
    options: { id },
  });

  return context.json(user);
});
