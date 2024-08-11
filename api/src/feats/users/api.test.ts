import { expect, setSystemTime, test } from "bun:test";
import { ZodError } from "zod";

import { create, password } from "./api";

test("password", async () => {
  const hash = await password.hash("password");

  expect(hash).not.toBe("password");
  expect(await password.verify("password", hash)).toBeTrue();
  expect(await password.verify("wrong", hash)).toBeFalse();
});

test("create", async () => {
  const createdAt = new Date("1990-05-04T00:00:00Z");
  setSystemTime(createdAt);

  expect(async () => {
    await create({
      payload: {
        email: "",
        name: "",
        password: "",
      },
    });
  }).toThrowError(ZodError);

  const payload = {
    name: "John  Doe ",
    email: "JohnDoe@Example.com ",
    password: "password1234567",
  };

  const user = await create({
    payload,
  });

  expect(user).toEqual({
    id: expect.any(Number),
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    name: "John Doe",
    email: "johndoe@example.com",
    password: expect.any(String),
  });

  expect(await password.verify(payload.password, user.password)).toBeTrue();
});
