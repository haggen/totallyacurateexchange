import { expect, setSystemTime, test } from "bun:test";
import { Database } from "~/src/shared/database";
import { now } from "~/src/shared/test";

import { api } from "~/src";
import { create, find, migrate, update } from "./api";

const fixtures = {
  user: {
    name: "John Doe",
    email: "jdoe@example.com",
    password: "0123456789abcdef",
  },
};

test("create", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  migrate(database);

  const user = await api.users.create({ database, payload: fixtures.user });
  const portfolio = await api.portfolios.create({
    database,
    payload: {
      userId: user.id,
    },
  });
  const stock = await api.stocks.create({
    database,
    payload: {
      name: "Stock Co.",
    },
  });

  expect(
    await create({
      database,
      payload: {
        portfolioId: portfolio.id,
        stockId: stock.id,
        volume: 100,
      },
    }),
  ).toEqual({
    id: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    portfolioId: portfolio.id,
    stockId: stock.id,
    volume: 100,
  });
});

test("find", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  migrate(database);

  const user = await api.users.create({ database, payload: fixtures.user });
  const portfolio = await api.portfolios.create({
    database,
    payload: {
      userId: user.id,
    },
  });
  const stock = await api.stocks.create({
    database,
    payload: {
      name: "Stock Co.",
    },
  });
  const holding = await create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: stock.id,
      volume: 100,
    },
  });

  expect(await find({ database, payload: { id: holding.id } })).toEqual([
    holding,
  ]);

  expect(await find({ database, payload: { portfolioId: user.id } })).toEqual([
    holding,
  ]);
});

test("update", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  migrate(database);

  const user = await api.users.create({ database, payload: fixtures.user });
  const portfolio = await api.portfolios.create({
    database,
    payload: {
      userId: user.id,
    },
  });
  const stock = await api.stocks.create({
    database,
    payload: {
      name: "Stock Co.",
    },
  });
  const holding = await create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: stock.id,
      volume: 100,
    },
  });

  expect(
    await update({ database, payload: { id: holding.id, volume: 999 } }),
  ).toHaveProperty("volume", 999);
});
