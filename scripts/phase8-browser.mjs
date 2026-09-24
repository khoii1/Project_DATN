import { chromium } from "playwright-core";

const base = "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: "Asia/Bangkok" });
const checks = []; const errors = [];
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", error => errors.push(error.message));
function check(name, pass, detail = "") { checks.push({ name, pass, detail }); if (!pass) throw new Error(`${name}: ${detail}`); }
async function login(email, password) { await page.goto(`${base}/login`, { waitUntil: "networkidle" }); await page.getByLabel("Email").fill(email); await page.getByRole("textbox", { name: "Mật khẩu" }).fill(password); await page.getByRole("button", { name: "Đăng nhập" }).click(); await page.waitForURL("**/dashboard"); }
async function logoutLocal() { await page.evaluate(() => localStorage.clear()); }
async function toggleStaffPermission(expectedAction) { await page.goto(`${base}/farms/demo_green_farm`, { waitUntil: "networkidle" }); const button = page.getByRole("button", { name: new RegExp(`${expectedAction} quyền tưới`) }); await button.waitFor(); await button.click(); await page.getByRole("status").waitFor(); }

try {
  await login("admin@smartagri.local", "Admin123");
  await page.goto(`${base}/irrigation`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Điều khiển tưới", exact: true, level: 1 }).waitFor();
  check("Irrigation summary from API", await page.getByText("Tổng máy bơm", { exact: true }).isVisible());
  check("Cascading irrigation filters", await page.getByLabel("Trang trại tưới").isVisible() && await page.getByLabel("Khu vực tưới").isDisabled());
  check("Seeded pump card", await page.getByText("PUMP_01", { exact: true }).first().isVisible());
  await page.getByRole("button", { name: "Lịch sử lệnh" }).click(); check("Recent command history", await page.getByRole("heading", { name: "Lịch sử lệnh" }).isVisible()); await page.getByRole("button", { name: "Điều khiển thủ công" }).click();
  check("Admin actuator management", await page.getByRole("button", { name: "Thêm máy bơm" }).isVisible() && await page.getByRole("button", { name: "Chỉnh sửa PUMP_01" }).isVisible());
  await page.getByRole("button", { name: "Thêm máy bơm" }).click(); check("Actuator cascading create modal", await page.getByRole("dialog", { name: "Thêm thiết bị chấp hành" }).isVisible()); await page.getByRole("button", { name: "Đóng" }).click();
  const currentControl = page.getByRole("button", { name: /Bật tưới|Tắt tưới/, exact: true }).first(); const currentLabel = await currentControl.textContent(); await currentControl.click(); check("Command confirmation dialog", await page.getByRole("alertdialog").isVisible()); await page.getByRole("alertdialog").getByRole("button", { name: currentLabel?.includes("Bật") ? "Bật tưới" : "Tắt tưới", exact: true }).click(); await page.getByRole("status").waitFor(); check("Manual command succeeds", true);
  const reverseControl = page.getByRole("button", { name: /Bật tưới|Tắt tưới/, exact: true }).first(); const reverseLabel = await reverseControl.textContent(); await reverseControl.click(); await page.getByRole("alertdialog").getByRole("button", { name: reverseLabel?.includes("Bật") ? "Bật tưới" : "Tắt tưới", exact: true }).click(); await page.getByRole("status").waitFor(); check("Pump state can be reversed", true);

  await page.goto(`${base}/devices/demo_device_esp32_a`, { waitUntil: "networkidle" }); await page.getByRole("heading", { name: "Thiết bị chấp hành" }).waitFor(); check("Device detail actuator section", await page.getByText("PUMP_01", { exact: true }).first().isVisible()); await page.getByRole("button", { name: "Chỉnh sửa PUMP_01" }).click(); check("Device actuator edit modal", await page.getByRole("dialog", { name: "Chỉnh sửa actuator" }).isVisible()); await page.getByRole("button", { name: "Đóng" }).click();

  for (const width of [1440, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const route of ["/irrigation", "/devices/demo_device_esp32_a", "/farms/demo_green_farm", "/dashboard"]) {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" }); const size = await page.locator("body").evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })); check(`Responsive ${route} ${width}px`, size.scrollWidth === size.clientWidth, JSON.stringify(size));
    }
  }

  await logoutLocal(); await page.setViewportSize({ width: 1440, height: 900 }); await login("owner@smartagri.local", "Owner123"); await toggleStaffPermission("Thu hồi"); check("Owner revokes STAFF irrigation", true);
  await logoutLocal(); await login("staff@smartagri.local", "Staff123"); await page.goto(`${base}/irrigation`, { waitUntil: "networkidle" }); await page.getByText("PUMP_01", { exact: true }).first().waitFor(); check("STAFF without permission is read-only", await page.getByText(/Chỉ xem · Chưa được cấp quyền/).isVisible() && await page.getByRole("button", { name: "Thêm máy bơm" }).count() === 0);
  await logoutLocal(); await login("owner@smartagri.local", "Owner123"); await toggleStaffPermission("Cấp"); check("Owner grants STAFF irrigation", true);
  await logoutLocal(); await login("staff@smartagri.local", "Staff123"); await page.goto(`${base}/irrigation`, { waitUntil: "networkidle" }); await page.getByText("PUMP_01", { exact: true }).first().waitFor(); check("STAFF with permission can control", await page.getByRole("button", { name: /Bật tưới|Tắt tưới/, exact: true }).count() > 0);
  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" }); await page.getByLabel("Khu vực dashboard").selectOption({ label: "Khu A" }); await page.getByText("Máy bơm tưới Khu A", { exact: true }).waitFor(); check("Dashboard uses real pump data", true); check("Dashboard command is permission-aware", await page.getByRole("button", { name: /Bật|Tắt/, exact: true }).count() > 0);
  const unexpected = errors.filter(error => !error.includes("404") && !error.includes("401")); check("No browser console errors", unexpected.length === 0, unexpected.join(" | "));
  console.table(checks); console.log(`Phase 8 browser tests passed: ${checks.length}/${checks.length}`);
} finally { await browser.close(); }
