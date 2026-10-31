import jwt from "jsonwebtoken";
import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticate, type AuthRequest } from "./auth.js";

vi.mock("../config/env.js", () => ({
  config: { jwtSecret: "test-secret" },
}));

function createResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));

  return {
    response: { status, json } as unknown as Response,
    status,
    json,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticate", () => {
  it("rejects a request without a bearer token", () => {
    const { response, status, json } = createResponse();
    const next = vi.fn();

    authenticate({ headers: {} } as AuthRequest, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid token", () => {
    const { response, status, json } = createResponse();
    const next = vi.fn();

    authenticate(
      { headers: { authorization: "Bearer broken-token" } } as AuthRequest,
      response,
      next,
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("puts user data on the request and calls next for a valid token", () => {
    const { response } = createResponse();
    const next = vi.fn();
    const token = jwt.sign({ userId: "user-1", username: "alice" }, "test-secret");
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as AuthRequest;

    authenticate(request, response, next);

    expect(request.userId).toBe("user-1");
    expect(request.username).toBe("alice");
    expect(next).toHaveBeenCalledOnce();
  });
});
