import { describe, expect, setSystemTime, test } from "bun:test";
import { Hono } from "hono";
import type { z } from "zod";
import { api } from "~/src/api";
import { migrate } from "~/src/database";
import { Database } from "~/src/shared/database";
import { must } from "~/src/shared/must";
import {
  type Env,
  setRequestDatabase,
  setRequestSession,
} from "~/src/shared/request";
import { Status } from "~/src/shared/response";
import { sql } from "~/src/shared/sql";
import { now } from "~/src/shared/test";

import endpoints from "./users";

const fixtures = {
  john: {
    name: "John Doe",
    email: "jdoe@example.com",
    password: "0123456789abcdef",
  },
};

describe("POST /", async () => {
  const database = await Database.open(new URL("sqlite://"));

  await migrate(database);

  const app = new Hono<Env>();

  app.use(setRequestDatabase(() => Promise.resolve(database)));

  app.route("/", endpoints);

  const response = await app.request("/", {
    method: "POST",
    body: JSON.stringify({
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({
    data: {
      id: 1,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: expect.any(String),
    },
  });
});

describe("GET /id", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  database.close = () => Promise.resolve();

  await migrate(database);

  const app = new Hono<Env>();

  app.use(setRequestDatabase(() => Promise.resolve(database)));
  app.use(setRequestSession(api.sessions.findNotExpiredByToken));

  app.route("/", endpoints);

  const user = must(
    await database.get<z.infer<api.users.User>>(
      ...new sql.Query(
        "INSERT INTO users",
        new sql.Entry(await api.users.create(fixtures.john)),
        "RETURNING *",
      ).toParams(),
    ),
  );

  const session = must(
    await database.get<z.infer<api.sessions.Session>>(
      ...new sql.Query(
        "INSERT INTO sessions",
        new sql.Entry(api.sessions.create({ userId: user.id })),
        "RETURNING *",
      ).toParams(),
    ),
  );

  test("missing authorization", async () => {
    const response = await app.request(`/${user.id}`);

    expect(response.status).toBe(Status.Unauthorized);
  });

  test("invalid authorization", async () => {
    const response = await app.request(`/${user.id}`, {
      headers: {
        Authorization: "Bearer invalid",
      },
    });

    expect(response.status).toBe(Status.Unauthorized);
  });

  test("valid authorization", async () => {
    const response = await app.request(`/${user.id}`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });

    expect(response.status).toBe(Status.Ok);
    expect(await response.json()).toEqual({ data: user });
  });
});
