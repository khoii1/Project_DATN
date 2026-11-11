# Frontend final release preparation

Ngày: 05/11/2026 (UTC+7). **PREPARE ONLY — chưa active manifest, chưa chạy browser acceptance.**

## 1. Kết luận và artifacts

**FRONTEND_RELEASE_CANDIDATE_READY**

- Candidate: [PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev10.candidate.json](PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev10.candidate.json).
- Candidate SHA256: `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`.
- Hash review đầy đủ từng file trước/sau: [FRONTEND_RELEASE_HASH_REVIEW.json](FRONTEND_RELEASE_HASH_REVIEW.json).
- Kế thừa [FINAL_FRONTEND_UI_AUDIT.md](FINAL_FRONTEND_UI_AUDIT.md) và [FRONTEND_MANIFEST_UPDATE_PROPOSAL.json](FRONTEND_MANIFEST_UPDATE_PROPOSAL.json); không thay kết quả lịch sử bằng kết quả browser giả định.

Active manifest và archive revision9 vẫn cùng SHA256:
`2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9`.

Candidate giữ `version=1`, purpose `SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL`, scope historical; `revision=10`, lineage trỏ archive rev9 và đúng hash trên. Không có approval ID hay attestation thực thi được tự tạo. Tên candidate không được coi là manifest active.

## 2. Hash, dependency và phạm vi thay đổi

| Kiểm tra | Kết quả hiện tại |
|---|---|
| Source catalogue runtime thực tế | 250/250 đường dẫn khớp; chỉ đọc AST danh sách scripts và filesystem, không import/chạy runtime adapter |
| Source khác revision9 | **Đúng 21**, khớp từng đường dẫn/old hash/new hash trong proposal |
| Source còn lại | **229/229** nguyên hash; không có drift bổ sung trong pinned catalogue |
| Runtime binaries | **4/4** nguyên SHA256; không chạy PostgreSQL binaries |
| Existing offline-test pins | **Đúng 1/3 thay đổi**, 2 còn lại nguyên hash |
| Test mới đã khai báo trong proposal | `frontend/scripts/ui-completion.test.cjs` khớp SHA256 đã review |
| Candidate pins | **250 source + 4 runtime + 4 offline tests** |
| Dependency lockfiles | Root/backend/frontend lockfiles khớp rev9 |
| Frontend dependencies | 21 direct dependencies/devDependencies: declarations khớp frozen lockfile; installed versions khớp lockfile |
| Application changes trong phiên chuẩn bị này | **Không có**; chỉ tạo candidate, hash review, report và offline verification artifacts |

Test mới được thêm thành pin offline-test thứ tư, không tăng source catalogue thành 251. Việc này được nêu rõ để review, chưa được active. Hash test mới:
`0d6a321bc1944fccb14e8a5c7270319278a1a953cde9c05757b45e44feabb0c1`.

Giới hạn: `frontend/package.json` không nằm trong catalogue 250 file của launcher hiện hành. Hash hiện tại được ghi ở `auxiliaryDependencyReview` của hash review; declarations được đối chiếu lockfile. Đây không phải bằng chứng lịch sử về từng byte package.json, cũng không phải hash toàn bộ node_modules. Phiên sau cần recheck auxiliary hash này; không tự mở rộng source catalogue hoặc sửa launcher trong phiên chuẩn bị. Không coi mọi untracked report/build artifact lâu nay là application drift.

### Chính xác 21 source pins đã thay đổi so với revision9

| # | File |
|---|---|
| 1 | `frontend/src/App.tsx` |
| 2 | `frontend/src/components/auth/ProtectedRoute.tsx` |
| 3 | `frontend/src/components/common/ConfirmDialog.tsx` |
| 4 | `frontend/src/components/layout/Sidebar.tsx` |
| 5 | `frontend/src/components/layout/Topbar.tsx` |
| 6 | `frontend/src/components/sensors/SensorHistoryChart.tsx` |
| 7 | `frontend/src/components/sensors/SensorValueCard.tsx` |
| 8 | `frontend/src/index.css` |
| 9 | `frontend/src/pages/activity-logs/ActivityLogsPage.tsx` |
| 10 | `frontend/src/pages/alerts/AlertsPage.tsx` |
| 11 | `frontend/src/pages/auth/LoginPage.tsx` |
| 12 | `frontend/src/pages/crops/CropsPage.tsx` |
| 13 | `frontend/src/pages/devices/DevicesPage.tsx` |
| 14 | `frontend/src/pages/farms/FarmsPage.tsx` |
| 15 | `frontend/src/pages/reports/ReportsPage.tsx` |
| 16 | `frontend/src/pages/sensors/SensorHistoryPage.tsx` |
| 17 | `frontend/src/pages/sensors/SensorsPage.tsx` |
| 18 | `frontend/src/pages/settings/SettingsPage.tsx` |
| 19 | `frontend/src/pages/users/UsersPage.tsx` |
| 20 | `frontend/src/pages/zones/ZonesPage.tsx` |
| 21 | `scripts/mvp-ui-only-presentation.cjs` |

Existing test pin thay đổi: `scripts/mvp-ui-only.test.cjs` (fixture Reports có thêm lookup-error state):

- Rev9: `65d447497670ba60c53c1425862074a1e8adcf51b27c2d695b4a5781c959319e`.
- Candidate: `af66a2a7329c1de9dd06a0be513a60157337782d6ece9179f169bf52adadd236`.

Tất cả 21 cặp hash source đầy đủ có trong hash review JSON. Backend source, irrigation policy, API boundary, readonly repository, runtime/supervisor/launcher và firmware không được sửa để chuẩn bị candidate.

## 3. Targeted verification mới

Không chạy lại bộ 137 tests. Chỉ chạy:

```powershell
node --test --test-name-pattern="AW actual installed Vite serve pipeline|AU disabled policy|configuration refuses production|UI HTTP surface" scripts/mvp-ui-only.test.cjs
```

**23/23 PASS, native exit0** (6 top-level và 17 subtests). Log: `../build/frontend-release-preparation/targeted-verification.log`.

- Actual installed Vite middleware transform: presentation chạy trước React/JSX, banner nằm trong main, các anchors còn fail-closed; Device Detail/Reports/Dashboard/History/Charts giữ historical labels và timezone; SOIL vẫn cảnh báo.
- Test dùng middleware mode, `httpServer=null`, listen bị chặn; các temporary Vite containers được đóng. Không import auto-start frontend entry, không chạy website listener/browser.
- OFF/ON/UNKNOWN trong mock historical policy đều không cho dùng hai pump actions. Boundary/config tests tiếp tục chặn mutation/control và từ chối Commands/Automation/MQTT được bật.
- Đây là bằng chứng offline, không phải runtime flags hiện tại hoặc live authorization PASS. Chưa có browser screenshots mới.
- Typecheck/lint/build và 137/137 từ phiên trước được kế thừa theo hashes khớp; không tuyên bố đã rerun trong phiên này. Cảnh báo bundle >500kB và sự cố npm/host `0xC0000005` trước đó vẫn được giữ trong audit; không kết luận host đã ổn định vĩnh viễn.

## 4. Checklist browser — 19 page components thực tế

Tất cả ô dưới đây đang **NOT_EXECUTED**. Dùng tài khoản và records hiện hữu; detail IDs lấy từ liên kết danh sách. Không tạo fixtures, không sửa/xóa records hoặc readings để lấp màn hình trống.

| Ưu tiên | Component / route | Tiêu chí quan sát ngắn |
|---|---|---|
| P0 | LoginPage `/login` | Đúng tài khoản DEV; lỗi required/sai đăng nhập rõ ràng; pending không double submit; không có credential demo cố định; chuyển History giữ query/hash |
| P0 | DashboardPage `/dashboard` | Banner đầy đủ trong content, không bị sidebar che; 4 sensors có units/timestamp/historical; API connected không đồng nghĩa MQTT LIVE; pump bị khóa |
| P0 | SensorsPage `/sensors` | 4 sensors đã lưu, bộ lọc không tràn; đúng °C/%/lux; link History chọn đúng sensor; SOIL không được nâng trust |
| P0 | SensorHistoryPage `/sensors/history` | Chọn lần lượt TEMP/HUM/LIGHT/SOIL; mỗi sensor 3 raw readings, tổng 12; timestamp UTC+7/receivedAt/source; latest/min/max/avg đối chiếu raw rows; chart bucket có thể gộp 3 readings thành 1 điểm; tooltip đúng unit/count; pagination/range không giữ dữ liệu sensor cũ |
| P0 | DeviceDetailPage `/devices/:deviceId` | Metadata/sensors liên kết; connection label “đã lưu/không LIVE”, không khẳng định ESP32 hiện ONLINE; timestamp lịch sử, SOIL cảnh báo; GPIO không phải motor/water feedback |
| P0 | IrrigationPage `/irrigation` | Pump UNKNOWN/khóa theo historical datasource; cả Bật/Tắt không khả dụng; thông báo lý do; không nhấn điều khiển. History/shadow/live endpoints bị dedicated boundary chặn phải báo unavailable/error rõ, không coi là live PASS |
| P0 | ReportsPage `/reports` | Counts 12 readings/4 sensors theo dữ liệu đã lưu; labels không gọi historical là snapshot hiện tại; 4 tabs không trắng; ngày trống/đảo ngược có lỗi, không crash |
| P0 | SettingsPage `/settings` | Hồ sơ khớp tài khoản đăng nhập, read-only, không Save giả; link Users chỉ ADMIN; Topbar Profile/Settings đi đúng trang |
| P1 | DevicesPage `/devices` | Device thật đã đăng ký, nhãn connection historical, summary/list/filter/link detail nhất quán |
| P1 | FarmsPage `/farms` | Danh sách scoped, tên/diện tích/trạng thái/filter/pagination; không submit mutation |
| P1 | FarmDetailPage `/farms/:farmId` | Chi tiết scoped, zone links/nhân sự; empty/permission errors có phản hồi; không phân công nhân sự |
| P1 | ZonesPage `/zones` | Filter farm/status và link detail đúng; empty không trắng; không Save |
| P1 | ZoneDetailPage `/zones/:zoneId` | Farm/zone/crop/sensor links đúng dữ liệu, zero/missing không thành normal giả |
| P1 | CropsPage `/crops` | Filter/form presentation, empty hợp lệ nếu không có cây trồng; không tạo thêm dữ liệu |
| P1 | AlertsPage `/alerts` | Filter và empty/error rõ; không dựng cảnh báo giả; không ACK/resolve/save rule |
| P1 | ActivityLogsPage `/activity-logs` | Historical audit đúng nhãn memory-only của login phiên này; ngày trống không crash; bảng/filter không tràn; không coi memory audit là durable persistence |
| P1 | UsersPage `/users` | Với owner/STAFF: bị chặn và tới Forbidden. Positive ADMIN view chỉ kiểm tra nếu có tài khoản ADMIN hiện hữu được duyệt; nếu không ghi NOT_VERIFIED, không tạo account hoặc đổi role |
| P1 | ForbiddenPage `/forbidden` | 403 rõ ràng, link Dashboard hoạt động, không loop |
| P1 | NotFoundPage `*` | Một URL không tồn tại hiện 404, link Dashboard hoạt động |

`/` chỉ là redirect, kiểm tra một lần; không tính thành page thứ 20. `SensorDataPage.tsx` không được route, không bổ sung vào acceptance. Charts là một phần của History.

### Thứ tự nhanh trong giới hạn launcher hiện có

Launcher giới hạn `manualSeconds<=600`; không tự kéo dài. Đề xuất một cửa sổ **600 giây**, operator sẵn sàng trước startup:

1. Phút 0–2: login, Dashboard và navigation/bell/profile/settings.
2. Phút 2–5: Sensors → History 4 loại → Device Detail.
3. Phút 5–7: Irrigation khóa, Reports, Settings.
4. Phút 7–9: các list/detail còn lại, audit, 403/404; kiểm tra responsive nhanh trên Dashboard/History/list filters.
5. Phút 9–10: ảnh còn thiếu, kết luận từng mục, cleanup. Mục chưa quan sát ghi NOT_VERIFIED; không ép đủ 19/19, không tự mở phiên thứ hai.

Checklist máy hiện hành có 12 keys, không tự chứng minh toàn bộ 19 pages. Giữ contract launcher; dùng checklist báo cáo này ghi nhận bổ sung. Không ghi tất cả keys=true hoặc accepted=true nếu chưa thực sự kiểm tra. Không yêu cầu đổi launcher chỉ để gom báo cáo.

## 5. Responsive, keyboard, states và permissions

| Viewport | Kiểm tra trực quan |
|---|---|
| 1440px | Sidebar/content/banner đúng margin; Dashboard cards; report/chart axes; list filter không ép ngang |
| 1024px | Sidebar expanded/collapsed, không đè content; filters tự xuống hàng; table cuộn trong container |
| 768px | Mobile drawer/backdrop/close; nhãn menu còn đủ; form/filter/chart không tràn body |
| 390px | Mở menu sau desktop collapse; tên tài khoản dài; units/timestamp/warnings đọc được; modal có vùng cuộn |
| 375px | Không mất nút/badge/label; History filters và tooltip; table có thể cuộn ngang mà body không tràn |

- Keyboard: Tab/Shift+Tab có focus rõ; Enter submit login; account menu Escape đóng; sidebar links; select/textarea focus-visible. Nếu có thể mở ConfirmDialog hợp lệ mà không gửi mutation: tên/mô tả, Tab cycle, Escape khi không pending, focus quay lại nút mở; không xác nhận hành động.
- Loading/empty/error: loading không nháy số zero giả; API fail giữ/cảnh báo dữ liệu cũ đúng cách, không đổi thành LIVE; empty hợp lệ không gọi là lỗi. Chỉ dùng browser request blocking/latency cho đúng API URL trong phiên được duyệt, không stop dịch vụ hoặc tạo MQTT outage. Gỡ rule trước cleanup; không thay DB để tạo các trạng thái này.
- Permissions: chưa đăng nhập vào protected route phải tới Login; owner/STAFF không vào Users; ADMIN positive chỉ khi có credential được duyệt. Form có thể hiện theo quyền nhưng save bị read-only boundary khóa; không coi UI-only session là CRUD acceptance.
- Network: kiểm tra OPTIONS/GET `latest-readings` và login status/CORS; không chụp Authorization/Cookie/token/password.
- Evidence tối thiểu: Dashboard/banner, một ảnh History/raw+chart cho mỗi loại, Device Detail, Irrigation khóa/SOIL, Reports, Settings và một ảnh mobile. Runtime nhận tối đa 10 ảnh trong operator attestation; các mục còn lại ghi PASS/FAIL/NOT_VERIFIED và route/viewport/lỗi cụ thể, không giả ảnh hoặc gộp kết luận chưa xem.

## 6. Blockers và authorization cần có trước phiên sau

**Không có unexpected hash drift hoặc blocker offline mới.** Các điều kiện còn mở:

- Candidate revision10 chưa được active/phê duyệt; không dùng rev9 để vượt hash gate.
- Chưa có approval mới cho startup DB/backend/frontend/browser. Không tái sử dụng approval đã tiêu thụ.
- Positive ADMIN/STAFF role matrix có thể thiếu credential; full keyboard/responsive/empty/error screenshots chưa có. Một phiên owner historical không đủ xác nhận mọi role hoặc CRUD.
- Native host failure trước đây chưa có bằng chứng đã hết vĩnh viễn; nếu fresh preflight nonzero/unknown thì dừng, không coi JSON output là PASS.
- SOIL calibration/VERIFIED_LIVE, physical pump, production recovery/migration không được nghiệm thu hoặc mở rộng trong release này.

Phạm vi phê duyệt tiếp theo đề xuất, cần người dùng cấp riêng:

1. Duyệt candidate hash chính xác ở mục 1, gồm 21 source changes, 1 existing-test change và 1 added offline-test pin. Cho phép active đúng bytes candidate sau khi rehash; giữ archive rev9, không sửa app source hoặc dependencies để vượt gate.
2. Duyệt **một phiên supervised historical DEV UI-only, tối đa 600 giây quan sát**, đúng test cluster hiện hữu 127.0.0.1:55433 và DB `smart_agriculture_mvp_dev`, systemID `7698826681383327460`; API 55001/frontend 55173 loopback. Identity/ACL/ports/source/native completion/pre-frontend CORS/auth gates phải đạt; nếu không dừng, không initdb/reset/retry.
3. Secure prompt cho credential Website DEV hiện hữu tại máy, không chat/env/CLI/log. Không reset credential. Operator mở browser để xem; không tự fallback launcher/browser khi thất bại. Agent chỉ hỗ trợ xem/chụp các màn hình được duyệt nếu công cụ khả dụng.
4. Giữ READ ONLY DB, MQTT disabled, Commands=false, Automation=false, TestMode=true/cap1s; không application PUBLISH, ON/OFF, production, migration/seed, firmware/hardware. Adapter bơm giữ ngắt; xác nhận vận hành sát phiên sau.
5. Cho phép create-new private run/evidence/approval plan gắn approval mới thật, không overwrite lịch sử; kết thúc graceful chỉ các process/cluster do phiên đó sở hữu; đối chiếu readings/records/command baseline không thay đổi, ports được giải phóng. Không tự retry hay kéo dài.

Đây là **đề xuất phạm vi**, không phải phê duyệt đã cấp. Candidate readiness không phải `FRONTEND_BROWSER_VERIFIED` hoặc `FRONTEND_UI_COMPLETE`.

**STOP — chưa kích hoạt manifest, chưa khởi động Website/DB/MQTT/browser, không tác động bơm.**
