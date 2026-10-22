import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "tok" }) }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { ApiError, apiGet, apiPost } = await import("@/lib/api/client");

function respond(status: number, body?: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })));
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("API client", () => {
  it("sends the session token as a Bearer header", async () => {
    respond(200, []);
    await apiGet("/orders");
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("sends a signed-out user to the login page", async () => {
    respond(401, { detail: "Not signed in" });
    await expect(apiGet("/orders")).rejects.toThrow("redirect:/login?expired=1");
  });

  it("surfaces the API's message and status", async () => {
    respond(403, { detail: "Your role doesn't allow this" });
    const err = (await apiPost("/orders/intake", {}).catch((e) => e)) as InstanceType<typeof ApiError>;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Your role doesn't allow this");
  });

  it("uses the first field error from request validation", async () => {
    respond(422, { detail: [{ msg: "String should have at least 10 characters" }] });
    await expect(apiPost("/users", {})).rejects.toThrow("String should have at least 10 characters");
  });

  it("accepts 204 No Content", async () => {
    respond(204);
    await expect(apiPost("/auth/logout", {})).resolves.toBeUndefined();
  });
});
