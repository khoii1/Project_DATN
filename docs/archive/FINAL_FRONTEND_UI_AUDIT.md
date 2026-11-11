# FINAL FRONTEND UI AUDIT — Smart Agriculture

Ngày báo cáo: 05/11/2026 (UTC+7). Phạm vi: source frontend, kiểm thử offline và dedicated historical presentation transform. Không mở website/browser, PostgreSQL hoặc MQTT.

## 1. Kết quả và phạm vi thực tế

- 96 file trong `frontend/src` được đọc/kiểm kê bằng AST, đối chiếu routing, imports, service calls, forms và controls; CSS được kiểm tra riêng. Inventory: `../build/frontend-ui-audit-1793886482110/source-audit-final.json`.
- **20 khai báo path**, gồm `/` redirect và `*` fallback; thêm một route layout không có path. **19 page components được route tới**, **20 page files** trên đĩa.
- `SensorDataPage.tsx` là placeholder cũ **không được import vào routing**; chức năng hiện tại do `SensorsPage` và `SensorHistoryPage` đảm nhiệm. Không tính placeholder này là màn hình đang hoạt động.
- Charts nằm trong `/sensors/history`, hỗ trợ TEMP, AIR_HUMIDITY, LIGHT, SOIL_MOISTURE; không có route `/charts` hoặc `/sensors/:id`.
- Kết luận code giới hạn trong chức năng/frontend API hiện có: **FRONTEND_CODE_COMPLETE — BROWSER_ACCEPTANCE_PENDING**. Không đồng nghĩa đã nghiệm thu toàn bộ ứng dụng hoặc phần cứng.

## 2. Ma trận từng màn hình

“Có” là đã lập trình/được build, không phải PASS trình duyệt của source mới. Browser cho toàn bộ bảng: **NOT_EXECUTED trong phiên này**.

| Path / màn hình | Đã lập trình | Thiếu chức năng / giới hạn | Lỗi phát hiện và xử lý | Cần kiểm tra tiếp |
|---|---|---|---|---|
| `/` | Có, redirect Dashboard | Không có page riêng | Không đổi | Redirect sau đăng nhập |
| `/login` | Có, validation, pending, lỗi API, remember | Cần tài khoản/backend hợp lệ | BUG: email có khoảng trắng; UX: thông tin demo cố định. Đã sửa | Login, sai mật khẩu, restore/logout/401 |
| `/dashboard` | Có, summary, sensor cards, polling, pump policy | Dữ liệu phụ thuộc API và provenance | BUG: card không dữ liệu vẫn “Bình thường”. Đã sửa ở shared card; nhãn historical giữ qua DEV plugin | Polling/error/empty, 4 cards, controls disabled |
| `/farms` | Có, danh sách/form/trạng thái/phân trang | CRUD thật chưa chạy trong phiên này | RESPONSIVE/UX: filter cột cố định, thiếu tên truy cập. Đã sửa | CRUD theo quyền và viewport |
| `/farms/:farmId` | Có, chi tiết và phân công nhân sự | Cần quyền và dữ liệu hợp lệ | Không phát hiện blocker mới qua source | Chi tiết, phân công, lỗi 403/404 |
| `/zones` | Có, filter/form/trạng thái/phân trang | CRUD thật chưa kiểm tra | RESPONSIVE/UX: filter và tên controls. Đã sửa | Bộ lọc, validation, phân trang |
| `/zones/:zoneId` | Có, chi tiết/cây trồng/cảm biến | Phụ thuộc API | Sensor card dùng bản sửa chung | Empty/error, liên kết History |
| `/crops` | Có, filter/form/trạng thái | Phụ thuộc API và validation server | RESPONSIVE/UX: filter quá rộng, controls thiếu tên. Đã sửa | Form và phản hồi lỗi server |
| `/devices` | Có, summary/filter/form/phân trang | Presence thật không nghiệm thu offline | RESPONSIVE/UX: 7 cột filter cố định, tên controls. Đã sửa | ONLINE/OFFLINE/UNKNOWN và stale data |
| `/devices/:deviceId` | Có, metadata/sensors/actuators | GPIO không phải feedback motor/nước | Historical labels vẫn được DEV plugin áp dụng; sensor card sửa chung | Nhãn lịch sử, timestamp, linked sensors |
| `/sensors` | Có, danh sách/form/filter/history links | Hiệu chuẩn SOIL không được xác minh | RESPONSIVE/UX: filter quá rộng, tên controls. Đã sửa | Bốn loại, zero/missing, đơn vị |
| `/sensors/history` (gồm Charts) | Có, filter/range/stats/buckets/raw table/pagination | Giá trị stats/aggregation do API cung cấp | BUG/UX: lookup lỗi bị nuốt. Đã sửa; UTC+7 và giải thích bucket; query/hash giữ qua login | 3 readings × 4 sensors, chart/tooltip/pagination |
| `/alerts` | Có, rules/filter/ack/resolve | Cảnh báo thật phụ thuộc backend | UX: tên truy cập filter. Đã sửa | Empty/error, rule validation/role |
| `/irrigation` | Có, manual/history/automation/shadow tabs | Hardware/ACTIVE/VERIFIED_LIVE không nghiệm thu | Không đổi command policy; regressions UNKNOWN/OFFLINE/ACK giữ nguyên | Chỉ kiểm tra controls disabled ở phiên được duyệt sau |
| `/reports` | Có, 4 tabs/charts/filter/CSV | Export và số liệu thật cần API | BUG: ngày rỗng gây Invalid Date, zone lookup unhandled, response cũ ghi đè. Đã sửa | Dates, stale request, reports/CSV |
| `/activity-logs` | Có, filter/list/pagination/CSV | Historical DEV login audit chỉ memory-only | BUG: ngày rỗng gây exception, response hủy vẫn commit. Đã sửa | Dates, trang dữ liệu, export/role |
| `/users` | Có, ADMIN guard/form/trạng thái | API thực chưa chạy | RESPONSIVE/UX: filter và accessible names. Đã sửa | ADMIN và STAFF/owner bị chặn |
| `/settings` | Có, hồ sơ và thông tin quyền chỉ đọc | Không có API self-service đổi hồ sơ/mật khẩu trong client hiện tại; không dựng Save giả | INCOMPLETE: placeholder đã thay bằng dữ liệu AuthContext, link `/users` chỉ ADMIN | Profile/settings menu và dữ liệu tài khoản |
| `/forbidden` | Có, 403/link Dashboard | Không | Không đổi | Điều hướng khi thiếu quyền |
| `*` | Có, 404/link Dashboard | Không | Không đổi | URL không tồn tại |

## 3. Các lỗi đã sửa

1. **BUG/UX — Auth/navigation:** giữ pathname + search + hash khi chuyển login; email validation dùng cùng giá trị trim như request, password giữ nguyên; bỏ credential demo và các con số trang trại/thiết bị không lấy từ dữ liệu thật. Bell dẫn tới Alerts; Profile/Settings hoạt động; tiêu đề nested route rõ hơn, Escape đóng account menu.
2. **INCOMPLETE — Settings:** hồ sơ read-only từ tài khoản đang đăng nhập, không thêm API/mutation hay cấu hình giả.
3. **BUG — Sensor cards:** null/NaN/Infinity không còn thành “Bình thường”; zero vẫn hiện đúng đơn vị; timestamp lỗi có fallback; đo lúc UTC+7; SOIL giữ cảnh báo chất lượng/hiệu chuẩn chưa được xác minh.
4. **BUG/UX — Reports/Activity:** chặn ngày trống/không hợp lệ trước serialize; giữ query đã áp dụng; bỏ commit khi request bị abort; zone lookup có catch, cancellation và phản hồi lỗi; không fetch lại zone chỉ vì chọn một zone.
5. **UX — History/Charts:** hiện lỗi tải zone/sensor thay vì im lặng; thời gian đo UTC+7; giải thích một điểm trung bình có thể chứa nhiều readings; chart có mô tả hỗ trợ truy cập và tooltip vẫn giữ min/max/count. Không đổi thuật toán aggregation hay tự chế readings.
6. **RESPONSIVE:** sidebar có chiều rộng mobile ngay cả khi desktop đang collapsed; nhãn mobile không biến mất; tên tài khoản truncate. Filter của Farms/Zones/Users/Crops/Devices/Sensors chuyển sang lưới co giãn; custom History columns dùng minmax(0,1fr); controls có thể shrink.
7. **UX/accessibility:** thêm 37 accessible names cho controls hiện hữu; focus-visible cho select/textarea; ConfirmDialog có tên/mô tả, focus ban đầu, Tab cycle, Escape khi không pending, focus restore và vùng cuộn.
8. **INCOMPLETE — Lỗi render:** AppErrorBoundary cho lỗi render/lazy page một fallback có hướng dẫn tải lại; không tự reload hoặc tự retry request.
9. **DEV-only tooling:** timezone transform không chèn trùng `timeZone` vào source đã khai báo; giữ fail-closed anchors và enforce:pre. Cập nhật một fixture Reports vì có thêm state lookupError; không sửa assertions để bỏ safety gate.

## 4. Source thay đổi và manifest

Danh sách đầy đủ **20 frontend source files**, file/hash trước phiên, pin revision9 và hash mới nằm trong [FRONTEND_MANIFEST_UPDATE_PROPOSAL.json](FRONTEND_MANIFEST_UPDATE_PROPOSAL.json).

Ngoài source frontend: sửa `scripts/mvp-ui-only-presentation.cjs`, cập nhật fixture trong `scripts/mvp-ui-only.test.cjs`; thêm `frontend/scripts/ui-completion.test.cjs`. Không thêm dependency. Không sửa backend, API contract, firmware hoặc command policy.

Manifest active và bản lưu `PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev9.json` cùng SHA256:

`2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9`

- Revision9 **HISTORICAL / UNCHANGED / NEEDS_NEW_REVISION**. 250 source entries, 4 runtime binaries, 3 offline-test pins được đọc/đối chiếu; 4 binary hashes khớp, không chạy PostgreSQL binaries.
- Source hiện tại có **21 pins khác revision9** và 1 offline-test pin thay đổi. Không tuyên bố source mới được revision9 xác nhận. JSON proposal không phải manifest active, không có approval thực thi.
- Cần review diff/hashes và duyệt revision mới riêng trước phiên live. Các historical hash-equality tests ràng buộc source rev7/8/9 không được chạy như acceptance cho source mới; không cập nhật các pin lịch sử để ép PASS.
- Rollback: chỉ đảo các thay đổi frontend/tooling trong phiên này sau review; dùng hash trước phiên trong proposal để kiểm tra, giữ nguyên thay đổi người dùng có trước. Không dùng reset toàn repository hoặc thay active manifest bằng hashes mới. Chưa thực hiện rollback.

## 5. Kiểm thử thực tế

Evidence offline: `../build/frontend-ui-audit-1793886482110/` (logs và baseline hashes; không phải dữ liệu nghiệm thu browser).

| Check | Kết quả | Native completion |
|---|---|---|
| TypeScript `tsc -b frontend/tsconfig.json --pretty false` | PASS | exit0; build cuối cũng chạy `tsc -b` |
| ESLint `node frontend/node_modules/eslint/bin/eslint.js .`, cwd frontend | PASS | Node exit0, wrapper exit0, stdout/stderr rỗng |
| `npm --prefix frontend run build` (`tsc -b && vite build`) | PASS | exit0 |
| `frontend/scripts/ui-completion.test.cjs` | **24/24 PASS** | exit0 |
| Existing irrigation + shadow-preview + live-observation tests | **31/31 PASS** | exit0 |
| Existing polling/history-range tests | **12/12 PASS** | exit0 |
| Targeted existing read-only/CORS/deny/presentation/Vite regressions | **70/70 PASS** | exit0 |
| Tổng các nhóm trên, không cộng lại những lượt rerun | **137/137 PASS** | Không phải browser E2E |

Nhóm 70 gồm 53 top-level tests và 17 subtests; trong đó actual installed Vite pipeline là 1 parent + 17 subtests, không mở listener. Các tests read-only dùng fake repository/HTTP boundary in-memory; không truy cập DB/MQTT. Các test names được chọn và log nguyên văn nằm trong `presentation-accepted.log`. Không chạy các scripts Playwright/E2E mở Edge hoặc toàn bộ system acceptance.

Các lỗi trong quá trình kiểm tra được giữ rõ: lượt đầu test mới 18/19 vì placeholder email demo còn sót; đã sửa và lượt cuối 24/24. Một lượt `npm run lint`/host kết thúc `-1073741819 (0xC0000005)` dù không có lint diagnostics; không tính lượt đó là PASS. Chạy trực tiếp ESLint có timeout 60s sau đó thu native exit0 và wrapper exit0, không điều tra/mở rộng native infrastructure, không kết luận lỗi host đã hết vĩnh viễn.

Build còn cảnh báo bundle chính >500kB (khoảng 523kB minified, không phải lỗi build). Chưa bổ sung code splitting chỉ để tắt cảnh báo.

## 6. Responsive/accessibility và những phần chưa nghiệm thu

- Desktop 1440, laptop 1024, tablet 768, mobile 390/375: đã review breakpoints/fixed columns/shrink/overflow và sửa các lỗi có bằng chứng source. **Visual viewport acceptance: NOT_EXECUTED**; không báo pixel-perfect hoặc touch-target PASS.
- Accessibility: accessible names/focus styles/ConfirmDialog được cải thiện, có synthetic keyboard tests. **Full keyboard/screen-reader/contrast/modal audit: NOT_VERIFIED**. Chưa có chứng cứ WCAG toàn website.
- API contracts, CRUD persistence, runtime auth/roles, CSV tải thật và dữ liệu cập nhật thật không được nghiệm thu bằng build/mock. Giao diện Settings không cung cấp đổi mật khẩu/hồ sơ khi chưa có API hợp lệ.
- Historical labels phụ thuộc dedicated DEV presentation entry; không gọi thông tin đã lưu là MQTT LIVE. Session mới không được mở bằng manifest rev9 đã drift.
- SOIL chất lượng/hiệu chuẩn vẫn BLOCKED/NOT_VERIFIED. Frontend không thể xử lý calibration bằng cách đổi nhãn hoặc số liệu. VERIFIED_LIVE/ACTIVE/automation và feedback motor/nước không được nghiệm thu.

## 7. Checklist browser cho phiên được duyệt riêng

1. Sau khi review/duyệt manifest mới, đăng nhập đúng môi trường; kiểm tra 401/403/404, nested History link giữ sensorId/range.
2. Dashboard: banner trong content, đủ sensor cards/units/timestamps, loading/empty/error; không gắn LIVE cho dữ liệu lịch sử.
3. History: từng TEMP/HUM/LIGHT/SOIL, đủ raw readings; chart bucket/tooltip/statistics tương ứng; đổi sensor/range/page không hiển thị dữ liệu của lựa chọn cũ.
4. Device Detail và Reports: nhãn historical/current đúng chế độ, lastSeen không chứng minh kết nối hiện tại; SOIL có cảnh báo.
5. Các list/form/Settings/Topbar: liên kết, required fields, feedback và phân quyền. Chỉ thử mutation trong môi trường và phạm vi được duyệt.
6. Responsive 1440/1024/768/390/375; mở sidebar sau desktop collapse; kiểm tra focus/Tab/Escape/overflow bảng và modal.
7. Network GET/OPTIONS latest-readings, API error/offline và polling recovery; không chia sẻ Authorization/Cookie/token. Giữ pump/automation controls khóa, không nhấn ON/OFF.

## 8. Kết luận

```text
SMART AGRICULTURE — FRONTEND COMPLETION
Total routes: 20 path declarations (including redirect and fallback)
Total pages: 19 routed components / 20 page source files
Completed pages: 19 implemented in the existing frontend scope; browser pending
Incomplete pages: 0 routed placeholders; Settings intentionally read-only
Known UI bugs remaining: no known blocking defect in the reviewed code paths;
  full viewport/accessibility/runtime acceptance remains unverified
TypeScript: PASS
ESLint: PASS (direct native run; earlier host failure retained)
Build: PASS (bundle-size warning)
Tests: 137/137 offline PASS
Responsive: SOURCE_REVIEWED / BROWSER_NOT_VERIFIED
Accessibility: TARGETED_OFFLINE_PASS / FULL_ACCEPTANCE_NOT_VERIFIED
Manifest revision9: HISTORICAL / UNCHANGED / NEEDS_NEW_REVISION
Frontend code: COMPLETE within the reviewed existing scope
Browser acceptance: NOT_EXECUTED for changed source
Overall: FRONTEND_CODE_COMPLETE_BROWSER_PENDING
```

Không start website/services, không browser retry, không MQTT, không migration, không tạo DeviceCommand hoặc tác động bơm. Trạng thái flags/runtime live không được xác minh trong phiên offline này. Dừng tại bàn giao source/tests/tài liệu; không tự mở phiên nghiệm thu tiếp theo.
