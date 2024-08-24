class Columns {
  content: string[] = [];

  constructor(...content: string[]) {
    this.content.push(...content);
  }

  toString() {
    if (this.content.length < 1) {
      return "";
    }
    return `SELECT ${this.content.join(", ")}`;
  }

  merge(columns: Columns) {
    this.content.push(...columns.content);
  }

  reset(...content: string[]) {
    this.content = [...content];
  }
}

class Sources {
  content: string[] = [];

  constructor(...content: string[]) {
    this.content.push(...content);
  }

  toString() {
    if (this.content.length < 1) {
      return "";
    }
    return `FROM ${this.content.join(", ")}`;
  }

  merge(sources: Sources) {
    this.content.push(...sources.content);
  }

  reset(...content: string[]) {
    this.content = [...content];
  }
}

class Joins {
  content: string[] = [];

  toString() {
    if (this.content.length < 1) {
      return "";
    }
    return this.content
      .map((value) => {
        if (/^((INNER|((LEFT|RIGHT|FULL)( OUTER)?)) )?JOIN\b/i.exec(value)) {
          return value;
        }
        return `JOIN ${value}`;
      })
      .join(" ");
  }

  merge(sources: Sources) {
    this.content.push(...sources.content);
  }

  reset(...content: string[]) {
    this.content = [...content];
  }
}

class Criteria {
  clauses: [string, ...unknown[]][] = [];

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

  reset(clause: string, ...bindings: unknown[]) {
    this.clauses = [[clause, ...bindings]];
  }
}

class Groups {
  terms: string[] = [];

  constructor(...terms: string[]) {
    this.terms.push(...terms);
  }

  toString() {
    if (this.terms.length < 1) {
      return "";
    }
    return `GROUP BY ${this.terms.join(", ")}`;
  }

  merge(groups: Groups) {
    this.terms.push(...groups.terms);
  }

  reset(...terms: string[]) {
    this.terms = [...terms];
  }
}

class Order {
  terms: string[] = [];

  constructor(...terms: string[]) {
    this.terms.push(...terms);
  }

  toString() {
    if (this.terms.length < 1) {
      return "";
    }
    return `ORDER BY ${this.terms.join(", ")}`;
  }

  merge(order: Order) {
    this.terms.push(...order.terms);
  }

  reset(...terms: string[]) {
    this.terms = [...terms];
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

class Offset {
  value?: number;

  constructor(value?: number) {
    this.value = value;
  }

  toString() {
    if (this.value === undefined) {
      return "";
    }
    return `OFFSET ${this.value}`;
  }

  merge(offset: Offset) {
    this.value = offset.value ?? this.value;
  }

  reset(value?: number) {
    this.value = value;
  }
}

class SelectQuery {
  parts = {
    columns: new Columns(),
    sources: new Sources(),
    joins: new Joins(),
    criteria: new Criteria(),
    limit: new Limit(),
    offset: new Offset(),
    groups: new Groups(),
    order: new Order(),
  } as const;

  get bindings() {
    return this.parts.criteria.bindings;
  }

  merge(query: SelectQuery) {
    this.parts.columns.merge(query.parts.columns);
    this.parts.sources.merge(query.parts.sources);
    this.parts.joins.merge(query.parts.joins);
    this.parts.criteria.merge(query.parts.criteria);
    this.parts.groups.merge(query.parts.groups);
    this.parts.order.merge(query.parts.order);
    this.parts.limit.merge(query.parts.limit);
    this.parts.offset.merge(query.parts.offset);
  }

  select(...columns: string[]) {
    this.parts.columns.reset(...columns);
  }

  from(...content: string[]) {
    this.parts.sources.reset(...content);
  }

  join(...content: string[]) {
    this.parts.joins.reset(...content);
  }

  where(clause: string, ...bindings: unknown[]) {
    this.parts.criteria.reset(clause, ...bindings);
  }

  groupBy(...terms: string[]) {
    this.parts.groups.reset(...terms);
  }

  orderBy(...terms: string[]) {
    this.parts.order.reset(...terms);
  }

  limit(value: number) {
    this.parts.limit.reset(value);
  }

  offset(value: number) {
    this.parts.offset.reset(value);
  }

  toString() {
    const { columns, sources, joins, criteria, groups, order, limit, offset } =
      this.parts;

    return `${[columns, sources, joins, criteria, groups, order, limit, offset]
      .map(String)
      .filter(Boolean)
      .join(" ")};`;
  }
}

export function select(...columns: string[]) {
  const query = new SelectQuery();
  query.select(...columns);
  return query;
}

export function from(...sources: string[]) {
  const query = new SelectQuery();
  query.from(...sources);
  return query;
}

export function where(clause: string, ...bindings: unknown[]) {
  const query = new SelectQuery();
  query.where(clause, ...bindings);
  return query;
}

export function join(...content: string[]) {
  const query = new SelectQuery();
  query.join(...content);
  return query;
}

export function limit(value: number) {
  const query = new SelectQuery();
  query.limit(value);
  return query;
}

export function offset(value: number) {
  const query = new SelectQuery();
  query.offset(value);
  return query;
}

export function groupBy(...terms: string[]) {
  const query = new SelectQuery();
  query.groupBy(...terms);
  return query;
}

export function orderBy(...terms: string[]) {
  const query = new SelectQuery();
  query.orderBy(...terms);
  return query;
}
