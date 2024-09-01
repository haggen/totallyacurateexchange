import { SQLiteError } from "bun:sqlite";
import { beforeEach, expect, setSystemTime, test } from "bun:test";
import { ZodError } from "zod";
import { prepare } from "~/src/database";
import { now } from "~/src/shared/test/fixture.json";

import { create, find, password, update } from "./api";
import fixture from "./fixture.json";

beforeEach(() => {
  setSystemTime(new Date(now));
  prepare();
});

test("password", async () => {
  const hash = await password.hash("password");

  expect(hash).not.toBe("password");
  expect(await password.verify("password", hash)).toBeTrue();
  expect(await password.verify("wrong", hash)).toBeFalse();
});

test("create", async () => {
  expect(async () => {
    await create({
      payload: {
        email: "",
        name: "",
        password: "",
      },
    });
  }).toThrowError(ZodError);

  const john = await create({
    payload: {
      email: fixture.john.email,
      name: fixture.john.name,
      password: fixture.john.password,
    },
  });

  expect(john).toEqual({
    id: expect.any(Number),
    createdAt: now,
    updatedAt: now,
    name: fixture.john.name,
    email: fixture.john.email,
    password: expect.any(String),
  });

  expect(
    await password.verify(fixture.john.password, john.password),
  ).toBeTrue();

  expect(async () => {
    await create({
      payload: {
        email: fixture.john.email,
        name: fixture.john.name,
        password: fixture.john.password,
      },
    });
  }).toThrow(SQLiteError);
});

test("find", async () => {
  const john = await create({
    payload: {
      email: fixture.john.email,
      name: fixture.john.name,
      password: fixture.john.password,
    },
  });

  expect(
    await find({
      options: {
        limit: 1,
      },
    }),
  ).toEqual([john]);

  expect(
    await find({
      options: {
        id: john.id,
      },
    }),
  ).toEqual([john]);

  expect(
    await find({
      options: {
        email: john.email,
      },
    }),
  ).toEqual([john]);
});

test("update", async () => {
  const john = await create({
    payload: {
      email: fixture.john.email,
      name: fixture.john.name,
      password: fixture.john.password,
    },
  });

  const bob = await update({
    payload: {
      name: fixture.bob.name,
      email: fixture.bob.email,
      password: fixture.bob.password,
    },
    options: {
      id: john.id,
    },
  });

  expect(bob).toEqual({
    id: bob.id,
    createdAt: now,
    updatedAt: now,
    name: fixture.bob.name,
    email: fixture.bob.email,
    password: expect.any(String),
  });

  expect(await password.verify(fixture.bob.password, bob.password)).toBeTrue();
});
