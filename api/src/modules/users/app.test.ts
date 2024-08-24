import { beforeAll, beforeEach, expect, setSystemTime, test } from "bun:test";

import { prepare } from "~/src/database";
import { app } from "./app";

const now = new Date("1990-05-04T10:00:00Z");

beforeAll(() => {
  prepare();
});

beforeEach(() => {
  setSystemTime(now);
});

test("POST /", async () => {
  const example = {
    name: "Test",
    email: "test@example.com",
    password: "0123456789abcdef",
  };

  const resp = await app.request("/", {
    method: "POST",
    body: JSON.stringify(example),
    headers: new Headers({ "content-type": "application/json" }),
  });

  expect(resp.status).toBe(201);

  expect(await resp.json()).toEqual({
    id: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    name: example.name,
    email: example.email,
    password: expect.any(String),
  });
});

test("PATCH /:id", async () => {
  const example = {
    id: 1,
    name: "Changed",
    email: "changed@example.com",
    password: "0123456789abcdef",
  };

  const resp = await app.request(`/${example.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: example.name,
      email: example.email,
      password: example.password,
    }),
    headers: new Headers({ "content-type": "application/json" }),
  });

  expect(resp.status).toBe(200);

  expect(await resp.json()).toEqual({
    id: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    name: example.name,
    email: example.email,
    password: expect.any(String),
  });
});
