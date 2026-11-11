# Phase AU — Offline historical UI presentation remediation

Ngày05/11/2026 UTC+7. **OFFLINE_PRESENTATION_REMEDIATION_PASS**. Phạm vi DEV UI-only; không mở phiên nghiệm thu mới. Kết quả AS/AT vẫn là historical UI PARTIAL, không nâng thành browser PASS bằng tests offline.

## 1. Baseline và phạm vi

Đã đối chiếu [AT](MVP_PHASE_AT_FINAL_UI_ACCEPTANCE.md), [AS](MVP_PHASE_AS_DASHBOARD_UI_ACCEPTANCE.md), [AR](MVP_PHASE_AR_DASHBOARD_READ_ROUTE_REMEDIATION.md), manifest7, dedicated frontend/plugin, layout, DeviceDetail, Reports, Dashboard, device labels, sensor/history/chart và controls helper.

Trước chỉnh sửa: exact manifest7 SHA256 `000b8bfce621851eeae4829a9618fa289d23358fc0d352387a852e48bad473b7`,250sources/4runtimebinarypins PASS; không có listener55433/55001/55173 hoặc test postmaster.pid. Exact rev7 bytes được giữ bằng create-new tại `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev7.json` trước thay đổi.

Không cần mở rộng phạm vi shared production UI: tất cả chỉnh sửa hiển thị qua plugin chỉ được dedicated DEV Vite entry cài đặt, hoặc component đã nằm riêng trong `frontend/src/dev`. Các file component/layout/types production không bị ghi thay đổi.

## 2. Execution source changes

| File thực sự sửa | Thay đổi / mục đích |
|---|---|
|`scripts/mvp-ui-only-presentation.cjs`|Bỏ body-prepend banner; inject banner trong main của layout đã có responsive sidebar margin. Thêm DEV-only historical labels cho device/detail, Dashboard và Reports; giữ formatter Vietnam-time và làm rõ thời điểm đọc trang History|
|`frontend/src/dev/ui-only-sensor-card.tsx`|SOIL ghi rõ “chưa hiệu chuẩn” cùng cảnh báo chất lượng chưa xác minh/không dùng tưới tự động; giữ value/unit/timestamp/null semantics|

Thay đổi khác: `scripts/mvp-ui-only.test.cjs` thêm17regressions offline và chuyển AR lineage test sang immutable rev7 snapshot; active manifest revision8, immutable rev7 snapshot và báo cáo này. Không thêm execution module/dependency/source member; không thay đổi source membership250.

### Banner trong layout

Body-prepend cũ nằm ngoài content wrapper, nên fixed sidebar che phần đầu. Plugin nay inject đúng một `<aside role="alert">` trước Outlet **bên trong main**, sau Topbar, trong wrapper dùng `lg:ml-[268px]` hoặc `lg:ml-20` theo trạng thái sidebar. Text nằm trong normal document flow, w-full/min-w-0/whitespace-normal/break-words; không fixed overlay, không sửa CSS/sidebar/topbar production.

Nội dung vẫn giữ historical/notLIVE/MQTT-disabled/current-state caveat/memory-only audit và bổ sung SOIL chưa hiệu chuẩn,100% lịch sử không chứng minh chất lượng, controls/Automation khóa. Không có banner trùng ở body. Không có thay đổi vị trí scroll hoặc cam kết banner sticky; kiểm tra browser thực tế vẫn cần, đặc biệt viewport nhỏ và sidebar mobile.

### Device, Dashboard và Reports

Trong DEV serve transform của `types/device.ts`, connection labels thành “Đã lưu: Trực tuyến/Ngoại tuyến/Chưa xác định — không LIVE”. Không sửa connectionStatus/lastSeenAt/data hoặc giả OFFLINE. DeviceDetail đổi heading thành “Kết nối đã ghi nhận — không LIVE”, nhận tín hiệu thành “Lần nhận đã lưu (UTC+7)”, giải thích MQTT tắt/không xác minh kết nối ESP32 hiện tại. Các nơi dùng cùng label map trong DEV cũng nhận qualifier; số liệu vẫn nguyên trạng.

Dashboard device-count note bổ sung “online/offline đã lưu — không LIVE”; không thay fetch/polling/Promise.all/pump presentation/handlers. Reports bỏ “Snapshot hiện tại” và các mô tả snapshot/tài nguyên hiện tại, thay bằng bản ghi đã lưu/không xác minh trạng thái hiện tại; device count note cũng được qualify. Reports measurement timestamp được định dạng rõ Vietnam timezone.

Sensor cards giữ timestamp đo,unit và historical/notLIVE; missing value/timestamp vẫn là unavailable, không biến thành0. SOIL100% vẫn chỉ là giá trị số lịch sử, không calibration proof. History đổi “Cập nhật lần cuối” thành “Lần đọc dữ liệu lịch sử” để phân biệt fetch time với measurement time.

### Isolation / fail-closed

Plugin có `apply:'serve'`, chỉ dedicated `mvp-ui-only-frontend.mjs` cài đặt; production Vite config không import plugin. Các source anchor thay thế quan trọng có kiểm tra exact occurrence count; thiếu hoặc trùng anchor ném `UI_ONLY_PRESENTATION_ANCHOR_DRIFT`, không sửa mơ hồ. Không đưa replacement vào shared production source. Module không tự startup/network.

## 3. Safety và charts aggregation

`mvp-ui-only-api.cjs`, readonly adapter, historical record definitions, worker/runtime/supervisor/launcher, command policy, schema, firmware và production source không đổi so với rev7. Controls vẫn dựa vào actual disabled runtime policy; không biến trạng thái UNKNOWN thành OFF/ON, không thay đổi handlers để gửi command.

Existing chart bucket implementation giữ nguyên byte/hash.17new tests có case kiểm tra ba mẫu HUM72.5/72.3/72.4 gộp một bucket2h,mean72.4/count3/epoch đúng,zero writes. Test dùng synthetic in-memory rows qua guarded fake datasource; không đọc database thật hoặc tạo telemetry. Không sửa aggregation vì một điểm hiển thị đại diện ba readings.

**SOIL_SENSOR_QUALITY_BLOCKED** và **AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED** giữ nguyên.

## 4. Offline component và regression evidence

Các test mới render actual transformed Layout, DeviceDetail và Reports bằng React static rendering với inert hooks/services; actual label modules/card được transpile/load, không gọi network/browser. Bao phủ:

- Banner đúng main/content margin ở sidebar expanded/collapsed; chỉ một banner, wrap text, role alert, đủ warning; absent/ambiguous anchors bị từ chối.
- Dedicated serve isolation; production config không dùng plugin.
- Ba trạng thái ONLINE/OFFLINE/UNKNOWN đều mang nhãn đã lưu/không LIVE; DeviceDetail giải thích current connection không verified, đủ bốn values/units/time/SOIL warning.
- Reports bỏ current-snapshot wording, giữ numerical counts; sensor section giữ null/unit/Vietnam timestamp.
- SOIL100 và missing/null giữ calibration warning, không default0.
- Dashboard chỉ thay count-note wording, không đổi polling/command logic.
- Actual pumpPresentation với controlEnabledfalse khóa cả canOn/canOff choOFF/ON/UNKNOWN.
- Bucket mean/count/epoch không thay; transformed TSX transpile không lỗi và shared production files byte-identical với rev7.
- Manifest8 lineage/membership/only-two-DEV-source changes/current test pins.

Tests có17case mới; các AN/AP auth/CORS/pre-frontend ordering/attestation, AI read-only/actual repository fake coverage/audit, command/MQTT/Automation deny/native approval/ownership/cleanup regressions vẫn được chạy trong final suite. Đây không phải visual browser E2E.

| Check | Kết quả thực tế | Native / evidence |
|---|---|---|
|Targeted UI-only suite|118/118 PASS,fail/cancel/skip0|Node19740 exit0;`build/phase-au-targeted-1793815897153/`|
|Final9related offline suites|**301/301 PASS**,fail/cancel/skip0|Node21944 exit0;`build/phase-au-regression-1793815923279/`|
|Backend typecheck|PASS|Node21812 exit0;`build/phase-au-backend-typecheck-1793815923360/`|
|Frontend typecheck|PASS|Node16060 exit0;`build/phase-au-frontend-typecheck-1793815923330/`|
|Node syntax plugin/test|PASS|native0 each|
|Final manifest/source/binary audit|PASS|native0;final regression `integrity.json`|

Backend command: `tsc -p backend/tsconfig.json --noEmit`. Frontend: `tsc -p frontend/tsconfig.app.json --noEmit --incremental false`. Transformed TSX additionally has syntax diagnostics checks and render tests; unchanged production typecheck alone is not substituted for DEV transform testing.

Final9 suites: ui-ai,ui-only-pin-audit,ui-only-supervisor,ui-only,ui-launcher-exit,edge-smoke-observer,edge-smoke-analysis,browser-startup-diagnosis,preflight-boundary. All under `acceptance-offline-guard.cjs`,test-concurrency1. Final regression completed `2026-11-04T18:12:20.4112821Z`; frontend typecheck18:12:20.4248463Z; backend18:12:14.1767862Z. .NET held process handles captured stdout/stderr/native completion with120s deadlines; outer tool completions0. No PASS based only on TAP stdout. No test failed during AU; an auxiliary rg with no matches returned1 after successful baseline checks, not a gate/test failure.

TAP SHA256: `ff4805b53300cf2fe4e75c5726d86b0128c0452b9a12bae23771848d9918c70d`.

## 5. Manifest revision8 / hashes

| Artifact | SHA256 |
|---|---|
|Exact rev7 snapshot / previousManifestSha256|`000b8bfce621851eeae4829a9618fa289d23358fc0d352387a852e48bad473b7`|
|Active revision8 manifest|`5fb515a8b55a634336752a5462c05143f2497f218e151988adfd5f8cdf0a83f4`|
|DEV presentation plugin|`c9b2eaff98aa7fc9c56061d64ba9b2caf83af8b92b13a2bc83a47f956145a546`|
|DEV sensor card|`9cba1ad3f45e36902a64b07ac3546dd0b06165f90b465b1601b16a129886b192`|
|Reviewed offline UI test|`6aabf7faf88bfd03726a3f41113f5c93fe1ab9c9360f44c37a2e22548b6e98f4`|

Version/purpose/schema preserved; revision8 previousManifestFile points to exact rev7 snapshot. Final audit at18:13:12.0260666Z verified **250/250source hashes**, exact runtime sourceFiles membership, **4/4runtime binaries** unchanged, **3/3listed test hashes**, canonical/no duplicate/no traversal/no reparse. Only two execution-source hashes listed above and one existing test hash differ from rev7. Runtime constants/pin object match actual runtime adapter. No manifest update to hide execution failure; manifest is source pins only, not live authorization.

## 6. No-live-actions record

PostgreSQL/API/frontend NOT_STARTED; Edge/Playwright NOT_EXECUTED; MQTT NOT_CONNECTED; DeviceCommand/ON/OFF0actions; Automation NOT_ENABLED. No production access, migrations/seed/restore, credentials read/reset/rotation, broker changes, firmware/ESP32 reset/flash, hardware/pump-power action. No approval consumption/attempt marker created for a live session.

Final read-only inspection: no DEVlisteners55433/55001/55173 and no test postmaster.pid. No current production flags or actual hardware status claimed from offline source tests. Offline HTTP regressions may use only the existing guard-owned ephemeral synthetic server, not actual API55001/frontend55173 or real DB. AS/AT records/images/verdicts remain unchanged; no fabricated screenshots or stored-reading modification.

## 7. Những mục còn phải nghiệm thu

- Banner full visibility at actual desktop/mobile widths, sidebar expanded/collapsed; screenshots must show start/end of warning. Structural SSR/CSS-class assertions do not prove pixel layout.
- New DeviceDetail and Reports labels rendered in real Edge; current physical connection must not be inferred from historical ONLINE.
- History table đủ3readings ×4sensors, exact values/units/timestamps; chart series for all4types and aggregation tooltip.
- Browser Network exact OPTIONS/GET zone latest-readings and sanitized payload/header evidence.
- Pump/Automation controls visually disabled in the actual dedicated session, without clicking them.

No new live UI acceptance is claimed. Existing AT DeviceDetail/TEMP images verify only their historical version. Source changes do not create a new browser PASS or resolve SOIL calibration.

## 8. Checklist ngắn cho operator — chỉ dùng sau phê duyệt phiên riêng

Không chạy các bước này trong AU. Dùng reviewed one-shot launcher/gates và bounded manual window của phiên được duyệt mới; không dùng lại AT approval.

1. **History ưu tiên trước:** mở `/sensors/history`, chọn đúng Farm/Zone, lần lượt TEMP/HUM/LIGHT/SOIL; chọn7ngày hoặc khoảng02/11/2026 chứa19:11:18,19:11:33,19:11:48UTC+7. Cuộn tới bảng; chụp mỗi sensor đủ3dòng, đơn vị và timestamp. TEMP30.2/30.2/30.2°C; HUM72.5/72.3/72.4%; LIGHT5/5/5lux; SOIL100/100/100% với warning. Tổng12, không yêu cầu tạo thêm dữ liệu.
2. **Charts:** chụp4loại/tooltip (có thể gộp cùng ảnh bảng để không vượt giới hạn3–10PNG của reviewed intake).30ngày thường resolution2h: ba readings gần nhau có thể thành một bucket,count3. Đối chiếu mean/min/max/count với bảng; HUMmean72.4,min72.3,max72.5. Fetch time “Lần đọc dữ liệu lịch sử” không phải measurement time. Không cần ép biểu đồ thành12points.
3. **DeviceDetail:** mở ESP32-GF-A-01 từ biểu tượng mắt; ảnh có đúng ID/Farm/Zone/4sensors, “Đã lưu…không LIVE”, giải thích MQTTtắt, lastSeen đã lưuUTC+7. SOIL100 phải có chưa hiệu chuẩn. Reports phải ghi bản ghi lịch sử, không snapshot hiện tại; Dashboard counts phải ghi đã lưu.
4. **Network:** EdgeF12→Network, bật danh sách trước khi điều hướng Dashboard, chỉ quan sát request Website tự gửi. Tìm `latest-readings` đúng zone; chụp OPTIONS204 (nếu có preflight)/GETstatus và JSONshape `{zone,sensors}` với type/value/unit/recordedAt. Xem status các alerts/actuators/automation reads nếu xuất hiện. Nếu chưa thấy OPTIONS, ghi NOT_VERIFIED, không suy từGET200 và không bypass cache/security bằng thao tác lạ.
5. **Warnings/controls:** ảnh banner đầy đủ trong content area, rõ historical/notLIVE/MQTTdisabled/memoryaudit/SOIL. PUMPUNKNOWN/unavailable/control-disabled và nútBật/Tắt disabled; Automation không bật. Không click để thử. Nếu một control có vẻ hoạt động, chụp và ghi FAIL, không thực thi.

Không chụp Authorization/request-login-body/token/password/cookie. Lưu PNG mới vào thư mục được cung cấp, báo từng mụcPASS/PARTIAL/FAIL/NOT_VERIFIED; không chỉ nói “được rồi”. Thiếu bằng chứng hoặc lỗi vẫn báo đúng thực tế, không retry/hotpatch/gia hạn để ép PASS. Sau window: bounded post-check và owned graceful cleanup như reviewed contract.

## 9. Rollback plan và kết luận

Rollback chỉ offline: reverse đúng thay đổi plugin/card/tests AU, kiểm tra source hashes against immutable rev7; hoặc phát hành revision mới được review sau revert. Không chỉ trỏ manifest về7 khi source vẫnAU. Không overwrite snapshot/history hoặc dùng stale execution plan. Không DB rollback cần thiết vì AU không truy cập/mutate DB. Chưa thực hiện rollback.

```text
PHASE AU RESULT
DEV-only source remediation: OFFLINE_PASS
Historical banner layout: STRUCTURAL_COMPONENT_PASS; BROWSER_NOT_VERIFIED
Historical device/report labels: OFFLINE_PASS
Sensor timestamp/units/null/SOIL warnings: OFFLINE_PASS
Pump/Automation deny regressions: PASS
Charts aggregation: UNCHANGED
Offline tests: 301/301 PASS
Backend typecheck: PASS, native0
Frontend typecheck: PASS, native0
Manifest revision8: 250/250 PASS
Runtime binary pins: 4/4 PASS
Real PostgreSQL/API/frontend/Edge: NOT_STARTED
MQTT/DeviceCommand/ON/OFF: 0 ACTIONS
SOIL_SENSOR_QUALITY_BLOCKED
LIVE_UI_ACCEPTANCE_NOT_PERFORMED
OFFLINE_PRESENTATION_REMEDIATION_PASS
```

**STOP after Phase AU. Không tự bắt đầu phiên nghiệm thu mới.**
