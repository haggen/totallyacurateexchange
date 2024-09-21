import { describe, expect, test } from "bun:test";

import {
  Criteria,
  Entry,
  Group,
  Join,
  Limit,
  List,
  Offset,
  Order,
  Patch,
  Query,
  Returning,
  Selection,
  Source,
  q,
} from "./sql";

describe("Patch", () => {
  const patch = new Patch({ a: 1 });

  test("constructor/set", () => {
    expect(patch.data).toEqual({ a: 1 });
  });

  test("merge", () => {
    const mergeable = new Patch();
    mergeable.set({ b: 2 });

    patch.merge(mergeable);

    expect(patch.data).toEqual({ a: 1, b: 2 });

    mergeable.set({ c: 3 });

    // Make sure references are independent.
    expect(patch.data).toEqual({ a: 1, b: 2 });
  });

  test("push", () => {
    patch.push({ c: ["? + ?", 3, 4] });
    expect(patch.data).toEqual({ a: 1, b: 2, c: ["? + ?", 3, 4] });
  });

  test("toExpr/toString/bindings", () => {
    patch.push({ d: undefined });
    expect(patch.toExpr()).toEqual(["SET a = ?, b = ?, c = ? + ?", 1, 2, 3, 4]);
  });
});

describe("Entry", () => {
  const entry = new Entry({ a: 1 });

  test("constructor/set", () => {
    expect(entry.data).toEqual({ a: 1 });
  });

  test("merge", () => {
    const mergeable = new Entry();
    mergeable.set({ b: 2 });

    entry.merge(mergeable);

    expect(entry.data).toEqual({ a: 1, b: 2 });

    mergeable.set({ c: 3 });

    // Make sure references are independent.
    expect(entry.data).toEqual({ a: 1, b: 2 });
  });

  test("push", () => {
    entry.push({ c: ["? + ?", 3, 4] });
    expect(entry.data).toEqual({ a: 1, b: 2, c: ["? + ?", 3, 4] });
  });

  test("toExpr/toString/bindings", () => {
    entry.push({ d: undefined });
    expect(entry.toExpr()).toEqual([
      "(a, b, c) VALUES (?, ?, ? + ?)",
      1,
      2,
      3,
      4,
    ]);
  });
});

describe("Selection", () => {
  const selection = new Selection("a", "b");

  test("constructor/set", () => {
    expect(selection.values).toEqual(["a", "b"]);
  });

  test("push", () => {
    selection.push("c", "d");
    expect(selection.values).toEqual(["a", "b", "c", "d"]);
  });

  test("merge", () => {
    selection.merge(new Selection("e", "f"));
    expect(selection.values).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  test("toString", () => {
    expect(selection.toString()).toEqual("a, b, c, d, e, f");
  });
});

describe("Returning", () => {
  const returning = new Returning("a", "b");

  test("constructor/set", () => {
    expect(returning.values).toEqual(["a", "b"]);
  });

  test("push", () => {
    returning.push("c", "d");
    expect(returning.values).toEqual(["a", "b", "c", "d"]);
  });

  test("merge", () => {
    returning.merge(new Returning("e", "f"));
    expect(returning.values).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  test("toExpr/toString", () => {
    expect(returning.toExpr()).toEqual(["RETURNING a, b, c, d, e, f"]);
  });
});

describe("Source", () => {
  const source = new Source("a", "b");

  test("constructor/set", () => {
    expect(source.values).toEqual(["a", "b"]);
  });

  test("push", () => {
    source.push("c", "d");
    expect(source.values).toEqual(["a", "b", "c", "d"]);
  });

  test("merge", () => {
    source.merge(new Source("e", "f"));
    expect(source.values).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  test("toString", () => {
    expect(source.toString()).toEqual("FROM a, b, c, d, e, f");
  });
});

describe("Join", () => {
  const join = new Join("t ON a = b");

  test("constructor/set", () => {
    expect(join.clauses).toEqual(["t ON a = b"]);
  });

  test("push", () => {
    join.push("t ON c = d");
    expect(join.clauses).toEqual(["t ON a = b", "t ON c = d"]);
  });

  test("merge", () => {
    join.merge(new Join("t ON e = f"));
    expect(join.clauses).toEqual(["t ON a = b", "t ON c = d", "t ON e = f"]);
  });

  test("toString", () => {
    expect(join.toString()).toEqual(
      "JOIN t ON a = b JOIN t ON c = d JOIN t ON e = f",
    );

    expect(new Join("JOIN t ON a = b").toString()).toEqual("JOIN t ON a = b");

    expect(new Join("INNER JOIN t ON a = b").toString()).toEqual(
      "INNER JOIN t ON a = b",
    );

    expect(new Join("LEFT JOIN t ON a = b").toString()).toEqual(
      "LEFT JOIN t ON a = b",
    );

    expect(new Join("LEFT OUTER JOIN t ON a = b").toString()).toEqual(
      "LEFT OUTER JOIN t ON a = b",
    );

    expect(new Join("RIGHT JOIN t ON a = b").toString()).toEqual(
      "RIGHT JOIN t ON a = b",
    );

    expect(new Join("RIGHT OUTER JOIN t ON a = b").toString()).toEqual(
      "RIGHT OUTER JOIN t ON a = b",
    );

    expect(new Join("FULL JOIN t ON a = b").toString()).toEqual(
      "FULL JOIN t ON a = b",
    );

    expect(new Join("FULL OUTER JOIN t ON a = b").toString()).toEqual(
      "FULL OUTER JOIN t ON a = b",
    );
  });
});

describe("Criteria", () => {
  const criteria = new Criteria("a = ?", 1);

  test("constructor/set", () => {
    expect(criteria.clauses).toEqual([["a = ?", 1]]);
  });

  test("push", () => {
    criteria.push("b = ?", 2);
    expect(criteria.clauses).toEqual([
      ["a = ?", 1],
      ["b = ?", 2],
    ]);
  });

  test("merge", () => {
    criteria.merge(new Criteria("c = ?", 3));
    expect(criteria.clauses).toEqual([
      ["a = ?", 1],
      ["b = ?", 2],
      ["c = ?", 3],
    ]);
  });

  test("toExpr/toString/bindings", () => {
    expect(criteria.toExpr()).toEqual([
      "WHERE a = ? AND b = ? AND c = ?",
      1,
      2,
      3,
    ]);
  });
});

describe("Order", () => {
  const order = new Order("a ASC", "b DESC");

  test("constructor/set", () => {
    expect(order.terms).toEqual(["a ASC", "b DESC"]);
  });

  test("push", () => {
    order.push("c ASC", "d DESC");
    expect(order.terms).toEqual(["a ASC", "b DESC", "c ASC", "d DESC"]);
  });

  test("merge", () => {
    order.merge(new Order("e ASC", "f DESC"));
    expect(order.terms).toEqual([
      "a ASC",
      "b DESC",
      "c ASC",
      "d DESC",
      "e ASC",
      "f DESC",
    ]);
  });

  test("toString", () => {
    expect(order.toString()).toEqual(
      "ORDER BY a ASC, b DESC, c ASC, d DESC, e ASC, f DESC",
    );
  });
});

describe("Group", () => {
  const group = new Group("a", "b");

  test("constructor/set", () => {
    expect(group.terms).toEqual(["a", "b"]);
  });

  test("push", () => {
    group.push("c", "d");
    expect(group.terms).toEqual(["a", "b", "c", "d"]);
  });

  test("merge", () => {
    group.merge(new Group("e", "f"));
    expect(group.terms).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  test("toString", () => {
    expect(group.toString()).toEqual("GROUP BY a, b, c, d, e, f");
  });
});

describe("Limit", () => {
  const limit = new Limit(1);

  test("constructor/set", () => {
    expect(limit.value).toEqual(1);
  });

  test("merge", () => {
    limit.merge(new Limit(2));
    expect(limit.value).toEqual(2);
  });

  test("toString", () => {
    expect(limit.toString()).toEqual("LIMIT 2");
  });
});

describe("Offset", () => {
  const offset = new Offset(1);

  test("constructor/set", () => {
    expect(offset.value).toEqual(1);
  });

  test("merge", () => {
    offset.merge(new Offset(2));
    expect(offset.value).toEqual(2);
  });

  test("toString", () => {
    expect(offset.toString()).toEqual("OFFSET 2");
  });
});

describe("Query", () => {
  const select = new Selection("*");
  const source = new Source("t");
  const criteria = new Criteria("f = ?", 1);

  const query = new Query("SELECT", select, source, criteria);

  test("constructor/set", () => {
    expect(query.components).toEqual(["SELECT", select, source, criteria]);
  });

  test("push", () => {
    const limit = new Limit(1);
    const offset = new Offset(1);

    query.push(limit, offset);

    expect(query.components).toEqual([
      "SELECT",
      select,
      source,
      criteria,
      limit,
      offset,
    ]);
  });

  test("toExpr/toString/bindings", () => {
    expect(query.toExpr()).toEqual([
      "SELECT * FROM t WHERE f = ? LIMIT 1 OFFSET 1",
      1,
    ]);
  });
});

describe("List", () => {
  const expr = new List([1, 2, 3]);

  test("constructor/set", () => {
    expect(expr.values).toEqual([1, 2, 3]);
  });

  test("push", () => {
    expr.push(4, 5);
    expect(expr.values).toEqual([1, 2, 3, 4, 5]);
  });

  test("toExpr/toString/bindings", () => {
    expect(expr.toExpr()).toEqual(["(?, ?, ?, ?, ?)", 1, 2, 3, 4, 5]);
  });

  test("zero length", () => {
    expect(new List([]).toExpr()).toEqual(["()"]);
  });
});

test("q", () => {
  expect(q`SELECT * FROM t WHERE f = ${1} OR f = ${2};`).toEqual([
    "SELECT * FROM t WHERE f = ? OR f = ?;",
    1,
    2,
  ]);

  expect(
    q`UPDATE t ${new Patch({ a: 1, b: 2 })} ${new Criteria("c = ?", 3)};`,
  ).toEqual(["UPDATE t SET a = ?, b = ? WHERE c = ?;", 1, 2, 3]);

  expect(
    q`INSERT INTO t WHERE f = ${false} OR f = ${0} OR f = ${null};`,
  ).toEqual(["INSERT INTO t WHERE f = ? OR f = ? OR f = ?;", false, 0, null]);
});
