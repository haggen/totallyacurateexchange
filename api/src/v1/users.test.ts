import { describe, expect, setSystemTime } from "bun:test";
import { now, prepare } from "~/src/test";

import endpoints from "./users";

const examples = {
  user: {
    name: "John Doe",
    email: "jdoe@example.com",
    password: "0123456789abcdef",
  },
  portfolio: {
    userId: 1,
  },
  session: {
    userId: 1,
  },
};

describe("POST /", async () => {
  setSystemTime(now);

  const { app } = await prepare();
  app.route("/", endpoints);

  const response = await app.request("/", {
    method: "POST",
    body: JSON.stringify({
      name: examples.user.name,
      email: examples.user.email,
      password: examples.user.password,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({
    id: 1,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    name: examples.user.name,
    email: examples.user.email,
    password: expect.any(String),
    portfolio: {
      id: 1,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      userId: 1,
      balance: expect.any(Number),
    },
  });
});
