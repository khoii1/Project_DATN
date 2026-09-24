import { chromium } from "playwright-core";

const baseUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:5173";
const executablePath = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const checks = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

function check(name, passed, detail = "") {
  checks.push({ name, passed, detail });
  if (!passed) throw new Error(`${name} failed${detail ? `: ${detail}` : ""}`);
}

async function login(email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Mật khẩu" }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { name: "Tổng quan nông nghiệp" }).waitFor();
}

async function logout() {
  await page.getByRole("button", { name: /Quản trị viên|Chủ trang trại|Nhân viên/ }).click();
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
  await page.waitForURL("**/login");
}

await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
check("Protected route redirects anonymous user", page.url().endsWith("/login"));

await page.getByRole("button", { name: "Đăng nhập" }).click();
check("Login validation", (await page.locator("text=/không được để trống/").allTextContents()).length === 2);
await page.getByRole("textbox", { name: "Mật khẩu" }).fill("secret123");
await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
check("Password visibility toggle", await page.getByRole("textbox", { name: "Mật khẩu" }).getAttribute("type") === "text");

await login("admin@smartagri.local", "Admin123");
check("ADMIN login", await page.getByText("Quản trị viên", { exact: true }).count() >= 1);
await page.getByText("API đã kết nối", { exact: true }).waitFor();
check("Frontend health connection", await page.getByText("API đã kết nối", { exact: true }).isVisible());
check("ADMIN sees users navigation", await page.getByRole("link", { name: "Người dùng" }).isVisible());

await page.reload({ waitUntil: "networkidle" });
check("Authentication restores after reload", page.url().endsWith("/dashboard") && await page.getByText("Quản trị viên", { exact: true }).count() >= 1);
await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
check("Authenticated login route redirects", page.url().endsWith("/dashboard"));

await page.goto(`${baseUrl}/users`, { waitUntil: "networkidle" });
check("ADMIN users page loads database", await page.getByText("admin@smartagri.local", { exact: true }).isVisible());
await page.getByRole("button", { name: "Thêm người dùng" }).click();
await page.getByLabel(/Họ và tên/).fill("Người dùng UI QA");
await page.getByLabel(/Email/).fill("phase2.ui@smartagri.local");
await page.getByLabel(/Số điện thoại/).fill("0912345678");
await page.getByLabel(/Mật khẩu/).fill("UiTest123");
await page.getByLabel(/Vai trò/).selectOption("STAFF");
await page.getByRole("button", { name: "Tạo người dùng" }).click();
await page.getByText("Tạo người dùng thành công", { exact: true }).waitFor();
check("Create user UI", await page.getByText("Tạo người dùng thành công", { exact: true }).isVisible());

await page.getByRole("button", { name: "Chỉnh sửa Người dùng UI QA" }).click();
await page.getByLabel(/Họ và tên/).fill("Người dùng UI QA đã sửa");
await page.getByRole("button", { name: "Lưu thay đổi" }).click();
await page.getByText("Cập nhật người dùng thành công", { exact: true }).waitFor();
check("Edit user UI", await page.getByText("Cập nhật người dùng thành công", { exact: true }).isVisible());

await page.getByRole("button", { name: "Ngừng hoạt động Người dùng UI QA đã sửa" }).click();
await page.getByRole("button", { name: "Ngừng hoạt động", exact: true }).click();
await page.getByText("Đã ngừng hoạt động tài khoản", { exact: true }).waitFor();
check("Deactivate user UI", await page.getByText("Đã ngừng hoạt động tài khoản", { exact: true }).isVisible());
await page.getByRole("button", { name: "Kích hoạt Người dùng UI QA đã sửa" }).click();
await page.getByRole("button", { name: "Kích hoạt", exact: true }).click();
await page.getByText("Đã kích hoạt tài khoản", { exact: true }).waitFor();
check("Reactivate user UI", await page.getByText("Đã kích hoạt tài khoản", { exact: true }).isVisible());

for (const width of [1440, 1024, 768, 375]) {
  await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  const dimensions = await page.locator("body").evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
  check(`Responsive ${width}px`, dimensions.scrollWidth === dimensions.clientWidth, JSON.stringify(dimensions));
}

await page.setViewportSize({ width: 375, height: 812 });
await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Mở menu" }).click();
await page.waitForTimeout(350);
check("Mobile drawer opens", (await page.locator("aside").boundingBox())?.x === 0);
await page.getByRole("link", { name: "Trang trại" }).click();
await page.waitForTimeout(350);
check("Mobile drawer closes after navigation", ((await page.locator("aside").boundingBox())?.x ?? 0) < 0);

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
const widthBefore = (await page.locator("aside").boundingBox())?.width;
await page.getByRole("button", { name: "Thu gọn menu" }).click();
await page.waitForTimeout(350);
const widthAfter = (await page.locator("aside").boundingBox())?.width;
check("Desktop sidebar collapse", widthBefore === 268 && widthAfter === 80, `${widthBefore} -> ${widthAfter}`);

await logout();
await login("owner@smartagri.local", "Owner123");
check("FARM_OWNER role UI", await page.getByText("Chủ trang trại", { exact: true }).count() >= 1);
check("FARM_OWNER users menu hidden", await page.getByRole("link", { name: "Người dùng" }).count() === 0);
await page.goto(`${baseUrl}/users`, { waitUntil: "networkidle" });
check("FARM_OWNER direct users URL forbidden", page.url().endsWith("/forbidden") && await page.getByText("Bạn không có quyền truy cập").isVisible());
await logout();

await login("staff@smartagri.local", "Staff123");
check("STAFF role UI", await page.getByText("Nhân viên", { exact: true }).count() >= 1);
const staffMenuCounts = { users: await page.getByRole("link", { name: "Người dùng" }).count(), reports: await page.getByRole("link", { name: "Báo cáo" }).count(), activity: await page.getByRole("link", { name: "Nhật ký hoạt động" }).count() };
check("STAFF menu policy", staffMenuCounts.users === 0 && staffMenuCounts.reports >= 1 && staffMenuCounts.activity >= 1, JSON.stringify(staffMenuCounts));
await page.goto(`${baseUrl}/users`, { waitUntil: "networkidle" });
check("STAFF direct users URL forbidden", page.url().endsWith("/forbidden"));
await logout();

await page.evaluate(() => localStorage.setItem("smart_agriculture_access_token", "invalid.token.value"));
await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
check("Invalid token clears session", page.url().endsWith("/login") && await page.evaluate(() => !localStorage.getItem("smart_agriculture_access_token")));
const expectedNetworkErrors = consoleErrors.filter((message) => message.includes("401"));
const unexpectedConsoleErrors = consoleErrors.filter((message) => !message.includes("401"));
check("No unexpected console errors", unexpectedConsoleErrors.length === 0, unexpectedConsoleErrors.join(" | "));

console.table(checks);
console.log(`Browser authentication tests passed: ${checks.length}/${checks.length}; expected 401 network events: ${expectedNetworkErrors.length}`);
await browser.close();
