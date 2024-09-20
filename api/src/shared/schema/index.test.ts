import { expect, test } from "bun:test";

import { Email, Id, Name, Password } from ".";

test("Id", () => {
  expect(Id.parse(1)).toBe(1);
  expect(Id.parse("1")).toBe(1);
  expect(() => Id.parse("bad")).toThrow();
});

test("Email", () => {
  expect(Email.parse(" Test@Example.com ")).toBe("test@example.com");
  expect(() => Email.parse("bad")).toThrow();
});

test("Name", () => {
  expect(Name.parse("  John  Doe  ")).toBe("John Doe");
});

test("Password", () => {
  expect(Password.parse("password123456789")).toBe("password123456789");
  expect(() => Password.parse("bad")).toThrow();
});
