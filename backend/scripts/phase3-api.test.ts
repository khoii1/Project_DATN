import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = `http://127.0.0.1:${process.env.PORT ?? 5000}/api`;
const qaOwnerEmail = "qa_phase3_owner@smartagri.local";
const results: Array<{ test: string; status: number; passed: boolean }> = [];
const createdIds = new Set<string>();

interface JsonObject { [key: string]: unknown; }
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  return { status: response.status, body: await response.json() as JsonObject };
}
function bearer(token: string): HeadersInit { return { Authorization: `Bearer ${token}` }; }
function assert(test: string, actual: number, expected: number) { const passed = actual === expected; results.push({ test, status: actual, passed }); if (!passed) throw new Error(`${test}: expected ${expected}, received ${actual}`); }
async function login(email: string, password: string) { return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); }
function tokenOf(response: { body: JsonObject }) { return (response.body.data as { accessToken: string }).accessToken; }
function idOf(response: { body: JsonObject }, key: string) { const id = ((response.body.data as Record<string, { id: string }>)[key]).id; createdIds.add(id); return id; }

async function cleanup() {
  const farms = await prisma.farm.findMany({ where: { name: { startsWith: "QA_" } }, select: { id: true, zones: { select: { id: true, crops: { select: { id: true } } } } } });
  const ids = farms.flatMap((farm) => [farm.id, ...farm.zones.flatMap((zone) => [zone.id, ...zone.crops.map((crop) => crop.id)])]);
  const qaOwner = await prisma.user.findUnique({ where: { email: qaOwnerEmail }, select: { id: true } });
  await prisma.activityLog.deleteMany({ where: { OR: [{ entityId: { in: ids } }, ...(qaOwner ? [{ userId: qaOwner.id }] : [])] } });
  await prisma.farm.deleteMany({ where: { name: { startsWith: "QA_" } } });
  await prisma.user.deleteMany({ where: { email: qaOwnerEmail } });
}

async function run() {
  await cleanup();
  const [adminLogin, ownerLogin, staffLogin] = await Promise.all([
    login("admin@smartagri.local", "Admin123"), login("owner@smartagri.local", "Owner123"), login("staff@smartagri.local", "Staff123"),
  ]);
  const admin = tokenOf(adminLogin); const owner = tokenOf(ownerLogin); const staff = tokenOf(staffLogin);
  const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: "staff@smartagri.local" } });

  const createOwner = await request("/users", { method: "POST", headers: bearer(admin), body: JSON.stringify({ fullName: "QA Owner B", email: qaOwnerEmail, password: "OwnerB123", role: "FARM_OWNER" }) });
  assert("ADMIN creates QA owner", createOwner.status, 201);
  const ownerBId = idOf(createOwner, "user");

  const adminFarm = await request("/farms", { method: "POST", headers: bearer(admin), body: JSON.stringify({ name: "QA_Farm_B", ownerId: ownerBId, address: "Lâm Đồng", areaHectares: 5 }) });
  assert("ADMIN create Farm", adminFarm.status, 201); const farmBId = idOf(adminFarm, "farm");
  const ownerFarm = await request("/farms", { method: "POST", headers: bearer(owner), body: JSON.stringify({ name: "QA_Farm_A", address: "Đà Lạt", areaHectares: 4 }) });
  assert("OWNER create own Farm", ownerFarm.status, 201); const farmAId = idOf(ownerFarm, "farm");
  assert("OWNER cannot submit ownerId", (await request("/farms", { method: "POST", headers: bearer(owner), body: JSON.stringify({ name: "QA_Invalid_Owner", ownerId: ownerBId }) })).status, 400);
  assert("ADMIN list all Farms", (await request("/farms?search=QA_", { headers: bearer(admin) })).status, 200);
  const ownerList = await request("/farms?search=QA_", { headers: bearer(owner) }); assert("OWNER scoped Farm list", ownerList.status, 200);
  const ownerItems = (ownerList.body.data as { items: Array<{ id: string }> }).items; if (ownerItems.some((item) => item.id === farmBId)) throw new Error("OWNER list leaked another owner's Farm");
  assert("OWNER view own Farm", (await request(`/farms/${farmAId}`, { headers: bearer(owner) })).status, 200);
  assert("OWNER update own Farm", (await request(`/farms/${farmAId}`, { method: "PATCH", headers: bearer(owner), body: JSON.stringify({ address: "Đà Lạt đã sửa" }) })).status, 200);
  assert("OWNER cannot view other Farm", (await request(`/farms/${farmBId}`, { headers: bearer(owner) })).status, 404);
  assert("OWNER cannot update other Farm", (await request(`/farms/${farmBId}`, { method: "PATCH", headers: bearer(owner), body: JSON.stringify({ name: "Bị sửa" }) })).status, 404);

  const zoneA = await request("/zones", { method: "POST", headers: bearer(owner), body: JSON.stringify({ farmId: farmAId, name: "QA_Zone_A", areaHectares: 1.2 }) });
  assert("OWNER create Zone own Farm", zoneA.status, 201); const zoneAId = idOf(zoneA, "zone");
  assert("Duplicate Zone name", (await request("/zones", { method: "POST", headers: bearer(owner), body: JSON.stringify({ farmId: farmAId, name: "QA_Zone_A" }) })).status, 409);
  const cropA = await request("/crops", { method: "POST", headers: bearer(owner), body: JSON.stringify({ zoneId: zoneAId, name: "QA_Crop_A", variety: "Cherry", plantingDate: "2026-08-20", expectedHarvestDate: "2026-11-20", status: "GROWING" }) });
  assert("OWNER create Crop own Zone", cropA.status, 201); const cropAId = idOf(cropA, "crop");
  assert("Invalid Crop dates", (await request("/crops", { method: "POST", headers: bearer(owner), body: JSON.stringify({ zoneId: zoneAId, name: "QA_Bad_Date", plantingDate: "2026-08-20", expectedHarvestDate: "2026-08-10" }) })).status, 400);
  assert("OWNER assign Staff", (await request(`/farms/${farmAId}/staff`, { method: "POST", headers: bearer(owner), body: JSON.stringify({ staffId: staffUser.id }) })).status, 201);
  assert("Duplicate Staff assignment", (await request(`/farms/${farmAId}/staff`, { method: "POST", headers: bearer(owner), body: JSON.stringify({ staffId: staffUser.id }) })).status, 409);
  assert("OWNER list assigned Staff", (await request(`/farms/${farmAId}/staff`, { headers: bearer(owner) })).status, 200);

  const zoneB = await request("/zones", { method: "POST", headers: bearer(admin), body: JSON.stringify({ farmId: farmBId, name: "QA_Zone_B", areaHectares: 1 }) });
  assert("ADMIN create Zone", zoneB.status, 201); const zoneBId = idOf(zoneB, "zone");
  const cropB = await request("/crops", { method: "POST", headers: bearer(admin), body: JSON.stringify({ zoneId: zoneBId, name: "QA_Crop_B", status: "PLANNED" }) });
  assert("ADMIN create Crop", cropB.status, 201); const cropBId = idOf(cropB, "crop");
  assert("OWNER cross-farm create Zone blocked", (await request("/zones", { method: "POST", headers: bearer(owner), body: JSON.stringify({ farmId: farmBId, name: "QA_Cross" }) })).status, 404);
  assert("OWNER cross-farm update Zone blocked", (await request(`/zones/${zoneBId}`, { method: "PATCH", headers: bearer(owner), body: JSON.stringify({ name: "QA_Cross" }) })).status, 404);
  assert("OWNER cross-farm view Zone blocked", (await request(`/zones/${zoneBId}`, { headers: bearer(owner) })).status, 404);
  assert("OWNER cross-farm create Crop blocked", (await request("/crops", { method: "POST", headers: bearer(owner), body: JSON.stringify({ zoneId: zoneBId, name: "QA_Cross_Crop" }) })).status, 404);
  assert("OWNER cross-farm view Crop blocked", (await request(`/crops/${cropBId}`, { headers: bearer(owner) })).status, 404);
  assert("OWNER cross-farm assign Staff blocked", (await request(`/farms/${farmBId}/staff`, { method: "POST", headers: bearer(owner), body: JSON.stringify({ staffId: staffUser.id }) })).status, 404);

  assert("STAFF read assigned Farm", (await request(`/farms/${farmAId}`, { headers: bearer(staff) })).status, 200);
  assert("STAFF read assigned Zone", (await request(`/zones/${zoneAId}`, { headers: bearer(staff) })).status, 200);
  assert("STAFF read assigned Crop", (await request(`/crops/${cropAId}`, { headers: bearer(staff) })).status, 200);
  assert("STAFF unassigned Farm blocked", (await request(`/farms/${farmBId}`, { headers: bearer(staff) })).status, 404);
  assert("STAFF unassigned Zone blocked", (await request(`/zones/${zoneBId}`, { headers: bearer(staff) })).status, 404);
  assert("STAFF unassigned Crop blocked", (await request(`/crops/${cropBId}`, { headers: bearer(staff) })).status, 404);
  const staffList = await request("/farms?search=QA_", { headers: bearer(staff) }); assert("STAFF scoped list", staffList.status, 200);
  if ((staffList.body.data as { items: Array<{ id: string }> }).items.some((item) => item.id === farmBId)) throw new Error("STAFF list leaked unassigned Farm");
  assert("STAFF create Farm forbidden", (await request("/farms", { method: "POST", headers: bearer(staff), body: JSON.stringify({ name: "QA_Staff" }) })).status, 403);
  assert("STAFF update Farm forbidden", (await request(`/farms/${farmAId}`, { method: "PATCH", headers: bearer(staff), body: JSON.stringify({ name: "QA_Staff" }) })).status, 403);
  assert("STAFF create Zone forbidden", (await request("/zones", { method: "POST", headers: bearer(staff), body: JSON.stringify({ farmId: farmAId, name: "QA_Staff" }) })).status, 403);
  assert("STAFF update Zone forbidden", (await request(`/zones/${zoneAId}`, { method: "PATCH", headers: bearer(staff), body: JSON.stringify({ name: "QA_Staff" }) })).status, 403);
  assert("STAFF create Crop forbidden", (await request("/crops", { method: "POST", headers: bearer(staff), body: JSON.stringify({ zoneId: zoneAId, name: "QA_Staff" }) })).status, 403);
  assert("STAFF update Crop forbidden", (await request(`/crops/${cropAId}`, { method: "PATCH", headers: bearer(staff), body: JSON.stringify({ name: "QA_Staff" }) })).status, 403);
  assert("STAFF assign forbidden", (await request(`/farms/${farmAId}/staff`, { method: "POST", headers: bearer(staff), body: JSON.stringify({ staffId: staffUser.id }) })).status, 403);

  assert("Immutable Zone farmId", (await request(`/zones/${zoneAId}`, { method: "PATCH", headers: bearer(owner), body: JSON.stringify({ farmId: farmBId }) })).status, 400);
  assert("Immutable Crop zoneId", (await request(`/crops/${cropAId}`, { method: "PATCH", headers: bearer(owner), body: JSON.stringify({ zoneId: zoneBId }) })).status, 400);
  assert("Deactivate Farm", (await request(`/farms/${farmBId}`, { method: "PATCH", headers: bearer(admin), body: JSON.stringify({ status: "INACTIVE" }) })).status, 200);
  assert("Zone in inactive Farm rejected", (await request("/zones", { method: "POST", headers: bearer(admin), body: JSON.stringify({ farmId: farmBId, name: "QA_Inactive" }) })).status, 400);
  assert("Deactivate Zone", (await request(`/zones/${zoneAId}`, { method: "PATCH", headers: bearer(owner), body: JSON.stringify({ status: "INACTIVE" }) })).status, 200);
  assert("GROWING Crop in inactive Zone rejected", (await request("/crops", { method: "POST", headers: bearer(owner), body: JSON.stringify({ zoneId: zoneAId, name: "QA_Inactive_Crop", status: "GROWING" }) })).status, 400);
  assert("Remove Staff assignment", (await request(`/farms/${farmAId}/staff/${staffUser.id}`, { method: "DELETE", headers: bearer(owner) })).status, 200);
  assert("Removed STAFF loses Farm access", (await request(`/farms/${farmAId}`, { headers: bearer(staff) })).status, 404);
  const activityCount = await prisma.activityLog.count({ where: { entityId: { in: [...createdIds] } } });
  if (activityCount < 10) throw new Error(`Expected business activity logs, received ${activityCount}`);
  results.push({ test: "Activity logs recorded", status: activityCount, passed: true });
  console.table(results);
  console.log(`Phase 3 API tests passed: ${results.length}/${results.length}`);
}

run().finally(async () => { await cleanup(); await prisma.$disconnect(); }).catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Phase 3 API tests failed"); process.exitCode = 1; });
