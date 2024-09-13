import { expect, setSystemTime, test } from "bun:test";
import { api } from "~/src/api";
import { Database } from "~/src/shared/database";
import { now } from "~/src/shared/test";

import { Time } from "~/src/shared/time";
import { create, discard, find, migrate } from "./api";

const fixtures = {
  john: {
    name: "John Doe",
    email: "jdoe@example.com",
    password: "0123456789abcdef",
  },
};

test("create", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

  const john = await api.users.create({
    database,
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  expect(
    await create({
      database,
      payload: {
        userId: john.id,
      },
    }),
  ).toEqual({
    id: 1,
    createdAt: now.toISOString(),
    expiresAt: expect.any(String),
    userId: john.id,
    token: expect.any(String),
  });
});

test("find", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

  const john = await api.users.create({
    database,
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  const session = await create({
    database,
    payload: {
      userId: john.id,
    },
  });

  expect(await find({ database, payload: { token: session.token } })).toEqual([
    session,
  ]);
  expect(await find({ database, payload: { id: session.id } })).toEqual([
    session,
  ]);

  setSystemTime(new Date(now.getTime() + 365 * Time.Day));

  expect(await find({ database, payload: {} })).toEqual([]);
  expect(await find({ database, payload: { expired: false } })).toEqual([]);
  expect(await find({ database, payload: { expired: true } })).toEqual([
    session,
  ]);
});

test("discard", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

  const john = await api.users.create({
    database,
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  const session = await create({
    database,
    payload: {
      userId: john.id,
    },
  });

  expect(await find({ database, payload: { id: session.id } })).toEqual([
    session,
  ]);

  await discard({ database, payload: { id: session.id } });

  expect(await find({ database, payload: { id: session.id } })).toEqual([]);
});
