type Bindings = Record<string, string | number | boolean | null | undefined>;

class Target {
  name: string;

  constructor(name = "") {
    this.name = name;
  }

  toString() {
    return `INSERT INTO ${this.name}`;
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

class InsertQuery {
  parts = {
    target: new Target(),
    values: new Values(),
  };

  get bindings() {
    return this.parts.values.bindings;
  }

  toString() {
    const { target, values } = this.parts;
    return `${[target, values].map(String).filter(Boolean).join(" ")};`;
  }

  merge(query: InsertQuery) {
    this.parts.target.merge(query.parts.target);
    this.parts.values.merge(query.parts.values);
  }

  insert(name: string) {
    this.parts.target.reset(name);
    return this;
  }

  values(bindings: Bindings) {
    this.parts.values.reset(bindings);
    return this;
  }
}

export function insert(name: string) {
  const query = new InsertQuery();
  query.parts.target.reset(name);
  return query;
}

export function values(bindings: Bindings) {
  const query = new InsertQuery();
  query.parts.values.reset(bindings);
  return query;
}
