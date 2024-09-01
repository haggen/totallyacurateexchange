import { beforeEach, expect, setSystemTime, test } from "bun:test";
import { api } from "~/src/api";
import { prepare } from "~/src/database";
import { Status } from "~/src/shared/response";
import { now } from "~/src/shared/test/fixtures.json";

import { app } from "./app";
import * as fixtures from "./fixtures.json";

beforeEach(() => {
  setSystemTime(new Date(now));
  prepare();
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
      id: 1,
      createdAt: now,
      expiresAt: expect.any(String),
      userId: john.id,
      token: expect.any(String),
    },
  });
});

test("GET /:id", async () => {
  const john = await api.users.create({
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  const session = await api.sessions.create({
    payload: { userId: john.id },
  });

  const resp = await app.request(`/${session.id}`);

  expect(resp.status).toBe(200);

  expect(await resp.json()).toEqual({
    data: session,
  });

  expect(await app.request("/999")).toHaveProperty("status", Status.NotFound);
});

test("DELETE /:id", async () => {
  const john = await api.users.create({
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  const session = await api.sessions.create({
    payload: { userId: john.id },
  });

  expect(
    await app.request(`/${session.id}`, {
      method: "DELETE",
    }),
  ).toHaveProperty("status", Status.NoContent);

  expect(
    await app.request(`/${session.id}`, {
      method: "DELETE",
    }),
  ).toHaveProperty("status", Status.NotFound);
});
