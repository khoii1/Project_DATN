# Automated frontend acceptance preparation

06/11/2026 (UTC+7). **PREPARATION ONLY. BROWSER_AUTOMATION_SETUP_REQUIRED.**

Không khởi động browser, Website, PostgreSQL hoặc MQTT; live attempt vẫn 0/1. Không dùng lại approval activation đã tiêu thụ.

## 1. Kết quả kiểm kê thực tế

Active manifest revision10 đúng SHA256:
`47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`.

250 source/4 runtime/4 offline-test pins vẫn khớp. Không sửa source, dependencies, manifest hoặc launcher. Inventory: `../build/automated-frontend-browser-inventory.json`.

| Thành phần | Bằng chứng đọc offline | Kết luận |
|---|---|---|
| Supported in-app Browser | Browser client/tool có sẵn, registry trả 0 instances | `iab` chưa có instance điều khiển được; permission backend chưa xác minh |
| Playwright | Root `node_modules/playwright-core`, version **1.62.1** | Có thư viện, chưa chứng minh launch/DOM/screenshot hoạt động |
| Playwright/Test/Puppeteer/Selenium | Không tìm thấy packages tương ứng ở các root/frontend/backend node_modules đã kiểm tra | Không khẳng định không tồn tại ở mọi nơi trên máy |
| Edge | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, **156.0.4314.58** | Binary có sẵn, chưa launch trong phiên này |
| Chrome | `C:\Program Files\Google\Chrome\Application\chrome.exe`, **156.0.8078.80** | Binary có sẵn; không tự chọn làm fallback |
| Managed Chromium cache | Chromium1194 **141.0.7390.37**, Chromium1223 **148.0.7778.96**; headless-shell cache1194/1223 | Không khớp revision mà Playwright hiện khai báo |
| Default Chromium của Playwright hiện tại | `browsers.json` yêu cầu revision **1234**, browserVersion **151.0.7922.34**; cache `chromium-1234` không có | Không coi default `chromium.launch()` là đường chạy sẵn sàng |

SHA256 binary được đọc, không thực thi:

```text
Edge:   d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b
Chrome: 46461accbdc87dc88a5bdd6d611be095dd6147db009863d794f742ca90662efa
```

`playwright-core/package.json` SHA256:
`07c47543631fef9508760365dee9fbe958c562093ec8d122543949ed231f233f`.

Các dữ kiện trên xác nhận file/thư viện đã cài, không chứng minh browser process hoặc protocol handshake thành công. Không suy version mismatch là nguyên nhân lỗi launch lịch sử.

## 2. Phương án đơn giản nhất

Ưu tiên kết nối lại supported Browser backend `iab` nếu môi trường có thể cung cấp instance. Hiện không có instance; chỉ mở Edge thủ công không tạo browser-control cho Agent. Công cụ hiện tại không expose một thao tác cấp quyền/đăng ký backend để tự sửa; không đoán tên setting hoặc tự cài extension.

Phương án local dự phòng **được đề xuất để review, chưa được phép chạy**: dùng `playwright-core` hiện có với **đúng Edge executable đã kiểm kê**, chỉ định executablePath rõ ràng. Không cần npm install, browser download hoặc extension để thử phương án này. Không dùng Chromium cache cũ như thể khớp Playwright, không chuyển qua Chrome nếu Edge lỗi.

Trước Website cần một capability smoke độc lập chỉ `about:blank`, có phê duyệt mới. Tái sử dụng kiến trúc `scripts/mvp-edge-smoke-observer.cjs`/`.ps1` đã có: private fresh profile/TEMP, closed environment, finite deadline, owned PID/native outcome và no retry. Revalidate source/binary hashes và current observer/launcher exit contract trước khi đề nghị thực thi; không dùng approval smoke cũ.

Lý do chưa READY: Phase AB từng ghi Edge native exit0 nhưng Playwright launch reject trước context/page; Phase AC chưa xác định root cause launch. Browser executable tồn tại không khắc phục được bằng chứng này. Phiên hiện tại không tái hiện lỗi hoặc chạy smoke nên khả năng tự thao tác browser vẫn **NOT_VERIFIED**.

Không cần cài gì trong bước chuẩn bị. Nếu Edge smoke thất bại, dừng và phân tích evidence; cài Chromium1234 hoặc đổi version là lựa chọn cần review/approval khác, không phải hành động được tự thực hiện hoặc bảo đảm sửa lỗi.

## 3. Các runner cũ không được chạy nguyên trạng

- `scripts/mvp-ui-browser.cjs`, `mvp-dev-final-browser.cjs`, `mvp-pagination-browser.cjs` có assumptions SIMULATOR/fixture, DB client/ingest hoặc thao tác ghi trong acceptance flow. Không reuse các hàm accept toàn bộ cho historical read-only.
- Chỉ tái sử dụng selectors/lifecycle/observation patterns sau review, không import runner có side effects để “test thử”.
- Cần một browser-only read-only adapter được review riêng, không sở hữu DB client, ingest, MQTT gateway hoặc quyền mutation; chưa được triển khai/chạy trong preparation này.
- Existing `mvp-ui-only-session.ps1`/supervisor/runtime giữ nguyên. Không sửa launcher hoặc manifest để tự chèn browser runner. Nếu integration sau này cần sửa pinned source, phải dừng và review lineage riêng.

## 4. Thiết kế integration giữ nguyên safety gates

1. Capability smoke PASS trước khi tiêu thụ Website attempt. Không dựa vào binary inventory để skip bước này.
2. Một approval Website mới gắn active rev10 và browser adapter/launch path đã review. Start bằng existing launcher, đúng DEV55433/systemID/db, API55001/frontend55173, không production. Giữ READ ONLY6/6, 11 migrations, 8 identities, 12 historical readings, native/source/ACL/identity checks và CORS204/204/auth200 trước frontend.
3. Chỉ sau READY, browser-only process chạy trong cửa sổ supervisor **600 giây hiện có**, không tự restart services hoặc gia hạn. Browser thuộc ownership của adapter; không attach profile cá nhân/process lạ. Close browser trước shutdown frontend/API/DEV cluster; timeout/unknown thì dừng, không retry/fallback hoặc kill process lạ.
4. Credential Website hiện hữu nhập tại secure prompt cục bộ, gửi transient UTF-8 stdin nếu local adapter được duyệt. Không lấy password từ chat, .env, DB hoặc evidence; không lưu token/storageState/HAR/trace chứa secrets. Có thể cần operator nhập credential cho launcher và browser adapter riêng; chưa có handoff liên process được review để hứa chỉ nhập một lần. Operator không cần tự chụp ảnh.
5. Agent tự navigation, assertions, viewport/keyboard, screenshots; adapter chỉ đọc DOM và metadata Network cần thiết. Không dùng APIRequestContext/DB để tạo dữ liệu hoặc thay UI bằng response fixtures.
6. Giữ DB before/after digest, ActivityLog check, source/runtime revalidation và owned cleanup của supervisor. Không tự viết `operatorAttested=true`: existing manual-intake yêu cầu attestation thật, chỉ có 12 keys và 3–10 ảnh. Agent xuất bảng 19 routes riêng; operator chỉ cần xác nhận tổng kết evidence cuối nếu muốn supervisor ghi accepted. Không tuyên bố 12 keys bao phủ 19 pages hoặc giả xác nhận operator.

## 5. Read-only browser policy cần review

- Browser environment chỉ có OS variables cần thiết và private profile/TEMP; không thừa kế DB/MQTT/JWT/application secrets. Service workers block; không tải browser hoặc dùng profile cá nhân.
- Allowed application origins: `http://127.0.0.1:55173`, `http://127.0.0.1:55001`. GET/HEAD đọc theo existing HTTP boundary; POST chỉ đúng login/logout. Chặn mọi Save/Delete/create/update, pump commands, Automation mutations và các external application requests. Không gọi endpoint bị dedicated boundary từ chối để ép dữ liệu xuất hiện.
- Không click ON/OFF, Save, Delete, enable Automation, ACK/resolve alert hoặc submit form CRUD. Có thể xem form nếu không gây mutation; không xác nhận dialog.
- Page/context routing không chứng minh browser background networking được cách ly tuyệt đối. Không mô tả đây là môi trường network-isolated, không đổi firewall/Defender hoặc thêm `--no-sandbox` để ép launch.
- Network evidence chỉ path/method/status/timing và các boolean CORS cần thiết; không lưu headers/cookies, auth body, response login/JWT, raw HAR hoặc Playwright trace. OPTIONS không xuất hiện ghi NOT_OBSERVED, không tự tạo request để ép PASS.
- Console/pageerror ghi counts và lỗi đã sanitize; thông tin có khả năng chứa secret phải bỏ/redact, không dump raw object hoặc full payload. Screenshot sau login; không chụp password/token/DevTools headers.

## 6. Automated checklist — 19 pages

Tất cả đang **PLANNED / NOT_EXECUTED**. IDs lấy từ links/controls của records hiện hữu, không tạo fixture. Chi tiết không có record để xem: NOT_VERIFIED.

| Page | Automated checks dự kiến |
|---|---|
| Login `/login` | Render, required-field errors, actual authorized login, protected redirect/query restore, không lộ credential |
| Dashboard `/dashboard` | Banner nằm trong content, 4 cards/units/time/historical label; latest-readings GET; controls khóa |
| Sensors `/sensors` | 4 sensor types; filters, links History; không Save |
| History/Charts `/sensors/history` | Lần lượt TEMP/HUM/LIGHT/SOIL, mỗi loại 3 raw rows = tổng12; UTC+7, source/unit/latest/min/max/avg; tooltip/count, bucket có thể gộp thành một điểm; filter/range/page không giữ dữ liệu sensor cũ |
| Device Detail `/devices/:id` | Metadata/linked sensors, lastSeen lịch sử, không khẳng định ONLINE hiện tại; SOIL warning |
| Irrigation `/irrigation` | Pump controls disabled và lý do; historical/UNKNOWN; không click điều khiển. Shadow/live/history bị boundary chặn phải báo unavailable, không fake PASS |
| Reports `/reports` | 4 tabs, historical counts/labels; ngày trống/đảo ngược có feedback, không Invalid Date crash |
| Settings `/settings` | Account read-only, profile/settings navigation, Users link theo role |
| Devices `/devices` | List/summary/filter/detail navigation, trạng thái historical |
| Farms `/farms` | Scoped list/filter/pagination, không mutation |
| Farm Detail `/farms/:id` | Zone/staff presentation, permission/empty state; không assign |
| Zones `/zones` | Farm/status filter, link detail |
| Zone Detail `/zones/:id` | Parent farm/crops/sensors, empty state hoặc linked data |
| Crops `/crops` | Filter và valid empty state; không thêm crop |
| Alerts `/alerts` | List/filter/empty, SOIL quality warning; không ACK/resolve/rule save |
| Activity Logs `/activity-logs` | Dates/filter/pagination và memory-only login audit disclaimer |
| Users `/users` | Owner/STAFF bị 403/Forbidden; ADMIN positive chỉ khi có approved credential, nếu thiếu NOT_VERIFIED |
| Forbidden `/forbidden` | 403 render, Dashboard link, không redirect loop |
| Not Found `*` | 404 render và Dashboard link |

`/` kiểm tra redirect một lần, không tính page20. Không có `/charts` hoặc `/sensors/:id` độc lập. Không gọi unsupported API cho một route không tồn tại.

### Viewports và keyboard

Widths **1440,1024,768,390,375px**; heights dự kiến 1000,900,1024,844,812. Ghi actual dimensions cho từng phép đo. Reuse context/page, không tạo browser mới cho mỗi viewport.

- Render/navigation ở 19 pages; lập matrix19×5, chỉ PASS ô thực sự kiểm tra. Ưu tiên Dashboard/History/list-filter/Settings/menu ở cả5 widths; không suy chúng PASS thì 19 pages responsive đều PASS.
- Đo body scrollWidth/clientWidth, kiểm tra trực quan banner/cards/units/warnings, table cuộn trong container, chart không bị cắt; số đo không thay screenshot review.
- Sidebar collapsed desktop → mobile mở/đóng/backdrop; Topbar account menu; Tab/Shift+Tab, focus-visible, Escape hợp lệ. Không dùng phím kích hoạt mutation.
- Empty/loading/error chỉ quan sát trạng thái sẵn có hoặc browser-only abort/delay đúng request đọc đã review. Không stop services/MQTT, sửa DB hoặc fake response bodies. Thu hồi intercept rules trước kết thúc.
- Safety/auth/source failure dừng ngay; timeout/không đủ thời gian ghi PARTIAL/NOT_VERIFIED, không mở attempt thứ hai.

### Evidence/time budget

Tối đa10 screenshots thật: Dashboard, TEMP/HUM/LIGHT/SOIL History+Charts (4), Device Detail, Irrigation disabled, Reports, Settings, một mobile viewport. Bảng observations19 routes, 5 viewports và keyboard/network ghi riêng trong private run. Không sửa ảnh để giả bằng chứng.

Trong 600 giây sau READY: khoảng 0–2phút login/Dashboard; 2–5 History4 loại/Devices; 5–7 Irrigation/Reports/Settings; 7–9 các routes/viewport còn lại; phút cuối close/evidence/attestation. Adapter cần bounded per-step deadlines; hoàn tất thiếu mục vẫn là PARTIAL, không ép đủ checklist.

## 7. Cần quyền gì tiếp theo?

**Chưa sẵn sàng phê duyệt full automated Website acceptance bằng đường local hiện tại.** Có library/binaries nhưng chưa có browser-control hoạt động và chưa có adapter read-only đã review thay các runner có mutation.

Phạm vi thực thi tối thiểu để gỡ capability blocker: approval mới cho **một Edge `about:blank` smoke độc lập**, đúng executable/hash, private profile/environment, one launch/no retry, finite timeout, native/lifecycle/cleanup evidence; không Website/DB/MQTT. Trước chạy phải review hashes và current observer/launcher contract, không dùng lại approval smoke lịch sử. Smoke chỉ dùng để xác minh capability, không tiêu thụ Website0/1 và không tự cấp quyền cho E2E.

Sau capability PASS và adapter read-only được chuẩn bị/review offline: approval riêng cho đúng một automated supervised historical Website session600giây qua existing launcher, secure credential handoff, screenshots/observations và owned cleanup. Không activation mới, production, migration, mutation, MQTT hoặc pump. Hoặc cung cấp `iab` instance hoạt động, rồi review cách automation/evidence tích hợp cùng launcher trước khi chạy.

```text
Active manifest: REV10 VERIFIED / UNCHANGED
Installed automation library: playwright-core 1.62.1
Installed browser binaries: Edge, Chrome, cached Chromium1194/1223
Default Playwright Chromium1234: NOT_INSTALLED
Supported iab browser instances: 0
Edge/Playwright launch compatibility: NOT_VERIFIED
New installation: NOT_PERFORMED / NOT_REQUIRED_FOR_PROPOSED_EDGE_SMOKE
Local Playwright execution authorization: NOT_GRANTED_BY_THIS_PREPARATION
Website/DB/browser E2E: NOT_STARTED
Live attempt: 0/1 UNCHANGED
FINAL: BROWSER_AUTOMATION_SETUP_REQUIRED
```

STOP sau inventory và thiết kế. Không chạy smoke/browser E2E, không start services hoặc sửa manifest.
