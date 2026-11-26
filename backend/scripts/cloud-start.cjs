"use strict";

const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

async function bootstrapAndStart() {
  console.log("[Cloud Boot] Đang đồng bộ cấu trúc bảng dữ liệu lên PostgreSQL (Supabase)...");
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
    });
  } catch (err) {
    console.error("[Cloud Boot] Cảnh báo khi chạy prisma db push:", err?.message || err);
  }

  const prisma = new PrismaClient();
  try {
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@smartagri.local" },
    });
    if (!adminUser) {
      console.log("[Cloud Boot] Cơ sở dữ liệu mới — đang khởi tạo dữ liệu mẫu ban đầu (seed)...");
      await prisma.$disconnect();
      execSync("npm run prisma:seed", { stdio: "inherit" });
    } else {
      console.log("[Cloud Boot] Đã có dữ liệu tài khoản trên Supabase, bỏ qua bước seed.");
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error("[Cloud Boot] Không thể kiểm tra/seed dữ liệu:", err?.message || err);
    try {
      await prisma.$disconnect();
    } catch {}
  }

  console.log("[Cloud Boot] Khởi động Smart Agriculture API Server...");
  require("../dist/server.js");
}

bootstrapAndStart();
