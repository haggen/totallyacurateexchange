import { expect, setSystemTime, test } from "bun:test";
import { Database } from "~/src/shared/database";
import { now } from "~/src/shared/test";

import { create, find, migrate, seed } from "./api";

test("seed", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));

  await migrate(database);
  await seed(database);

  const stocks = await find({ database, payload: {} });

  expect(stocks).not.toEqual([]);

  seed(database);

  expect(await find({ database, payload: {} })).toEqual(stocks);
});

test("create", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

  expect(
    await create({
      database,
      payload: {
        name: "Stock Co.",
      },
    }),
  ).toEqual({
    id: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    name: "Stock Co.",
  });
});

test("find", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

  const stock = await create({
    database,
    payload: {
      name: "Stock Co.",
    },
  });

  expect(await find({ database, payload: { id: stock.id } })).toEqual([stock]);

  expect(await find({ database, payload: {} })).toEqual([stock]);
});
