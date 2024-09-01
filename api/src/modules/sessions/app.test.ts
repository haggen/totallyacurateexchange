import { beforeAll, beforeEach, expect, setSystemTime, test } from "bun:test";
import { api } from "~/src/api";
import { prepare } from "~/src/database";
import { Status } from "~/src/shared/response";
import { now } from "~/src/shared/test/fixtures.json";

import { app } from "./app";
import * as fixtures from "./fixtures.json";

beforeAll(() => {
  prepare();
});

beforeEach(() => {
  setSystemTime(new Date(now));
});

test("POST /", async () => {
  const john = await api.users.create({
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
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
        email: fixtures.john.email,
        password: "",
      }),
      headers: new Headers({ "content-type": "application/json" }),
    }),
  ).toHaveProperty("status", Status.Unauthorized);

  const resp = await app.request("/", {
    method: "POST",
    body: JSON.stringify({
      email: fixtures.john.email,
      password: fixtures.john.password,
    }),
    headers: new Headers({ "content-type": "application/json" }),
  });

  expect(resp.status).toBe(201);

  expect(await resp.json()).toEqual({
    data: {
      id: expect.any(String),
      createdAt: now,
      expiresAt: expect.any(String),
      userId: john.id,
    },
  });
});
