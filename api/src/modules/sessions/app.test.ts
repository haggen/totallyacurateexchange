import { beforeAll, beforeEach, expect, setSystemTime, test } from "bun:test";

import { api } from "~/src/api";
import { prepare } from "~/src/database";
import { Status } from "~/src/shared/response";
import { app } from "./app";

const now = new Date("1990-05-04T10:00:00Z");

beforeAll(() => {
  prepare();
});

beforeEach(() => {
  setSystemTime(now);
});

const example = {
  id: 1,
  name: "Test",
  email: "test@example.com",
  password: "0123456789abcdef",
};

test("POST /", async () => {
  const user = await api.users.create({
    payload: {
      name: example.name,
      email: example.email,
      password: example.password,
    },
  });

  expect(
    await app.request("/", {
      method: "POST",
      body: JSON.stringify({
        email: "",
        password: "",
      }),
      headers: new Headers({ "content-type": "application/json" }),
    }),
  ).toHaveProperty("status", Status.Unauthorized);

  expect(
    await app.request("/", {
      method: "POST",
      body: JSON.stringify({
        email: example.email,
        password: "",
      }),
      headers: new Headers({ "content-type": "application/json" }),
    }),
  ).toHaveProperty("status", Status.Unauthorized);

  const resp = await app.request("/", {
    method: "POST",
    body: JSON.stringify({
      email: example.email,
      password: example.password,
    }),
    headers: new Headers({ "content-type": "application/json" }),
  });

  expect(resp.status).toBe(201);

  expect(await resp.json()).toEqual({
    data: {
      id: expect.any(String),
      createdAt: now.toISOString(),
      expiresAt: expect.any(String),
      userId: user.id,
    },
  });
});
