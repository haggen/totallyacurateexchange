import { beforeEach, expect, setSystemTime, test } from "bun:test";
import { prepare } from "~/src/database";
import { now } from "~/src/shared/test/fixture.json";

import { create } from "./api";
import { app } from "./app";
import fixture from "./fixture.json";

beforeEach(() => {
  setSystemTime(new Date(now));
  prepare();
});

test("POST /", async () => {
  const resp = await app.request("/", {
    method: "POST",
    body: JSON.stringify(fixture.john),
    headers: new Headers({ "content-type": "application/json" }),
  });

  expect(resp.status).toBe(201);

  expect(await resp.json()).toEqual({
    data: {
      id: 1,
      createdAt: now,
      updatedAt: now,
      name: fixture.john.name,
      email: fixture.john.email,
      password: expect.any(String),
    },
  });
});

test("GET /:id", async () => {
  const john = await create({
    payload: fixture.john,
  });

  const resp = await app.request(`/${john.id}`);

  expect(resp.status).toBe(200);

  expect(await resp.json()).toEqual({
    data: john,
  });
});

test("PATCH /:id", async () => {
  const john = await create({
    payload: fixture.john,
  });

  const resp = await app.request(`/${john.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: fixture.bob.name,
      email: fixture.bob.email,
      password: fixture.bob.password,
    }),
    headers: new Headers({ "content-type": "application/json" }),
  });

  expect(resp.status).toBe(200);

  expect(await resp.json()).toEqual({
    data: {
      ...john,
      name: fixture.bob.name,
      email: fixture.bob.email,
      password: expect.any(String),
    },
  });
});
