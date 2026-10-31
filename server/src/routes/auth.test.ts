import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authRouter } from "./auth.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  return app;
}

describe("auth routes", () => {
  it("rejects an invalid login payload", async () => {
    const response = await request(createApp())
      .post("/api/auth/login")
      .send({ username: "ab", password: "123" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid payload" });
  });

  it("rejects an invalid registration payload", async () => {
    const response = await request(createApp())
      .post("/api/auth/register")
      .send({ username: "alice", password: "secret1", displayName: "" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid payload" });
  });
});
