import { expect, setSystemTime, test } from "bun:test";
import { Database } from "~/src/shared/database";
import { now } from "~/src/shared/test";

import { api } from "~/src/api";
import { create, find, migrate, update } from "./api";

const fixtures = {
  user: {
    name: "John Doe",
    email: "jdoe@example.com",
    password: "0123456789abcdef",
  },
} as const;

test("create", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

  const user = await api.users.create({ database, payload: fixtures.user });

  expect(
    await create({
      database,
      payload: {
        userId: user.id,
      },
    }),
  ).toEqual({
    id: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    userId: user.id,
    balance: expect.any(Number),
  });
});

test("find", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

  const user = await api.users.create({ database, payload: fixtures.user });

  const portfolio = await create({
    database,
    payload: {
      userId: user.id,
    },
  });

  expect(await find({ database, payload: { id: portfolio.id } })).toEqual([
    portfolio,
  ]);

  expect(await find({ database, payload: { userId: user.id } })).toEqual([
    portfolio,
  ]);
});

test("update", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

  const user = await api.users.create({ database, payload: fixtures.user });

  const portfolio = await create({
    database,
    payload: {
      userId: user.id,
    },
  });

  expect(
    await update({ database, payload: { id: portfolio.id, balance: 999 } }),
  ).toHaveProperty("balance", 999);
});
