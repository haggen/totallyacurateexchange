/**
 * Get SQL for update values.
 */
export function getUpdateSet<T extends Record<string, unknown>>(data: T) {
  return Object.entries(data)
    .map(([key, value]) => (value !== undefined ? `${key} = $${key}` : ""))
    .filter(Boolean)
    .join(", ");
}

type Bindings = Record<string, string | number | boolean | null | undefined>;

class Target {
  name: string;

  constructor(name = "") {
    this.name = name;
  }

  toString() {
    return `UPDATE ${this.name}`;
  }

  merge(target: Target) {
    this.name = target.name;
  }

  reset(name: string) {
    this.name = name;
  }
}

class Values {
  bindings: Bindings;

  constructor(bindings: Bindings = {}) {
    this.bindings = bindings;
  }

  toString() {
    const keys = Object.keys(this.bindings);

    return `(${keys.join(", ")}) VALUES (${keys
      .map((key) => `$${key}`)
      .join(", ")})`;
  }

  merge(values: Values) {
    Object.assign(this.bindings, values.bindings);
  }

  reset(bindings: Bindings = {}) {
    this.bindings = bindings;
  }
}

class Criteria {
  clauses: [string, ...Bindings[]][] = [];

  toString() {
    if (this.clauses.length < 1) {
      return "";
    }

    return `WHERE ${this.clauses.map((clause) => clause[0]).join(" AND ")}`;
  }

  get bindings() {
    return this.clauses.flatMap(([, ...bindings]) => bindings);
  }

  merge(criteria: Criteria) {
    this.clauses.push(...criteria.clauses);
  }

  reset(clause: string, ...bindings: Bindings[]) {
    this.clauses = [[clause, ...bindings]];
  }
}

class Limit {
  value?: number;

  constructor(value?: number) {
    this.value = value;
  }

  toString() {
    if (this.value === undefined) {
      return "";
    }
    return `LIMIT ${this.value}`;
  }

  merge(limit: Limit) {
    this.value = limit.value ?? this.value;
  }

  reset(value?: number) {
    this.value = value;
  }
}

class UpdateQuery {
  parts = {
    target: new Target(),
    values: new Values(),
    criteria: new Criteria(),
    limit: new Limit(),
  };

  get bindings() {
    return this.parts.values.bindings;
  }

  toString() {
    const { target, values } = this.parts;
    return `${[target, values].map(String).filter(Boolean).join(" ")};`;
  }

  merge(query: UpdateQuery) {
    this.parts.target.merge(query.parts.target);
    this.parts.values.merge(query.parts.values);
  }

  update(name: string) {
    this.parts.target.reset(name);
    return this;
  }

  set(bindings: Bindings) {
    this.parts.values.reset(bindings);
    return this;
  }
}

export function update(name: string) {
  const query = new UpdateQuery();
  query.parts.target.reset(name);
  return query;
}

export function set(bindings: Bindings) {
  const query = new UpdateQuery();
  query.parts.values.reset(bindings);
  return query;
}

export function where(clause: string, ...bindings: Bindings[]) {
  const query = new UpdateQuery();
  query.parts.criteria.reset(clause, ...bindings);
  return query;
}

export function limit(value: number) {
  const query = new UpdateQuery();
  query.parts.limit.reset(value);
  return query;
}
