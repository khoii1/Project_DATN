import { chromium } from "playwright-core";
const base = "http://127.0.0.1:5173";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const checks = [];
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
}
async function login(email, password) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/dashboard");
}
try {
  await login("admin@smartagri.local", "Admin123");
  await page.goto(`${base}/sensors`, { waitUntil: "networkidle" });
  check(
    "Seeded Sensor list",
    await page.getByText("TEMP_01", { exact: true }).isVisible(),
  );
  check(
    "Latest value and unit",
    await page.getByText(/^-?\d+(?:[.,]\d+)? °C$/).first().isVisible(),
  );
  check(
    "Sensor summary API",
    await page.getByText("Tổng cảm biến", { exact: true }).isVisible(),
  );
  await page.getByRole("button", { name: "Thêm cảm biến" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Trang trại/).selectOption("demo_green_farm");
  await dialog.getByLabel(/Khu vực/).selectOption("demo_zone_a");
  await dialog.getByLabel(/Thiết bị/).selectOption("demo_device_esp32_a");
  await dialog.getByLabel(/Mã cảm biến/).fill("qa_sensor_ui_01");
  await dialog.getByLabel(/Tên cảm biến/).fill("QA Sensor UI");
  await dialog.getByLabel(/Loại/).selectOption("LIGHT");
  await dialog.getByRole("button", { name: "Tạo cảm biến" }).click();
  await page.getByText("Tạo cảm biến thành công", { exact: true }).waitFor();
  await page.getByText("QA_SENSOR_UI_01", { exact: true }).waitFor();
  check("Create Sensor UI", true);
  await page.getByRole("button", { name: "Chỉnh sửa QA_SENSOR_UI_01" }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/Tên cảm biến/)
    .fill("QA Sensor UI đã sửa");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu thay đổi" })
    .click();
  await page
    .getByText("Cập nhật cảm biến thành công", { exact: true })
    .waitFor();
  await page.getByText("QA Sensor UI đã sửa", { exact: true }).waitFor();
  check("Edit Sensor UI", true);
  await page.goto(`${base}/devices/demo_device_esp32_a`, {
    waitUntil: "networkidle",
  });
  check(
    "Device Detail real Sensors",
    (await page.getByText(/Nhiệt độ không khí · TEMP_01/).isVisible()) &&
      (await page.getByText(/^-?\d+(?:[.,]\d+)? °C$/).first().isVisible()),
  );
  await page.goto(`${base}/zones/demo_zone_a`, { waitUntil: "networkidle" });
  check(
    "Zone Detail latest readings",
    (await page
      .getByRole("heading", { name: "Môi trường hiện tại" })
      .isVisible()) &&
      (await page.getByText(/^-?\d+(?:[.,]\d+)? °C$/).first().isVisible()),
  );
  await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
  await page.getByLabel("Trang trại dashboard").selectOption("demo_green_farm");
  await page.getByLabel("Khu vực dashboard").selectOption("demo_zone_a");
  await page.getByText(/^-?\d+(?:[.,]\d+)? °C$/).first().waitFor();
  await page.getByText(/^\d+(?:[.,]\d+)? %$/).first().waitFor();
  check("Dashboard real Sensor readings", true);
  check(
    "Dashboard no realtime claim",
    (await page.getByText(/^Realtime$|^Live$/).count()) === 0,
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${base}/sensors`, { waitUntil: "networkidle" });
  const size = await page
    .locator("body")
    .evaluate((e) => ({
      scrollWidth: e.scrollWidth,
      clientWidth: e.clientWidth,
    }));
  check(
    "Responsive Sensor page",
    size.scrollWidth === size.clientWidth,
    JSON.stringify(size),
  );
  await page.evaluate(() => localStorage.clear());
  await login("staff@smartagri.local", "Staff123");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/sensors`, { waitUntil: "networkidle" });
  check(
    "STAFF sees assigned Sensors",
    await page.getByText("TEMP_01", { exact: true }).isVisible(),
  );
  check(
    "STAFF Sensor UI read-only",
    (await page.getByRole("button", { name: "Thêm cảm biến" }).count()) === 0 &&
      (await page
        .getByRole("button", { name: /Chỉnh sửa TEMP_01/ })
        .count()) === 0,
  );
  const unexpected = errors.filter((e) => !e.includes("404"));
  check(
    "No unexpected console errors",
    unexpected.length === 0,
    unexpected.join(" | "),
  );
  console.table(checks);
  console.log(
    `Phase 5 browser tests passed: ${checks.length}/${checks.length}`,
  );
} finally {
  await browser.close();
}
