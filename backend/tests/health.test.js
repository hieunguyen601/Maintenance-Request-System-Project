import test from "node:test";
import assert from "node:assert";
import { request } from "node:http";
import app from "../app";

test("Login with missing credentials", async () => {
    const response = await request(app)
        .post('/api/login')
        .send({});

    assert.equal(response.status, 400);
});

test("Login with incorrect password", async () => {
    const response = await request(app)
        .post("/api/login")
        .send({
            email: "test@example.com",
            password: "wrongpassword"
        });
    
        assert.equal(response.status, 401);
});