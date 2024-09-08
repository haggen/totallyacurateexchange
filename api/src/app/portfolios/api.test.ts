import { expect, setSystemTime, test } from "bun:test";
import { Database } from "~/src/shared/database";
import { now } from "~/src/shared/test";

import { api } from "~/src/api";
import { create, find, migrate } from "./api";

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
  migrate(database);

  const john = await api.users.create({ database, payload: fixtures.john });

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
    updatedAt: now.toISOString(),
    userId: john.id,
    balance: expect.any(Number),
  });
});

test("find", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  migrate(database);

  const john = await api.users.create({ database, payload: fixtures.john });

  const portfolio = await create({
    database,
    payload: {
      userId: john.id,
    },
  });

  expect(await find({ database, payload: { id: portfolio.id } })).toEqual([
    portfolio,
  ]);

  expect(await find({ database, payload: { userId: john.id } })).toEqual([
    portfolio,
  ]);
});
