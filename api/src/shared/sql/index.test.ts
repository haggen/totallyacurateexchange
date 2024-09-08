import { expect, test } from "bun:test";

import { getInsertValues, getUpdateSet } from ".";

test("getUpdateValues", () => {
  const values = getUpdateSet({
    a: 1,
    b: 2,
    c: undefined,
  });

  expect(values).toEqual("a = $a, b = $b");
});

test("getInsertValues", () => {
  expect(
    getInsertValues({
      a: 1,
      b: 2,
      c: undefined,
    }),
  ).toEqual("(a, b) VALUES ($a, $b)");
});
