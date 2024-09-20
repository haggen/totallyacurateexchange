type ReqDesc<T = unknown> = {
  method: "get" | "post" | "put" | "patch" | "delete";
  headers: Record<string, string>;
  body?: T;
};

type RespDesc<T = unknown> = {
  status: number;
  headers: Record<string, string>;
  body: T;
};

export async function request<T>(url: string, reqDesc: Partial<ReqDesc> = {}) {
  if ("body" in reqDesc) {
    reqDesc.method ??= "post";
    if (reqDesc.body instanceof FormData) {
      reqDesc.body = Object.fromEntries(reqDesc.body.entries());
    }
  }

  reqDesc.method ??= "get";

  reqDesc.headers ??= {};
  reqDesc.headers["Content-Type"] ??= "application/json; charset=utf-8";

  const response = await fetch(url, {
    method: reqDesc.method,
    headers: reqDesc.headers,
    body: JSON.stringify(reqDesc.body),
    credentials: "same-origin",
  });

  const respDesc = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: (await response.json()) as T,
  };

  if (!response.ok) {
    throw respDesc as RespDesc<T>;
  }
  return respDesc as RespDesc<T>;
}
