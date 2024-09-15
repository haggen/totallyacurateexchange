import type { Binding } from "~/src/shared/database";

/**
 * Literal SQL string.
 */
type Literal = string;

/**
 * Component of a SQL query.
 */
type Component = Literal | { toString(): string; bindings?: Binding[] };

/**
 * SQL expression with possible binding values.
 */
type Expression = [Literal, ...Binding[]];

/**
 * Data payload for UPDATE/INSERT queries.
 */
type Data = Record<string, undefined | Binding | Expression>;

/**
 * SET component of an UPDATE query.
 */
export class Patch {
  data: Data = {};

  constructor(data?: Data) {
    if (data) {
      this.set(data);
    }
  }

  get bindings() {
    return Object.values(this.data)
      .filter((value) => value !== undefined)
      .flatMap((value) => (Array.isArray(value) ? value.slice(1) : value));
  }

  merge(patch: Patch) {
    this.data = { ...this.data, ...patch.data };
  }

  set(data: Data) {
    this.data = { ...data };
  }

  push(data: Data) {
    this.data = { ...this.data, ...data };
  }

  toString() {
    if (Object.keys(this.data).length === 0) {
      return "";
    }

    return `SET ${Object.entries(this.data)
      .map(([key, value]) =>
        value === undefined
          ? ""
          : Array.isArray(value)
            ? `${key} = ${value[0]}`
            : `${key} = ?`,
      )
      .filter(Boolean)
      .join(", ")}`;
  }
}

/**
 * VALUES component of an INSERT query.
 */
export class Entry {
  data: Data = {};

  constructor(data?: Data) {
    if (data) {
      this.set(data);
    }
  }

  get bindings() {
    return Object.values(this.data)
      .filter((value) => value !== undefined)
      .flatMap((value) => (Array.isArray(value) ? value.slice(1) : value));
  }

  merge(entry: Entry) {
    this.data = { ...this.data, ...entry.data };
  }

  set(data: Data) {
    this.data = { ...data };
  }

  push(data: Data) {
    this.data = { ...this.data, ...data };
  }

  toString() {
    const entries = Object.entries(this.data).filter(
      ([, value]) => value !== undefined,
    );

    if (entries.length === 0) {
      return "";
    }

    return `(${entries.map(([key]) => key).join(", ")}) VALUES (${entries
      .map(([, value]) => (Array.isArray(value) ? value[0] : "?"))
      .join(", ")})`;
  }
}

/**
 * RETURNING component of an INSERT/UPDATE query.
 */
export class Returning {
  values: string[] = [];

  constructor(...values: string[]) {
    this.set(...values);
  }

  merge(selection: Selection) {
    this.values.push(...selection.values);
  }

  set(...values: string[]) {
    this.values = [...values];
  }

  push(...values: string[]) {
    this.values.push(...values);
  }

  toString() {
    if (this.values.length === 0) {
      return "";
    }
    return `RETURNING ${this.values.join(", ")}`;
  }
}

/**
 * SELECT component of a SELECT query.
 */
export class Selection {
  values: string[] = [];

  constructor(...values: string[]) {
    this.set(...values);
  }

  merge(selection: Selection) {
    this.values.push(...selection.values);
  }

  set(...values: string[]) {
    this.values = [...values];
  }

  push(...values: string[]) {
    this.values.push(...values);
  }

  toString() {
    if (this.values.length === 0) {
      return "";
    }
    return this.values.join(", ");
  }
}

/**
 * FROM component of a SELECT query.
 */
export class Source {
  values: string[] = [];

  constructor(...values: string[]) {
    this.set(...values);
  }

  merge(source: Source) {
    this.values.push(...source.values);
  }

  set(...values: string[]) {
    this.values = [...values];
  }

  push(...values: string[]) {
    this.values.push(...values);
  }

  toString() {
    if (this.values.length === 0) {
      return "";
    }
    return `FROM ${this.values.join(", ")}`;
  }
}

/**
 * JOIN component of a SELECT query.
 */
export class Join {
  clauses: string[] = [];

  constructor(...clauses: string[]) {
    this.set(...clauses);
  }

  merge(join: Join) {
    this.clauses.push(...join.clauses);
  }

  set(...clauses: string[]) {
    this.clauses = [...clauses];
  }

  push(...clauses: string[]) {
    this.clauses.push(...clauses);
  }

  toString() {
    if (this.clauses.length === 0) {
      return "";
    }

    return this.clauses
      .map((value) => {
        if (/^((INNER|((LEFT|RIGHT|FULL)( OUTER)?)) )?JOIN\b/i.exec(value)) {
          return value;
        }
        return `JOIN ${value}`;
      })
      .join(" ");
  }
}

/**
 * WHERE component of a SELECT/UPDATE query.
 */
export class Criteria {
  clauses: Expression[] = [];

  constructor(clause?: Literal, ...bindings: Binding[]) {
    if (clause) {
      this.set(clause, ...bindings);
    }
  }

  get bindings() {
    return this.clauses.flatMap(([, ...bindings]) => bindings);
  }

  merge(criteria: Criteria) {
    this.clauses.push(...criteria.clauses);
  }

  set(...expr: Expression) {
    this.clauses = [expr];
  }

  push(...expr: Expression) {
    this.clauses.push(expr);
  }

  toString() {
    if (this.clauses.length === 0) {
      return "";
    }

    return `WHERE ${this.clauses.map(([clause]) => clause).join(" AND ")}`;
  }
}

/**
 * GROUP BY component of a SELECT query.
 */
export class Group {
  terms: string[] = [];

  constructor(...terms: string[]) {
    this.set(...terms);
  }

  merge(group: Group) {
    this.terms.push(...group.terms);
  }

  set(...terms: string[]) {
    this.terms = [...terms];
  }

  push(...terms: string[]) {
    this.terms.push(...terms);
  }

  toString() {
    if (this.terms.length === 0) {
      return "";
    }
    return `GROUP BY ${this.terms.join(", ")}`;
  }
}

/**
 * ORDER BY component of a SELECT query.
 */
export class Order {
  terms: string[] = [];

  constructor(...terms: string[]) {
    this.set(...terms);
  }

  merge(group: Group) {
    this.terms.push(...group.terms);
  }

  set(...terms: string[]) {
    this.terms = [...terms];
  }

  push(...terms: string[]) {
    this.terms.push(...terms);
  }

  toString() {
    if (this.terms.length === 0) {
      return "";
    }
    return `ORDER BY ${this.terms.join(", ")}`;
  }
}

/**
 * LIMIT component of a SELECT/UPDATE query.
 */
export class Limit {
  value?: number;

  constructor(value?: number) {
    if (value !== undefined) {
      this.set(value);
    }
  }

  merge(limit: Limit) {
    this.value = limit.value;
  }

  set(value: number) {
    this.value = value;
  }

  toString() {
    if (this.value === undefined) {
      return "";
    }
    return `LIMIT ${this.value}`;
  }
}

/**
 * OFFSET component of a SELECT query.
 */
export class Offset {
  value?: number;

  constructor(value?: number) {
    if (value !== undefined) {
      this.set(value);
    }
  }

  merge(limit: Offset) {
    this.value = limit.value;
  }

  set(value: number) {
    this.value = value;
  }

  toString() {
    if (this.value === undefined) {
      return "";
    }
    return `OFFSET ${this.value}`;
  }
}

/**
 * SQL query builder.
 */
export class Query {
  components: Component[] = [];

  constructor(...components: Component[]) {
    this.set(...components);
  }

  get bindings() {
    return this.components.flatMap((component) => {
      if (typeof component === "object" && "bindings" in component) {
        const bindings = component.bindings;

        if (bindings) {
          return bindings;
        }
      }

      return [];
    });
  }

  merge(query: Query) {
    this.components.push(...query.components);
  }

  set(...components: Component[]) {
    this.components = [...components];
  }

  push(...components: Component[]) {
    this.components.push(...components);
  }

  toString() {
    return `${this.components
      .map((component) => component.toString())
      .filter(Boolean)
      .join(" ")};`;
  }

  toParams() {
    return [this.toString(), ...this.bindings] as const;
  }
}

/**
 * SQL IN expression.
 */
export class In<T extends Literal, U extends string | number> {
  column: T = "" as T;
  values: U[] = [];

  constructor(column?: T, ...values: U[]) {
    if (column) {
      this.set(column, ...values);
    }
  }

  get bindings() {
    return this.values;
  }

  merge(list: In<T, U>) {
    this.values.push(...list.values);
  }

  set(column: T, ...values: U[]) {
    this.column = column;
    this.values = [...values];
  }

  push(...values: U[]) {
    this.values.push(...values);
  }

  toString() {
    if (this.values.length === 0) {
      return "";
    }

    return `${this.column} IN (${this.values.map(() => "?").join(", ")})`;
  }

  toParams() {
    return [this.toString(), ...this.bindings] as const;
  }
}
