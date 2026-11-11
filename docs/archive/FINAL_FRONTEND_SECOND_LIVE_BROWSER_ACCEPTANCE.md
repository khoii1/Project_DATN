# Second supervised historical DEV Website acceptance

06/11/2026, UTC+7. **FRONTEND_UI_BLOCKED**.

Phiên mới đã vượt trusted READY với policy7 fields, mở đúng một Edge và đăng nhập Website thành công. Giao diện mới được quan sát một phần; có assertion failures, History step timeout và22 HTTP GET bị allowlist chặn nhưng path đã redacted. Không đủ điều kiện nghiệm thu network/UI. Browser/native cleanup, DEV shutdown và DB/source postchecks đều PASS. Không sửa source, retry hoặc mở phiên thứ ba.

## 1. Genuine new approval và attempts

Current approval:
`C:\Users\Acer Swift3\.codex\attachments\405a3c9a-7285-4f28-af86-64cbc4f3aaaa\Pasted text.txt`

SHA256: `c4938ca61eaf21f435c269535da5939410442287d1e34d79ae8f1f6a846d3c56`.

Phạm vi: một **new** supervised historical DEV Website session, max600s, một Edge launch, secure Website credential reuse và verified-owned cleanup. Không production/MQTT/DeviceCommand/Pump/Automation.

Historical approval `78ac0324-f3a1-4a44-9697-149e1b3eb291`, SHA256 `b4433afd742e406e50638aca422e56fbcfd42181e4bf71c04801c9fea4179022`, vẫn **1/1 consumed**, browser0/1. Không reuse historical plan/marker.

Current session **1/1 consumed**; current browser **1/1 launched**. Không dùng thời gian còn lại để mở browser hoặc session khác.

Private plan directory:
`C:\DATN\test-instances\phase13-3b\ui-only-plan-1793980377123-0859593598bf`

Plan SHA256: `8611df7cd20f66cd3fe7a9c853f2969719150b7f091996b0ac57b82cefdb887d`.

Runtime:
`C:\DATN\test-instances\phase13-3b\ui-only-historical-1793980687347-42395aaad839`

New consumed marker:
`C:\DATN\test-instances\phase13-3b\ui-only-approved-c4938ca61eaf21f435c269535da5939410442287d1e34d79ae8f1f6a846d3c56.attempt.json`.

Browser native/evidence directory:
`C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke\edge-remediation-run-3eb539ddf1fd91372b04969391d85310`

Plan directory/file owner và protected sole-operator DACL đã kiểm tra theo launcher. Operator SID `S-1-5-21-1432835263-483988321-3159128977-1001`. Không đổi production/root ACL hoặc lấy credentials từ chat.

## 2. Fresh source-lineage và actual READY

Trước startup, đối chiếu exact installed hashes rồi dùng installed strict authority:

| Artifact | SHA256 verified |
|---|---|
| REV10 | `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb` |
| Supervisor | `b7d62547db2b8bd10b49fcd82a33f98cdea7d6623177ea21e433396ba7a5e0b2` |
| Runtime | `ad31e89eba5980c792c72a5afc4594ed8c8a89ade7f6195bf8678368664f1e83` |
| Bridge | `f09b5c89f8278e3c27d49067b7ffe25fdb759e808eb6a231ebb1d228b26d49d1` |
| Strict core | `2e9458917803299c554606b663bd8cbccc4cce2a6c50437bf7f2e9233a044ba1` |
| Filesystem verifier | `7648683938e3c4ddcc59073b6fd9e6adaf502d597305c93affc1658c9dc6f605` |
| Bootstrap | `dcea627f8d6fbc4802be437a21cae1b429da722942bdf0788461eaa1d331c22a` |
| New descriptor | `c634f044958c4684420d957c1adea23bed2d7e5125d4b05fdd757d2f4061c79d` |

248 unchanged REV10 +2 approved Supervisor/Runtime replacements, exact catalogue250, supplemental16/runtime4/offline4/Edge-Playwright4 PASS. Historical authority b3/4f được kiểm tra qua parent bindings. No owner/canonical/reparse/hash drift. Raw old REV10 source differences vẫn chỉ hai replacements đã được duyệt; không sửa manifest hoặc repin.

Fresh plan binding đúng supported contract,600s, `AUTOMATED_BROWSER`, one-launch/no-retry, source lineage độc lập và genuine new execution reference. Launcher `--check-plan`: native exit0. Existing launcher `mvp-ui-only-session.ps1` được dùng nguyên trạng.

Actual API/Worker policy đi qua reviewed lifecycle, không thay bằng fixture:

```js
{
  commands: false, automation: false, testMode: true,
  maxRunSeconds: 1, mqtt: 'disabled',
  audit: 'DEV_MEMORY_ONLY', data: 'HISTORICAL_PHASE_Y'
}
```

Bridge exact7-field assertion đã PASS trước khi issue branded READY/browser session. Source/runtime, owned child handles/listeners, actual SQL snapshot và CORS/auth gates cũng được kiểm tra. Không dùng ready=true tự khai hoặc bỏ audit/data fields. Lỗi policy5/7 trước đây không tái hiện trong phiên này.

## 3. Actual DEV startup và authentication

Preflight evidence:
`C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793980694422-5871d9`.

Đúng DEV PostgreSQL17 tại127.0.0.1:55433; SystemID `7698826681383327460`; PGDATA `C:\DATN\test-instances\phase13-3b\data`. Before-start cluster identity/ownership/native outcomes/NTFS/listeners được existing preflight chấp nhận. Không initdb, migration, seed hoặc restore.

Actual PostgreSQL verification:

- Database `smart_agriculture_mvp_dev`, role `sa_mvp_dev_app`, public schema.
-11 expected migrations/checksums,8 frozen identities,12 historical readings và units được snapshot validator chấp nhận trước và sau.
- READ ONLY **6/6** single/concurrent/batch/callback/nested/repository. Concurrent connections PIDs23088/1780; transaction_read_only=on, đúng database/role/port/schema.
- API PID12492/port55001; frontend PID19232/port55173. Actual owned serving-process readiness PASS.
- OPTIONS login204/read204 PASS với structured CORS checks; one direct API login200 PASS, identity/token-returned/memory-audit/Origin checks đạt.

Người dùng nhập credential Website DEV qua Get-Credential tại máy. Prompt không dùng DB/MQTT credential; handoff chỉ transient stdin. Không gửi password qua chat/CLI/env/file, không export JWT/cookies/HAR/storageState/trace.

Browser login được xác minh **riêng**: actual POST `/api/auth/login`200, authenticated `/api/auth/me`200, adapter chờ `/dashboard` và ảnh thật hiển thị Dashboard sau auth. Không suy browser login từ direct API gate.

## 4. Real Edge/native timeline

Thời gian UTC+7,06/11/2026:

| Event | Time/result |
|---|---|
| DEV preflight |22:58:14.422–22:58:18.426, PASS |
| Cluster start |22:58:18.427–22:58:19.346, pg_ctl PID11272 exit0 |
| SQL verification |22:58:20.826–22:58:22.009, PASS |
| API ready |22:58:29.544 |
| CORS/direct auth complete |22:58:29.995 |
| Frontend ready |22:58:36.961 |
| Trusted browser session issued |22:58:47.610; deadline23:08:47.610 |
| Edge native spawn request |22:58:51.092 |
| Edge owned handle |22:58:51.107, PID24036, parent worker11488 |
| Edge OS exit |22:59:33.3294260, exit0 |
| Worker OS exit |22:59:34.3760915, exit3 |
| Independent native reconciliation |22:59:38.573, remaining0, exit0 |
| DB post-verification |22:59:38.580–22:59:38.622 |
| Frontend/API shutdown |22:59:41.759–22:59:42.259, exits0 |
| DEV cluster stop |22:59:42.259–22:59:42.452, pg_ctl PID17492 exit0 |
| Launcher native exit |22:59:44.2011674, PID3172 exit3, OS ExitTime VALID |

Provider: Edge156/playwright-core1.62.1 với approved executable/library pins, Windows known-folder allowlist, private userDataDir/TEMP, sandbox enabled, serviceWorkersblock và debugging pipe. Không personal Edge profile, fallback, browser/dependency installation hoặc alternate browser.

Native events ghi đúng **one spawn request/owned handle**, Edge native exit0. Worker/host/supervisor/launcher exit3 phản ánh nghiệm thu không đạt; không mask nonzero thành PASS. Host không timeout toàn phiên, giữ11 independent handles. Actual closeCalls1.

## 5. Actual route/responsive coverage

Ký hiệu: P=PASS theo adapter cell assertions; F=FAIL; PA=PARTIAL; NV=NOT_VERIFIED. Không có nghĩa full WCAG hoặc mọi optional state đã được thử.

| Route |1440|1024|768|390|375|
|---|---|---|---|---|---|
| `/login` |P|P|P|P|P|
| `/dashboard` |F|F|PA|PA|PA|
| `/sensors` |F|F|P|P|P|
| `/sensors/history` |NV¹|NV|NV|NV|NV|
| `/devices/:deviceId` |NV|NV|NV|NV|NV|
| `/irrigation` |NV|NV|NV|NV|NV|
| `/reports` |NV|NV|NV|NV|NV|
| `/settings` |NV|NV|NV|NV|NV|
| `/devices` |NV|NV|NV|NV|NV|
| `/farms` |NV|NV|NV|NV|NV|
| `/farms/:farmId` |NV|NV|NV|NV|NV|
| `/zones` |NV|NV|NV|NV|NV|
| `/zones/:zoneId` |NV|NV|NV|NV|NV|
| `/crops` |NV|NV|NV|NV|NV|
| `/alerts` |NV|NV|NV|NV|NV|
| `/activity-logs` |NV|NV|NV|NV|NV|
| `/users` |NV|NV|NV|NV|NV|
| `/forbidden` |NV|NV|NV|NV|NV|
| Unknown/404 |NV|NV|NV|NV|NV|

¹ History1440 ghi error category `DEADLINE`; các cells sau không được kiểm tra.

Tổng95 cells: **8 PASS,4 FAIL,3 PARTIAL,80 NOT_VERIFIED**.15cells đã có render/route/layout PASS trên3 page types, nhưng không nâng thành15 full cell PASS. Chỉ Login đạt cell PASS đủ5 widths; **1/19 route có toàn bộ5 cell PASS**,3/19 có basic render observations.

Dashboard1440/1024 và Sensors1440/1024 có `ASSERTION_OR_BROWSER_ERROR` sau một số checks đã PASS. Message/stack được adapter redaction thành category, nên chưa xác định exact failed locator/assertion; không tự kết luận lỗi production UI hoặc screenshot capture là root cause.

Dashboard historical/banner observations đạt; mobile screenshot thể hiện banner đầy đủ và API connected. Clipping/occlusion của Dashboard390/375 còn NV. Focus-visible/accessibility-name observations của các cells đã đo được giữ riêng; keyboard/dialog/empty/loading/error states chưa đủ coverage. Không gọi đây là accessibility acceptance đầy đủ.

Discovery đã điều hướng đọc `/devices`, `/farms`, `/zones`, nhưng không có completed matrix cells cho chúng. Không tính discovery navigation là full route PASS. Dynamic IDs không được thay bằng synthetic hardcoded IDs.

Redirect `/` được ghi **FAIL**. Vì phép kiểm tra đọc pathname ngay sau domcontentloaded, thiếu detailed transition trace để phân biệt timing của redirect với functional navigation defect; không tự đổi recorded FAIL thành PASS.

## 6. History/Charts và timeout

TEMP/HUM/LIGHT/SOIL đều **NOT_VERIFIED**, reason `OBSERVED_SENSOR_LINK_MISSING`. Generic History1440 sau đó gặp `DEADLINE`; chưa có actual3 rows/type,4 charts/tooltips/statistics/aggregation/filter-change evidence.

Đây **không phải** hết600giây: worker/native observation khoảng44.6giây, actual browser lifecycle khoảng51giây trước cleanup; session deadline còn nhiều phút. Reviewed adapter dùng cùng `ACCEPTANCE_DEADLINE` category cho per-step bounded timeout (default8s) và tổng deadline. Không có per-step exception detail để chốt exact blocking locator. Không tự tăng timeout, thêm fallback selectors, navigation lại hoặc chạy thêm session trong lượt này.

12 frozen readings PASS ở PostgreSQL **không thay thế** browser history/chart evidence. SOIL calibration/quality vẫn BLOCKED; không sử dụng SOIL100% lịch sử làm căn cứ tưới.

## 7. Network và console — acceptance blocker

Actual browser network inventory:

- **114 accepted API responses**, gồm1 POST login và113 GET; tất cả response đã ghi có status200.
- Browser POST login200 và GET latest-readings200 (**3 observations**) PASS.
- Browser OPTIONS: **NOT_OBSERVED**; startup OPTIONS204/204 là bằng chứng riêng, không giả thành browser-observed OPTIONS.
- **22 HTTP GET bị request allowlist chặn**, path=`REDACTED_PATH`, statusnull. Chưa biết chính xác URL/origin/resource category từ evidence đã redacted.
- `consoleErrors=20` ngoài expected-HMR category; `expectedHmrErrors=20` được ghi riêng. Không gộp40 thành zero-error hoặc giải thích mọi lỗi là HMR. `pageErrors=0`.

Read-only boundary đã chặn các GET không được phép, không có accepted CRUD/command writes trong inventory. Nhưng **network acceptance BLOCKED** theo yêu cầu user: có request denial chưa được phân loại, không đủ bằng chứng rằng đây chỉ là assets hợp lệ bị chặn nhầm. Không tự bỏ guard, thêm allowlist hoặc gọi các denied URLs để kiểm tra lại.

HTTP denied22 là mảng riêng với WebSocket/HMR policy; không được coi chúng là cùng20 expected HMR errors. Cần review offline request classification/allowlist evidence trước một phiên mới. Browser background OS networking không được chứng minh network-isolated bởi page routing.

Supervisor summary `AUTOMATED_UI_PARTIAL` chỉ là lifecycle envelope. Browser evidence status là `FAIL`; report final dùng **FRONTEND_UI_BLOCKED** vì assertions và network acceptance chưa đạt, không nâng verdict dựa trên cleanup thành công.

## 8. Screenshot thật

**1/10** captured, không có ảnh từ phiên cũ hoặc synthetic image.

| File | Route/viewport | Dimensions/size | SHA256 |
|---|---|---|---|
| `mobile.png` | Dashboard,390×844 |390×844;40930bytes |`5a1b33aafb5c477ded7b539239d2e5af796c8d9c0db22322db471f45a617648e`|

[Mở ảnh Dashboard mobile](</C:/Users/Acer Swift3/AppData/Local/SmartAgricultureBrowserSmoke/edge-remediation-run-3eb539ddf1fd91372b04969391d85310/mobile.png>).

PNG signature/dimensions/byte size/SHA256 đối chiếu actual file với browser capture metadata PASS. Agent đã xem ảnh: Dashboard authenticated, historical/SOIL warning, API connected, không có password/token. Route association dựa trên fixed `dashboard/390 → capture('mobile')` call và ảnh thật; capture receipt không có raw URL riêng, nên không giả có URL receipt mà provider chưa ghi.

Chín slots khác không được chụp. Không chụp login/password hoặc tạo ảnh thay thế cho các pages chưa nghiệm thu.

## 9. Native cleanup, DB/source postchecks

Browser close barrier **CLOSED/verified** trước DB postcheck. Native receipts:

- Worker11488 exit3, Edge24036 exit0; held handles/signaled/owners và OS ExitTime VALID.
- Owned tree remaining0, foreignProcessesTargeted0, host cleanupPass=true.
- Journal có `IDENTITY_REFUSED` cho một số transient PIDs; không force-kill các identity không xác minh được. Independent reconciliation kiểm cả unknown IDs14968/21152/8612 và captured tree: remaining0, exit0; private profile matches0 theo provider assertion.
- Không còn unresolved owned browser processes. Không retry launch hoặc fallback.

Sau barrier, supervisor thực hiện DB snapshot và source checks rồi mới stop frontend/API/cluster. DB bounded digest trước và sau:

`17bea009981099eae108d0450adda101faea28836094b2cee00376c5776b6e3b`

**Digest MATCH; persisted ActivityLog68→68**. Snapshot safety assertions tiếp tục chấp nhận commands0/PENDING0/enabledAutomation0/actuatorOn0 trong frozen DEV scope. Không coi bounded digest là toàn bộ production database audit.

Source postcheck: Supervisor completed post path không failure; independent installed strict verifier sau shutdown cũng PASS:248+2,helpers16, runtime/offline/browser pins và immutable authorities. Không source/manifest modifications.

Frontend/API stop exit0; DEV pg_ctl stop exit0; supervisor `STOPPED_GRACEFULLY`. Independent final check: listeners55433/55001/55173=0, các recorded launcher/supervisor/API/frontend/browser host/worker/Edge PIDs đều không còn. Production services không restart hoặc thay đổi.

## 10. Evidence và security handling

Private browser directory giữ actual `browser-result.json`, PNG, native events/owner receipts, environment receipt, held-handle completion và cleanup journal. Runtime directory giữ `summary.json`, automated host/reconciliation/evidence và supervisor native exit.

Plan directory bổ sung:

- `fresh-source-proof.json`, `final-source-proof.json`.
- `browser-acceptance-inventory.json`: actual95-cell matrix,4 history statuses, screenshot inventory và safe network facts.
- `postcheck-summary.json`, `cleanup-independent.json`, launcher held-handle receipts.

Structural scan của browser evidence không có password/JWT/token/Authorization/Cookie/storageState payload keys. Network chỉ ghi method/safe path/status, console chỉ counts/category; không raw headers/bodies. Không export browser auth profile/storage files. Đây là scope kiểm tra evidence đã xuất, không forensic guarantee zero secrets trong mọi browser memory.

Không operatorAttested=true, fake screenshots, record creation, fixture/data mutation, DeviceCommand, MQTT, Pump ON/OFF hoặc automation enablement. Không migration/seed/restore/initdb, credential rotation, firmware/reset hoặc source fix trong phiên.

## 11. Remaining blockers và next action

Phiên thứ hai đã dùng **1/1 Website,1/1 browser**. Không thêm lượt.

Các blockers cần **offline review riêng**:22 denied GET classification với telemetry redacted an toàn; exact context của4 assertion failures; sensor-link discovery; History per-step timeout; root redirect observation timing. Cần phân biệt harness/selector/timing defects với actual UI defects trước khi đề xuất patch. Không tự chỉnh source, policy hoặc kéo dài session trong báo cáo này.

Không cần mở thêm infrastructure/migration để giải thích các bằng chứng trên. Một phiên real browser mới chỉ được xem xét sau review/fix/lineage hợp lệ và approval mới riêng. Source READY7-field đã hoạt động; không quay lại sửa API response5 fields hoặc nới READY validation.

## 12. Final summary

```text
SMART AGRICULTURE — SECOND WEBSITE ACCEPTANCE
New authorization: APPROVED
Historical Website attempt: 1/1 CONSUMED
New Website session: 1/1
New browser launch: 1/1
Effective source-lineage: PASS
READY 7-field contract: PASS
DEV preflight: PASS
PostgreSQL READ ONLY: PASS (6/6)
CORS/Auth: PASS (startup + actual browser login)
Frontend READY: PASS
Edge Playwright: PASS (launch/context/auth; UI assertions not complete)
Authenticated browser: PASS
Routes verified: 1/19 full five-cell PASS; 3/19 basic render observed
Responsive cells verified: 8/95 PASS;4 FAIL;3 PARTIAL;80 NOT_VERIFIED
History/Charts: PARTIAL (all four NOT_VERIFIED)
Screenshots: 1/10
Read-only network: BLOCKED (22 unclassified denied GETs)
Browser cleanup: PASS
DEV cleanup: PASS
Database postcheck: PASS (bounded scope)
Source postcheck: PASS
MQTT commands: 0
DeviceCommand writes: 0
Pump ON/OFF: 0
Automation enabled: NO
FINAL: FRONTEND_UI_BLOCKED
```

STOP sau evidence/report. Không sửa code, retry, fallback hoặc phiên thứ ba.
