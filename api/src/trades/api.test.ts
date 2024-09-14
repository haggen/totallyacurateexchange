import { expect, setSystemTime, test } from "bun:test";
import { Database } from "~/src/shared/database";
import { now } from "~/src/shared/test";

import { api } from "~/src";
import { create, find, migrate } from "./api";

const fixtures = {
  user: {
    name: "John Doe",
    email: "jdoe@example.com",
    password: "0123456789abcdef",
  },
  order: {
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
  const bid = await api.orders.create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: stock.id,
      type: "bid",
      ...fixtures.order,
    },
  });
  const ask = await api.orders.create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: stock.id,
      type: "ask",
      ...fixtures.order,
    },
  });

  expect(
    await create({
      database,
      payload: {
        bidId: bid.id,
        askId: ask.id,
        volume: fixtures.order.volume,
      },
    }),
  ).toEqual({
    id: 1,
    executedAt: now.toISOString(),
    bidId: bid.id,
    askId: ask.id,
    volume: fixtures.order.volume,
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
  const bid = await api.orders.create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: stock.id,
      type: "bid",
      ...fixtures.order,
    },
  });
  const ask = await api.orders.create({
    database,
    payload: {
      portfolioId: portfolio.id,
      stockId: stock.id,
      type: "ask",
      ...fixtures.order,
    },
  });

  const trade = await create({
    database,
    payload: {
      bidId: bid.id,
      askId: ask.id,
      volume: fixtures.order.volume,
    },
  });

  expect(await find({ database, payload: { id: trade.id } })).toEqual([trade]);

  expect(await find({ database, payload: { orderId: bid.id } })).toEqual([
    trade,
  ]);

  expect(await find({ database, payload: { orderId: ask.id } })).toEqual([
    trade,
  ]);

  expect(await find({ database, payload: {} })).toEqual([trade]);
});
