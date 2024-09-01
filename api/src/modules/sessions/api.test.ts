import { beforeEach, expect, setSystemTime, test } from "bun:test";
import { api } from "~/src/api";
import { prepare } from "~/src/database";
import { now } from "~/src/shared/test/fixtures.json";

import { create, destroy, find } from "./api";
import * as fixtures from "./fixtures.json";

beforeEach(() => {
  setSystemTime(new Date(now));
  prepare();
});

test("create", async () => {
  const john = await api.users.create({
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  const session = await create({
    payload: { userId: john.id },
  });

  expect(session).toEqual({
    id: 1,
    createdAt: now,
    expiresAt: expect.any(String),
    userId: john.id,
    token: expect.any(String),
  });
});

test("find", async () => {
  const john = await api.users.create({
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  const session = await create({
    payload: { userId: john.id },
  });

  expect(await find({ options: {} })).toEqual([session]);

  setSystemTime(new Date("2020-01-01T00:00:00Z"));

  expect(
    await find({
      options: {
        limit: 1,
      },
    }),
  ).toEqual([]);

  expect(
    await find({
      options: {
        expired: true,
        limit: 1,
      },
    }),
  ).toEqual([session]);
});

test("destroy", async () => {
  const john = await api.users.create({
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  const session = await create({
    payload: { userId: john.id },
  });

  expect(
    await destroy({
      options: {
        id: session.id,
      },
    }),
  ).toEqual(session);

  expect(await find({ options: {} })).toEqual([]);
});
