import { expect, test } from "bun:test";

import { getInsertValues, getUpdateSet } from ".";

test("getInsertValues", () => {
  const values = getInsertValues({
    a: 1,
    b: 2,
    c: 3,
  });

  expect(values).toEqual("(a, b, c) VALUES ($a, $b, $c)");
});

test("getUpdateValues", () => {
  const values = getUpdateSet({
    a: 1,
    b: 2,
    c: undefined,
  });

  expect(values).toEqual("a = $a, b = $b");
});
