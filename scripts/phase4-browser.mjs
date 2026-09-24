import { chromium } from "playwright-core";
const baseUrl = "http://127.0.0.1:5173";
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
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/dashboard");
}
try {
  await login("admin@smartagri.local", "Admin123");
  await page.goto(`${baseUrl}/devices`, { waitUntil: "networkidle" });
  check(
    "Seeded Device list",
    await page.getByText("ESP32-GF-A-01", { exact: true }).isVisible(),
  );
  check(
    "Summary from API",
    await page.getByText("Tổng thiết bị", { exact: true }).isVisible(),
  );
  await page.getByRole("button", { name: "Thêm thiết bị" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Trang trại/).selectOption("demo_green_farm");
  await dialog.getByLabel(/Khu vực/).selectOption("demo_zone_a");
  await dialog.getByLabel(/Mã thiết bị/).fill("qa_device_ui_01");
  await dialog.getByLabel(/Tên thiết bị/).fill("QA UI ESP32");
  await dialog.getByLabel(/Model phần cứng/).fill("ESP32-S3");
  await dialog.getByRole("button", { name: "Đăng ký thiết bị" }).click();
  await page
    .getByText("Đăng ký thiết bị thành công", { exact: true })
    .waitFor();
  await page.getByText("QA_DEVICE_UI_01", { exact: true }).waitFor();
  check(
    "Create Device UI",
    await page.getByText("QA_DEVICE_UI_01", { exact: true }).isVisible(),
  );
  await page.getByRole("button", { name: "Chỉnh sửa QA_DEVICE_UI_01" }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/Phiên bản firmware/)
    .fill("2.0.0");
  await page
    .getByRole("dialog")
    .getByLabel(/Trạng thái/)
    .selectOption("MAINTENANCE");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lưu thay đổi" })
    .click();
  await page
    .getByText("Cập nhật thiết bị thành công", { exact: true })
    .waitFor();
  check("Edit Device UI", true);
  await page.getByRole("link", { name: "Xem QA_DEVICE_UI_01" }).click();
  await page.waitForURL("**/devices/*");
  await page.getByRole("heading", { name: "QA UI ESP32" }).waitFor();
  check(
    "Device detail",
    await page.getByText("Chưa kết nối MQTT", { exact: false }).isVisible(),
  );
  check(
    "Device sensor integration",
    (await page
      .getByRole("heading", { name: "Cảm biến & kênh dữ liệu" })
      .isVisible()) &&
      (await page.getByText("Chưa cấu hình cảm biến.", { exact: true }).isVisible()),
  );
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  check(
    "Dashboard Device summary",
    await page.getByText(/online · .*offline/).isVisible(),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseUrl}/devices`, { waitUntil: "networkidle" });
  const size = await page
    .locator("body")
    .evaluate((e) => ({
      scrollWidth: e.scrollWidth,
      clientWidth: e.clientWidth,
    }));
  check(
    "Responsive Device page",
    size.scrollWidth === size.clientWidth,
    JSON.stringify(size),
  );
  await page.evaluate(() => localStorage.clear());
  await login("staff@smartagri.local", "Staff123");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/devices`, { waitUntil: "networkidle" });
  check(
    "STAFF sees assigned Devices",
    await page.getByText("ESP32-GF-A-01", { exact: true }).isVisible(),
  );
  check(
    "STAFF UI read-only",
    (await page.getByRole("button", { name: "Thêm thiết bị" }).count()) === 0 &&
      (await page.getByRole("button", { name: /Chỉnh sửa ESP32/ }).count()) ===
        0,
  );
  const unexpected = errors.filter((e) => !e.includes("404"));
  check(
    "No unexpected console errors",
    unexpected.length === 0,
    unexpected.join(" | "),
  );
  console.table(checks);
  console.log(
    `Phase 4 browser tests passed: ${checks.length}/${checks.length}`,
  );
} finally {
  await browser.close();
}
