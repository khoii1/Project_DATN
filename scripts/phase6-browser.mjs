import { chromium } from "playwright-core";
const base = "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: "Asia/Bangkok" });
const checks = []; const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
function check(name, pass, detail = "") { checks.push({ name, pass, detail }); if (!pass) throw new Error(`${name}: ${detail}`); }
async function login(email, password) { await page.goto(`${base}/login`, { waitUntil: "networkidle" }); await page.getByLabel("Email").fill(email); await page.getByRole("textbox", { name: "Mật khẩu" }).fill(password); await page.getByRole("button", { name: "Đăng nhập" }).click(); await page.waitForURL("**/dashboard"); }

try {
  await login("admin@smartagri.local", "Admin123");
  await page.goto(`${base}/sensors/history?sensorId=demo_sensor_temp&range=7d`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Lịch sử dữ liệu cảm biến" }).waitFor();
  await page.getByLabel("Cảm biến lịch sử", { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('select[aria-label="Cảm biến lịch sử"]')?.value === "demo_sensor_temp");
  check("Direct history link selects Sensor", await page.getByLabel("Cảm biến lịch sử", { exact: true }).inputValue() === "demo_sensor_temp");
  await page.locator(".recharts-wrapper").waitFor();
  check("Recharts renders API data", await page.locator(".recharts-line-curve").count() > 0);
  check("Statistics cards", await page.getByText("Trung bình", { exact: true }).isVisible() && await page.getByText("Số phép đo", { exact: true }).isVisible());
  check("7-day auto resolution", await page.getByText(/Resolution: 30m/).isVisible());
  check("Historical raw table", await page.getByRole("heading", { name: "Dữ liệu chi tiết" }).isVisible() && await page.getByText("Mô phỏng", { exact: true }).first().isVisible());

  await page.getByRole("button", { name: "Hôm nay" }).click(); await page.getByText(/Resolution: 5m/).waitFor(); check("Today preset", true);
  await page.getByRole("button", { name: "30 ngày" }).click(); await page.getByText(/Resolution: 2h/).waitFor(); check("30-day preset/downsampling", true);
  await page.getByRole("button", { name: "Tùy chỉnh" }).click();
  await page.getByLabel("Từ ngày giờ").fill("2026-08-26T12:00"); await page.getByLabel("Đến ngày giờ").fill("2026-08-25T12:00"); await page.getByRole("button", { name: "Áp dụng" }).click(); check("Custom frontend validation", await page.getByRole("alert").getByText(/bắt đầu phải trước/).isVisible());
  const now = new Date(); const before = new Date(now.getTime() - 86_400_000); const local = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await page.getByLabel("Từ ngày giờ").fill(local(before)); await page.getByLabel("Đến ngày giờ").fill(local(now)); await page.getByRole("button", { name: "Áp dụng" }).click(); await page.getByText(/Resolution: 5m/).waitFor(); check("Custom range applies", true);
  await page.getByRole("button", { name: "30 ngày" }).click(); await page.getByText(/Resolution: 2h/).waitFor();
  const next = page.getByRole("button", { name: "Trang sau" }); check("Table pagination available", await next.isEnabled()); await next.click(); await page.getByText(/Trang 2/).waitFor();
  await page.getByRole("button", { name: "Làm mới dữ liệu" }).click(); await page.getByText(/Cập nhật lần cuối/).waitFor(); check("Manual refresh", true);

  await page.goto(`${base}/sensors`, { waitUntil: "networkidle" }); await page.getByLabel("Xem lịch sử TEMP_01").click(); await page.waitForURL("**/sensors/history?sensorId=demo_sensor_temp**"); check("Sensor Page navigation", true);
  await page.goto(`${base}/devices/demo_device_esp32_a`, { waitUntil: "networkidle" }); await page.getByLabel("Xem lịch sử TEMP_01").click(); await page.waitForURL("**/sensors/history?sensorId=demo_sensor_temp**"); check("Device Detail navigation", true);
  await page.goto(`${base}/zones/demo_zone_a`, { waitUntil: "networkidle" }); await page.getByRole("link", { name: "Xem lịch sử" }).first().click(); await page.waitForURL("**/sensors/history?sensorId=**"); check("Zone Detail navigation", true);

  for (const width of [1440, 1024, 768, 375]) { await page.setViewportSize({ width, height: width === 375 ? 812 : 900 }); await page.goto(`${base}/sensors/history?sensorId=demo_sensor_temp&range=7d`, { waitUntil: "networkidle" }); await page.locator(".recharts-wrapper").waitFor(); const size = await page.locator("body").evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })); check(`Responsive ${width}px`, size.scrollWidth === size.clientWidth, JSON.stringify(size)); }

  await page.evaluate(() => localStorage.clear()); await page.setViewportSize({ width: 1440, height: 900 }); await login("staff@smartagri.local", "Staff123"); await page.goto(`${base}/sensors/history?sensorId=demo_sensor_temp&range=7d`, { waitUntil: "networkidle" }); await page.locator(".recharts-wrapper").waitFor(); check("STAFF assigned history", await page.getByText(/Resolution: 30m/).isVisible()); check("History has no write action", await page.getByRole("button", { name: /Thêm|Chỉnh sửa|Xóa/ }).count() === 0);
  const unexpected = errors.filter((error) => !error.includes("404") && !error.includes("401")); check("No browser console errors", unexpected.length === 0, unexpected.join(" | "));
  console.table(checks); console.log(`Phase 6 browser tests passed: ${checks.length}/${checks.length}`);
} finally { await browser.close(); }
