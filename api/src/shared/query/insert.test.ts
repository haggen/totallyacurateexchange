import { expect, test } from "bun:test";

import { getInsertValues } from "./insert";

test("getInsertValues", () => {
  const values = getInsertValues({
    a: 1,
    b: 2,
    c: 3,
  });

  expect(values).toEqual("(a, b, c) VALUES ($a, $b, $c)");
});
