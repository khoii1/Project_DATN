import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const baseUrl = `http://127.0.0.1:${process.env.PORT ?? 5000}/api`;
const prisma = new PrismaClient();
const testEmail = "phase2.qa@smartagri.local";
const results: Array<{ test: string; status: number; passed: boolean }> = [];

interface JsonObject { [key: string]: unknown; }

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: JsonObject }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  return { status: response.status, body: await response.json() as JsonObject };
}

function assert(test: string, actual: number, expected: number): void {
  const passed = actual === expected;
  results.push({ test, status: actual, passed });
  if (!passed) throw new Error(`${test}: expected ${expected}, received ${actual}`);
}

function bearer(token: string): HeadersInit { return { Authorization: `Bearer ${token}` }; }
function hasSensitiveField(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => key === "passwordHash" || key === "password" || hasSensitiveField(child));
}

async function login(email: string, password: string) {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

async function run(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: testEmail } });

  const admin = await login("admin@smartagri.local", "Admin123");
  const owner = await login("owner@smartagri.local", "Owner123");
  const staff = await login("staff@smartagri.local", "Staff123");
  assert("Login ADMIN", admin.status, 200);
  assert("Login FARM_OWNER", owner.status, 200);
  assert("Login STAFF", staff.status, 200);

  const adminData = admin.body.data as { accessToken: string; user: { id: string } };
  const ownerToken = (owner.body.data as { accessToken: string }).accessToken;
  const staffToken = (staff.body.data as { accessToken: string }).accessToken;
  if (hasSensitiveField(admin.body) || hasSensitiveField(owner.body) || hasSensitiveField(staff.body)) throw new Error("Sensitive password field leaked in login response");

  const wrong = await login("admin@smartagri.local", "Wrong123");
  const unknown = await login("unknown@smartagri.local", "Wrong123");
  assert("Wrong password", wrong.status, 401);
  assert("Unknown email", unknown.status, 401);
  if (wrong.body.message !== unknown.body.message) throw new Error("Login failure messages reveal account existence");

  assert("Auth me valid", (await request("/auth/me", { headers: bearer(adminData.accessToken) })).status, 200);
  assert("Auth me missing token", (await request("/auth/me")).status, 401);
  assert("Auth me invalid token", (await request("/auth/me", { headers: bearer("invalid.token.value") })).status, 401);
  const expiredToken = jwt.sign({ role: "ADMIN" }, process.env.JWT_SECRET!, { subject: adminData.user.id, expiresIn: -1 });
  assert("Auth me expired token", (await request("/auth/me", { headers: bearer(expiredToken) })).status, 401);

  const adminList = await request("/users?page=1&limit=10", { headers: bearer(adminData.accessToken) });
  assert("ADMIN list users", adminList.status, 200);
  assert("FARM_OWNER forbidden", (await request("/users", { headers: bearer(ownerToken) })).status, 403);
  assert("STAFF forbidden", (await request("/users", { headers: bearer(staffToken) })).status, 403);
  if (hasSensitiveField(adminList.body)) throw new Error("Sensitive password field leaked in user list");

  const create = await request("/users", {
    method: "POST",
    headers: bearer(adminData.accessToken),
    body: JSON.stringify({ fullName: "Tài khoản QA", email: testEmail, phone: "0901234567", password: "Test1234", role: "STAFF" }),
  });
  assert("Create user", create.status, 201);
  const created = (create.body.data as { user: { id: string } }).user;
  assert("Duplicate email", (await request("/users", { method: "POST", headers: bearer(adminData.accessToken), body: JSON.stringify({ fullName: "Trùng email", email: testEmail.toUpperCase(), password: "Test1234", role: "STAFF" }) })).status, 409);
  assert("Get user detail", (await request(`/users/${created.id}`, { headers: bearer(adminData.accessToken) })).status, 200);
  assert("Edit user", (await request(`/users/${created.id}`, { method: "PATCH", headers: bearer(adminData.accessToken), body: JSON.stringify({ fullName: "Tài khoản QA đã sửa", role: "FARM_OWNER" }) })).status, 200);

  const testLogin = await login(testEmail, "Test1234");
  assert("Login test user before deactivation", testLogin.status, 200);
  const testToken = (testLogin.body.data as { accessToken: string }).accessToken;
  assert("Deactivate user", (await request(`/users/${created.id}`, { method: "PATCH", headers: bearer(adminData.accessToken), body: JSON.stringify({ status: "INACTIVE" }) })).status, 200);
  assert("Inactive login forbidden", (await login(testEmail, "Test1234")).status, 403);
  assert("Inactive old token rejected", (await request("/auth/me", { headers: bearer(testToken) })).status, 401);
  assert("Reactivate user", (await request(`/users/${created.id}`, { method: "PATCH", headers: bearer(adminData.accessToken), body: JSON.stringify({ status: "ACTIVE" }) })).status, 200);
  assert("Admin cannot deactivate self", (await request(`/users/${adminData.user.id}`, { method: "PATCH", headers: bearer(adminData.accessToken), body: JSON.stringify({ status: "INACTIVE" }) })).status, 400);
  assert("Logout", (await request("/auth/logout", { method: "POST", headers: bearer(adminData.accessToken) })).status, 200);

  console.table(results);
  console.log(`Authentication API tests passed: ${results.length}/${results.length}`);
}

run()
  .finally(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Authentication API tests failed");
    process.exitCode = 1;
  });
