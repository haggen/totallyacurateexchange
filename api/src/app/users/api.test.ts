import { expect, setSystemTime, test } from "bun:test";
import { migrate } from "~/src/api";
import { Database } from "~/src/shared/database";
import { now } from "~/src/shared/test";

import { Time } from "~/src/shared/time";
import { create, find, password, update } from "./api";
import fixtures from "./fixtures.json";

test("password", async () => {
  const hash = await password.hash("password");

  expect(hash).not.toBe("password");
  expect(await password.verify("password", hash)).toBeTrue();
  expect(await password.verify("wrong", hash)).toBeFalse();
});

test("create", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  migrate(database);

  expect(
    await create({
      database,
      payload: {
        name: fixtures.john.name,
        email: fixtures.john.email,
        password: fixtures.john.password,
      },
    }),
  ).toEqual({
    id: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    name: fixtures.john.name,
    email: fixtures.john.email,
    password: expect.any(String),
  });
});

test("find", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  migrate(database);

  const john = await create({
    database,
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  expect(await find({ database, payload: { id: john.id } })).toEqual([john]);
  expect(await find({ database, payload: { email: john.email } })).toEqual([
    john,
  ]);
});

test("update", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  migrate(database);

  const john = await create({
    database,
    payload: {
      name: fixtures.john.name,
      email: fixtures.john.email,
      password: fixtures.john.password,
    },
  });

  const later = new Date(now.getTime() + Time.Day);

  setSystemTime(later);

  expect(
    await update({
      database,
      payload: { id: john.id, name: fixtures.bob.name },
    }),
  ).toEqual({
    ...john,
    updatedAt: later.toISOString(),
    name: fixtures.bob.name,
  });
});
