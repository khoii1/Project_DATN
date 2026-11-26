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
    const syncedCount = await prisma.user.count({
      where: {
        email: { in: ["admin@gmail.com", "owner@gmail.com", "staff@gmail.com"] },
      },
    });
    if (syncedCount < 3) {
      console.log("[Cloud Boot] Đang đồng bộ 3 tài khoản mặc định (@gmail.com / Admin123) và dữ liệu mẫu...");
      await prisma.$disconnect();
      execSync("npm run prisma:seed", { stdio: "inherit" });
    } else {
      console.log("[Cloud Boot] Đã có đủ 3 tài khoản mặc định (@gmail.com) trên Supabase.");
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
