import { chromium } from "playwright-core";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:5173";
const executablePath = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const checks = [];
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
function check(name, passed, detail = "") { checks.push({ name, passed, detail }); if (!passed) throw new Error(`${name}${detail ? `: ${detail}` : ""}`); }
async function login(email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/dashboard");
}
async function resetSession() { await page.evaluate(() => localStorage.clear()); }

try {
  await login("admin@smartagri.local", "Admin123");
  await page.goto(`${baseUrl}/farms`, { waitUntil: "networkidle" });
  check("Farm list loads seeded data", await page.getByText("Green Farm", { exact: true }).first().isVisible());
  await page.getByRole("button", { name: "Thêm trang trại" }).click();
  const farmDialog = page.getByRole("dialog");
  await farmDialog.getByLabel(/Tên trang trại/).fill("QA_UI_Farm");
  const ownerSelect = farmDialog.getByLabel(/Chủ trang trại/);
  const ownerValue = await ownerSelect.locator("option").filter({ hasText: "owner@smartagri.local" }).getAttribute("value");
  await ownerSelect.selectOption(ownerValue);
  await farmDialog.getByLabel(/Địa chỉ/).fill("Đà Lạt");
  await farmDialog.getByLabel(/Diện tích/).fill("8.5");
  await farmDialog.getByRole("button", { name: "Tạo trang trại" }).click();
  await page.getByText("Tạo trang trại thành công", { exact: true }).waitFor();
  check("Create Farm through UI", await page.getByText("QA_UI_Farm", { exact: true }).isVisible());

  await page.getByRole("button", { name: "Chỉnh sửa QA_UI_Farm" }).click();
  await page.getByRole("dialog").getByLabel(/Địa chỉ/).fill("Đà Lạt, Lâm Đồng");
  await page.getByRole("dialog").getByRole("button", { name: "Lưu thay đổi" }).click();
  await page.getByText("Cập nhật trang trại thành công", { exact: true }).waitFor();
  check("Edit Farm through UI", await page.getByText("Đà Lạt, Lâm Đồng", { exact: true }).first().isVisible());

  await page.getByRole("link", { name: "Xem QA_UI_Farm" }).click();
  await page.waitForURL("**/farms/*");
  await page.getByRole("heading", { name: "QA_UI_Farm" }).waitFor();
  check("Farm detail route", await page.getByRole("heading", { name: "QA_UI_Farm" }).isVisible());
  await page.getByRole("button", { name: "Thêm khu vực" }).click();
  const zoneDialog = page.getByRole("dialog");
  await zoneDialog.getByLabel(/Tên khu vực/).fill("QA_UI_Zone");
  await zoneDialog.getByLabel(/Diện tích/).fill("2.5");
  await zoneDialog.getByRole("button", { name: "Tạo khu vực" }).click();
  await page.getByText("Tạo khu vực thành công", { exact: true }).waitFor();
  check("Create Zone from Farm detail", await page.getByText("QA_UI_Zone", { exact: true }).isVisible());

  await page.getByText("QA_UI_Zone", { exact: true }).click();
  await page.waitForURL("**/zones/*");
  await page.getByRole("heading", { name: "QA_UI_Zone" }).waitFor();
  check("Zone detail route", await page.getByRole("heading", { name: "QA_UI_Zone" }).isVisible());
  await page.getByRole("button", { name: "Thêm cây trồng" }).click();
  const cropDialog = page.getByRole("dialog");
  await cropDialog.getByLabel(/Tên cây trồng/).fill("QA_UI_Tomato");
  await cropDialog.getByLabel(/^Giống/).fill("Cherry");
  await cropDialog.getByLabel("Ngày trồng").fill("2026-08-01");
  await cropDialog.getByLabel("Thu hoạch dự kiến").fill("2026-11-01");
  await cropDialog.getByLabel(/Trạng thái/).selectOption("GROWING");
  await cropDialog.getByRole("button", { name: "Tạo cây trồng" }).click();
  await page.getByText("Tạo cây trồng thành công", { exact: true }).waitFor();
  check("Create Crop from Zone detail", await page.getByText("QA_UI_Tomato", { exact: true }).isVisible());
  await page.getByRole("button", { name: "Chỉnh sửa QA_UI_Tomato" }).click();
  await page.getByRole("dialog").getByLabel(/^Giống/).fill("Cherry đỏ");
  await page.getByRole("dialog").getByRole("button", { name: "Lưu thay đổi" }).click();
  await page.getByText("Cập nhật cây trồng thành công", { exact: true }).waitFor();
  check("Edit Crop through UI", await page.getByText("Cherry đỏ", { exact: true }).isVisible());

  await page.getByRole("link", { name: "QA_UI_Farm", exact: true }).click();
  await page.getByRole("button", { name: "Phân công", exact: true }).click();
  const staffDialog = page.getByRole("dialog");
  const staffSelect = staffDialog.getByLabel(/Nhân viên đang hoạt động/);
  const staffValue = await staffSelect.locator("option").filter({ hasText: "staff@smartagri.local" }).getAttribute("value");
  await staffSelect.selectOption(staffValue);
  await staffDialog.getByRole("button", { name: "Phân công" }).click();
  await page.getByText("Phân công nhân viên thành công", { exact: true }).waitFor();
  check("Assign Staff through UI", await page.getByText("staff@smartagri.local", { exact: true }).isVisible());
  await page.getByRole("button", { name: /Gỡ Nhân viên/ }).click();
  await page.getByRole("button", { name: "Gỡ phân công" }).click();
  await page.getByText("Đã gỡ nhân viên khỏi trang trại", { exact: true }).waitFor();
  check("Remove Staff assignment through UI", await page.getByText("staff@smartagri.local", { exact: true }).count() === 0);

  await page.goto(`${baseUrl}/crops`, { waitUntil: "networkidle" });
  check("Crop list reflects database", await page.getByText("QA_UI_Tomato", { exact: true }).isVisible());
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/farms`, { waitUntil: "networkidle" });
  const sizes = await page.locator("body").evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
  check("Phase 3 mobile layout has no page overflow", sizes.scrollWidth === sizes.clientWidth, JSON.stringify(sizes));

  await resetSession();
  await login("staff@smartagri.local", "Staff123");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/farms`, { waitUntil: "networkidle" });
  check("Staff sees assigned seeded Farm", await page.getByText("Green Farm", { exact: true }).first().isVisible());
  check("Staff Farm UI is read-only", await page.getByRole("button", { name: "Thêm trang trại" }).count() === 0 && await page.getByRole("button", { name: /Chỉnh sửa Green Farm/ }).count() === 0);
  await page.goto(`${baseUrl}/farms/${encodeURIComponent("not-in-scope")}`, { waitUntil: "networkidle" });
  check("Out-of-scope resource has safe error UI", await page.getByRole("heading", { name: "Không thể mở trang trại" }).isVisible());
  const unexpectedConsoleErrors = consoleErrors.filter((message) => !message.includes("404"));
  check("No unexpected browser console errors", unexpectedConsoleErrors.length === 0, unexpectedConsoleErrors.join(" | "));
  console.table(checks);
  console.log(`Phase 3 browser tests passed: ${checks.length}/${checks.length}`);
} finally {
  await browser.close();
}
