// Throwaway Clerk users for end-to-end tests, made through Clerk's Backend API.
// The secret key is read from the environment when a request is made. Neither
// it nor the passwords are ever printed, logged or written anywhere.
import { randomBytes } from "node:crypto";

export type TestUser = { id: string; email: string };

const API = "https://api.clerk.com/v1";
// Clerk treats +clerk_test addresses as test addresses and sends no real email.
const TEST_EMAIL = /^date-night-e2e-[a-z0-9-]+\+clerk_test@example\.com$/;

function secretKey() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY isn't set. Add it to .env.local or the environment.");
  // Development keys only (AGENTS.md): never create or delete users in production.
  if (!key.startsWith("sk_test_")) throw new Error("CLERK_SECRET_KEY isn't a development key. Refusing to run.");
  return key;
}

async function clerkApi(method: "POST" | "DELETE", path: string, body?: object) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    // Only Clerk's error code and message, never the request, which holds the key and password.
    const error = json?.errors?.[0];
    throw new Error(`Clerk ${method} ${path} failed: HTTP ${res.status}${error ? ` ${error.code}: ${error.message}` : ""}`);
  }
  return json;
}

/** A user with a unique +clerk_test email and a random password that isn't kept. */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `date-night-e2e-${label}-${Date.now()}-${randomBytes(3).toString("hex")}+clerk_test@example.com`;
  const user = await clerkApi("POST", "/users", {
    email_address: [email],
    password: randomBytes(24).toString("base64url"),
  });
  return { id: user.id, email };
}

export async function deleteTestUser(user: TestUser) {
  // Only ever deletes users made by createTestUser.
  if (!TEST_EMAIL.test(user.email) || !/^user_[A-Za-z0-9]+$/.test(user.id)) {
    throw new Error(`Refusing to delete ${user.id}: not a test user`);
  }
  await clerkApi("DELETE", `/users/${user.id}`);
}
