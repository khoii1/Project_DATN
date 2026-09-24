# Build và kiểm thử

## Kiểm tra tĩnh

Từ root:

```powershell
npm run build
npm run lint
```

`build` chạy backend TypeScript build rồi frontend Vite build. Root `lint` hiện chỉ gọi ESLint frontend; backend được typecheck bởi `npm --prefix backend run build`. Prisma Client có thể tạo riêng:

```powershell
npm --prefix backend run prisma:generate
```

Repository không có script `npm test` tổng hợp.

## Backend API/regression suites

Các script có thật trong `backend/package.json`:

```powershell
npm --prefix backend run test:auth
npm --prefix backend run test:phase3
npm --prefix backend run test:phase4
npm --prefix backend run test:phase5
npm --prefix backend run test:phase6
npm --prefix backend run test:phase7
npm --prefix backend run test:phase8
npm --prefix backend run test:phase9
npm --prefix backend run test:phase10
npm --prefix backend run test:phase11
```

Các suite cần PostgreSQL đã migrate/seed và backend/API theo điều kiện trong script. Phase 11 còn cần Mosquitto thật, backend bật MQTT và credential test. Nó kiểm tra telemetry fresh/stale/duplicate/invalid/oversize, retained status/LWT, Alert, Automation mock, reports/CSV và health.

## Browser QA

Root scripts:

```powershell
npm run qa:browser
npm run qa:phase3
npm run qa:phase4
npm run qa:phase5
npm run qa:phase6
npm run qa:phase7
npm run qa:phase8
npm run qa:phase9
npm run qa:phase10
```

Browser QA yêu cầu frontend/backend đang chạy, database demo phù hợp và browser runtime của Playwright. Đây là script QA, không phải unit-test framework độc lập.

## Simulators

```powershell
npm --prefix backend run simulate:device
npm --prefix backend run simulate:sensors
npm --prefix backend run simulate:sensor-history
npm --prefix backend run simulate:alerts
npm --prefix backend run simulate:irrigation
npm --prefix backend run simulate:automation
npm --prefix backend run simulate:mqtt-device -- --device-code ESP32-GF-A-01
```

Simulator HTTP cần backend/database và dữ liệu seed. MQTT simulator cần broker + device credential từ environment. Không truyền secret trên command line nếu shell history có thể lưu.

## Cleanup

Backend có các script cleanup `cleanup:phase2-ui` và `cleanup:phase3` đến `cleanup:phase10`. Chúng thay đổi dữ liệu test; chỉ chạy trên database local/QA đã xác nhận, không chạy trên dữ liệu cần giữ.

## Checklist trước khi bàn giao

1. `prisma:generate`, backend build, frontend build và frontend lint thành công.
2. Chạy suite gần nhất với phần vừa thay đổi; với thay đổi cross-cutting, chạy regression Phase 10 và Phase 11 khi broker sẵn sàng.
3. Kiểm tra farm scope bằng ADMIN/OWNER/STAFF, gồm ID ngoài scope.
4. Kiểm tra duplicate/out-of-order telemetry không lặp side effect.
5. Kiểm tra Markdown links, env names và command khớp package scripts.
6. Không ghi credential thật vào output, fixture, screenshot hoặc tài liệu.
