import { beforeEach, expect, setSystemTime, test } from "bun:test";
import { prepare } from "~/src/database";
import { now } from "~/src/shared/test/fixtures.json";

import { create } from "./api";
import { app } from "./app";
import fixtures from "./fixtures.json";

beforeEach(() => {
  setSystemTime(new Date(now));
  prepare();
});

test("POST /", async () => {
  const resp = await app.request("/", {
    method: "POST",
    body: JSON.stringify(fixtures.john),
    headers: new Headers({ "content-type": "application/json" }),
  });

  expect(resp.status).toBe(201);

  expect(await resp.json()).toEqual({
    data: {
      id: 1,
      createdAt: now,
      updatedAt: now,
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: expect.any(String),
    },
  });
});

test("GET /:id", async () => {
  const john = await create({
    payload: fixtures.john,
  });

  const resp = await app.request(`/${john.id}`);

  expect(resp.status).toBe(200);

  expect(await resp.json()).toEqual({
    data: john,
  });

  expect(await app.request("/999")).toHaveProperty("status", 404);
});

test("PATCH /:id", async () => {
  const john = await create({
    payload: fixtures.john,
  });

  const resp = await app.request(`/${john.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: fixtures.bob.name,
      email: fixtures.bob.email,
      password: fixtures.bob.password,
    }),
    headers: new Headers({ "content-type": "application/json" }),
  });

  expect(resp.status).toBe(200);

  expect(await resp.json()).toEqual({
    data: {
      ...john,
      name: fixtures.bob.name,
      email: fixtures.bob.email,
      password: expect.any(String),
    },
  });

  expect(
    await app.request("/999", {
      method: "PATCH",
      body: JSON.stringify({
        name: fixtures.bob.name,
        email: fixtures.bob.email,
        password: fixtures.bob.password,
      }),
      headers: new Headers({ "content-type": "application/json" }),
    }),
  ).toHaveProperty("status", 404);
});
