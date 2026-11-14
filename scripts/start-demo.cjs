"use strict";

const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");

const C = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

function checkPortListening(port, host = "127.0.0.1", timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function waitForPort(port, timeoutSeconds = 25) {
  for (let i = 0; i < timeoutSeconds * 2; i++) {
    if (await checkPortListening(port)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal && !iface.address.startsWith("169.254.")) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

function readEsp32Config() {
  const configPath = path.join(PROJECT_ROOT, "firmware", "SmartAgricultureESP32", "config.local.h");
  let expectedIp = "172.20.10.2";
  let expectedSsid = "KN";
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf8");
    const ipMatch = raw.match(/MQTT_HOST\[\]\s*=\s*"([^"]+)"/);
    if (ipMatch) expectedIp = ipMatch[1];
    const ssidMatch = raw.match(/WIFI_SSID\[\]\s*=\s*"([^"]+)"/);
    if (ssidMatch) expectedSsid = ssidMatch[1];
  }
  return { expectedIp, expectedSsid };
}

function spawnDetached(filePath, argString) {
  const psCommand = `Start-Process -FilePath '${filePath.replace(/'/g, "''")}' -ArgumentList '${argString.replace(/'/g, "''")}' -WorkingDirectory '${PROJECT_ROOT.replace(/'/g, "''")}' -WindowStyle Minimized`;
  const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psCommand], {
    cwd: PROJECT_ROOT,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

async function main() {
  console.log(`${C.cyan}==========================================================${C.reset}`);
  console.log(`${C.cyan}${C.bold}   HỆ THỐNG NÔNG NGHIỆP THÔNG MINH - KHỞI ĐỘNG NHANH     ${C.reset}`);
  console.log(`${C.cyan}==========================================================${C.reset}\n`);

  // 1. Kiểm tra địa chỉ IPv4
  const { expectedIp, expectedSsid } = readEsp32Config();
  const currentIps = getLocalIPv4Addresses();
  console.log(`${C.yellow}[1/4] Kiểm tra kết nối mạng cho mạch ESP32:${C.reset}`);
  console.log(`      - IP hiện tại của máy tính : ${currentIps.length > 0 ? currentIps.join(", ") : "Chưa kết nối mạng"}`);
  console.log(`      - Cấu hình trong ESP32     : Wi-Fi '${expectedSsid}' | MQTT Broker IP '${expectedIp}'`);
  if (currentIps.includes(expectedIp)) {
    console.log(`${C.green}      -> OK: Máy tính đang khớp IP '${expectedIp}' với mạch ESP32!${C.reset}\n`);
  } else {
    console.log(`${C.yellow}      -> LƯU Ý: Máy tính đang có IP (${currentIps.join(", ") || "không có"}), khác với '${expectedIp}'.${C.reset}`);
    console.log(`${C.yellow}         Khi thử với mạch ESP32 thật, hãy kết nối Wi-Fi '${expectedSsid}' (${expectedIp}).${C.reset}\n`);
  }

  // 2. Khởi động Mosquitto MQTT Broker (Port 1883)
  console.log(`${C.yellow}[2/4] Kiểm tra Mosquitto MQTT Broker (cổng 1883)...${C.reset}`);
  if (await checkPortListening(1883)) {
    console.log(`${C.green}      -> OK: Mosquitto MQTT Broker đang hoạt động trên cổng 1883.${C.reset}\n`);
  } else {
    const mosquittoExe = "C:\\Program Files\\mosquitto\\mosquitto.exe";
    const mosquittoConf = "C:\\mosquitto\\config\\mosquitto.conf";
    if (fs.existsSync(mosquittoExe)) {
      console.log(`${C.cyan}      -> Đang bật Mosquitto MQTT Broker...${C.reset}`);
      spawnDetached(mosquittoExe, `-c "${mosquittoConf}" -v`);
      if (await waitForPort(1883, 10)) {
        console.log(`${C.green}      -> OK: Đã khởi động Mosquitto MQTT Broker (cổng 1883)!${C.reset}\n`);
      } else {
        console.log(`${C.red}      -> CẢNH BÁO: Chưa thấy cổng 1883 phản hồi, vui lòng kiểm tra Mosquitto.${C.reset}\n`);
      }
    } else {
      console.log(`${C.red}      -> KHÔNG TÌM THẤY: ${mosquittoExe}${C.reset}\n`);
    }
  }

  // 3. Khởi động Backend Server (Port 5000)
  console.log(`${C.yellow}[3/4] Kiểm tra Backend Server (cổng 5000)...${C.reset}`);
  if (await checkPortListening(5000)) {
    console.log(`${C.green}      -> OK: Backend Server đang hoạt động trên cổng 5000.${C.reset}\n`);
  } else {
    console.log(`${C.cyan}      -> Đang khởi động Backend API (cổng 5000)...${C.reset}`);
    spawnDetached("cmd.exe", "/c title SmartAgri - Backend API (Port 5000) && npm --prefix backend run start");
    if (await waitForPort(5000, 25)) {
      console.log(`${C.green}      -> OK: Đã khởi động Backend Server (http://localhost:5000)!${C.reset}\n`);
    } else {
      console.log(`${C.red}      -> CẢNH BÁO: Backend khởi động quá thời gian chờ trên cổng 5000.${C.reset}\n`);
    }
  }

  // 4. Khởi động Frontend Web (Port 5173)
  console.log(`${C.yellow}[4/4] Kiểm tra Giao diện Website (cổng 5173)...${C.reset}`);
  if (await checkPortListening(5173)) {
    console.log(`${C.green}      -> OK: Giao diện Website đang hoạt động trên cổng 5173.${C.reset}\n`);
  } else {
    console.log(`${C.cyan}      -> Đang khởi động Giao diện Website (cổng 5173)...${C.reset}`);
    spawnDetached("cmd.exe", "/c title SmartAgri - Frontend Web (Port 5173) && npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173");
    if (await waitForPort(5173, 25)) {
      console.log(`${C.green}      -> OK: Đã khởi động Website (http://localhost:5173)!${C.reset}\n`);
    } else {
      console.log(`${C.red}      -> CẢNH BÁO: Frontend khởi động quá thời gian chờ trên cổng 5173.${C.reset}\n`);
    }
  }

  console.log(`${C.green}==========================================================${C.reset}`);
  console.log(`${C.green}${C.bold}   HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG!                       ${C.reset}`);
  console.log(`${C.green}==========================================================${C.reset}`);
  console.log(` - Địa chỉ Website : http://localhost:5173/irrigation`);
  console.log(` - Tài khoản Admin : admin@smartagri.local`);
  console.log(` - Mật khẩu        : Admin@123`);
  console.log(`${C.gray} - Để tắt toàn bộ  : Chạy lệnh 'npm run demo:stop' hoặc file stop-demo.bat${C.reset}`);
  console.log(`${C.green}==========================================================${C.reset}\n`);

  if (!process.env.NO_BROWSER_OPEN) {
    console.log(`${C.cyan}Đang mở trình duyệt tới http://localhost:5173/irrigation ...${C.reset}`);
    spawnDetached("cmd.exe", "/c start \"\" http://localhost:5173/irrigation");
  }
}

main().catch((err) => {
  console.error("Lỗi khi khởi động hệ thống:", err);
  process.exit(1);
});
