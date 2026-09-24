import { chromium } from "playwright-core";
const base = "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: "Asia/Bangkok" });
const checks = []; const errors = [];
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
function check(name, pass, detail = "") { checks.push({ name, pass, detail }); if (!pass) throw new Error(`${name}: ${detail}`); }
async function login(email, password) { await page.goto(`${base}/login`, { waitUntil: "networkidle" }); await page.getByLabel("Email").fill(email); await page.getByRole("textbox", { name: "Mật khẩu" }).fill(password); await page.getByRole("button", { name: "Đăng nhập" }).click(); await page.waitForURL("**/dashboard"); }

try {
  await login("admin@smartagri.local", "Admin123");
  await page.goto(`${base}/alerts`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Cảnh báo", exact: true, level: 1 }).waitFor();
  check("Alert summary from API", await page.getByText("Đang hoạt động", { exact: true }).first().isVisible());
  check("Active incidents table", await page.getByRole("button", { name: "Xem chi tiết cảnh báo" }).count() > 0);
  await page.getByRole("button", { name: "Xem chi tiết cảnh báo" }).first().click();
  check("Alert detail snapshot", await page.getByText(/Snapshot:/).isVisible());
  await page.getByRole("button", { name: "Đóng chi tiết" }).click();
  await page.getByRole("button", { name: "Lịch sử" }).click();
  await page.getByText(/bản ghi/).waitFor(); check("History tab", true);
  await page.getByRole("button", { name: "Quy tắc" }).click();
  await page.getByRole("button", { name: "Tạo quy tắc" }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('button[aria-label="Chỉnh sửa quy tắc"]').length >= 3);
  check("Admin rule management", await page.getByRole("button", { name: "Chỉnh sửa quy tắc" }).count() >= 3);
  await page.getByRole("button", { name: "Tạo quy tắc" }).click();
  check("Cascading rule form", await page.getByRole("dialog", { name: "Tạo quy tắc" }).isVisible() && await page.getByText(/hysteresis/).isVisible());
  await page.getByRole("button", { name: "Đóng" }).click();
  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
  check("Dashboard real alert link", await page.getByRole("link", { name: "Xem tất cả cảnh báo" }).isVisible());
  check("Dashboard sensor alert state", await page.getByText(/Nghiêm trọng|Cảnh báo/, { exact: true }).count() > 0);
  for (const width of [1440, 1024, 768, 375]) { await page.setViewportSize({ width, height: width === 375 ? 812 : 900 }); await page.goto(`${base}/alerts`, { waitUntil: "networkidle" }); const size = await page.locator("body").evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })); check(`Responsive ${width}px`, size.scrollWidth === size.clientWidth, JSON.stringify(size)); }
  await page.evaluate(() => localStorage.clear()); await page.setViewportSize({ width: 1440, height: 900 }); await login("staff@smartagri.local", "Staff123"); await page.goto(`${base}/alerts`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Quy tắc" }).click(); await page.getByText("3 bản ghi", { exact: true }).waitFor();
  check("STAFF rules read-only", await page.getByRole("button", { name: "Tạo quy tắc" }).count() === 0 && await page.getByRole("button", { name: "Chỉnh sửa quy tắc" }).count() === 0);
  await page.getByRole("button", { name: "Đang hoạt động" }).click();
  await page.waitForFunction(() => document.querySelectorAll('button[aria-label="Xác nhận cảnh báo"]').length > 0);
  check("STAFF can acknowledge", await page.getByRole("button", { name: "Xác nhận cảnh báo" }).count() > 0);
  check("STAFF cannot resolve", await page.getByRole("button", { name: "Đóng cảnh báo" }).count() === 0);
  const unexpected = errors.filter(error => !error.includes("404") && !error.includes("401")); check("No browser console errors", unexpected.length === 0, unexpected.join(" | "));
  console.table(checks); console.log(`Phase 7 browser tests passed: ${checks.length}/${checks.length}`);
} finally { await browser.close(); }
