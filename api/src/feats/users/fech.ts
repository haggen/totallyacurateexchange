import { api } from "~/src/feats/api";
import { Status } from "~/src/shared/response";

async function POST(request: Request) {
  const data = await request.json();

  const organization = await api.users.create({
    payload: {
      name: "",
      email: data.email,
      password: data.password,
    },
  });

  return Response.json(organization, { status: Status.Created });
}

async function PATCH(request: Request) {
  const data = await request.json();
}

export async function fetch(request: Request) {
  switch (request.method) {
    case "POST":
      return await POST(request);
    case "PATCH":
      return await POST(request);
    default:
      return new Response(null, { status: Status.MethodNotAllowed });
  }
}
