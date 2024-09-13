import { expect, setSystemTime, test } from "bun:test";
import { Database } from "~/src/shared/database";
import { now } from "~/src/shared/test";

import { api } from "~/src/api";
import { Time } from "~/src/shared/time";
import { create, find, migrate, update } from "./api";

const fixtures = {
  user: {
    name: "John Doe",
    email: "jdoe@example.com",
    password: "0123456789abcdef",
  },
  order: {
    type: "bid",
    price: 100,
    volume: 10,
  },
} as const;

test("create", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

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
        ...fixtures.order,
      },
    }),
  ).toEqual({
    id: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    portfolioId: portfolio.id,
    stockId: stock.id,
    status: "pending",
    remaining: fixtures.order.volume,
    ...fixtures.order,
  });
});

test("find", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

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
  const order = await create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: stock.id,
      ...fixtures.order,
    },
  });

  expect(await find({ database, payload: { id: order.id } })).toEqual([order]);

  expect(
    await find({ database, payload: { portfolioId: portfolio.id } }),
  ).toEqual([order]);

  expect(await find({ database, payload: { stockId: stock.id } })).toEqual([
    order,
  ]);
});

test("update", async () => {
  setSystemTime(now);

  const database = await Database.open(new URL("sqlite://"));
  await migrate(database);

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
  const order = await create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: stock.id,
      ...fixtures.order,
    },
  });

  const later = new Date(now.getTime() + Time.Day);
  setSystemTime(later);

  expect(
    await update({
      database,
      payload: {
        id: order.id,
        status: "cancelled",
        remaining: 99,
      },
    }),
  ).toEqual({
    ...order,
    updatedAt: later.toISOString(),
    status: "cancelled",
    remaining: 99,
  });
});
