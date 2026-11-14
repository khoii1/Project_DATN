"use strict";

const { execSync } = require("child_process");

const C = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

function getPidsListeningOnPort(port) {
  try {
    const out = execSync("netstat -ano", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const localAddress = parts[1] || "";
      if (localAddress.endsWith(`:${port}`)) {
        const pid = Number.parseInt(parts[parts.length - 1], 10);
        if (Number.isInteger(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

function stopServiceOnPort(port, serviceName) {
  const pids = getPidsListeningOnPort(port);
  if (pids.length === 0) {
    console.log(`${C.gray} -> ${serviceName} (Port ${port}) hiện không chạy.${C.reset}`);
    return;
  }
  for (const pid of pids) {
    console.log(`${C.cyan} -> Đang dừng ${serviceName} (Port ${port}, PID ${pid})...${C.reset}`);
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } catch {
      // Ignore if process already exited
    }
  }
  console.log(`${C.green} -> Đã dừng ${serviceName}.${C.reset}`);
}

console.log(`${C.yellow}==========================================================${C.reset}`);
console.log(`${C.yellow}${C.bold}   ĐANG DỪNG CÁC DỊCH VỤ HỆ THỐNG NÔNG NGHIỆP THÔNG MINH  ${C.reset}`);
console.log(`${C.yellow}==========================================================${C.reset}`);

stopServiceOnPort(5173, "Frontend Web");
stopServiceOnPort(5000, "Backend API");
stopServiceOnPort(1883, "Mosquitto MQTT Broker");

console.log(`\n${C.green}Hoàn tất! Toàn bộ dịch vụ Demo đã được đóng.${C.reset}`);
