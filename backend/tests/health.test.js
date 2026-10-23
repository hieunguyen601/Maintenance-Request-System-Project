import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import app from "../app.js";

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

test("Signup should reject empty fields", async () => {
    const response = await request(app)
        .post("/api/user")
        .send({});

        assert.equal(response.status, 400);
});