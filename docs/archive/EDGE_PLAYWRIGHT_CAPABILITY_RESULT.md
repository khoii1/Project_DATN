# Edge Playwright capability result

06/11/2026 (UTC+7). **EDGE_PLAYWRIGHT_CAPABILITY_BLOCKED**.

Đã dùng đúng **1/1 browser launch attempt**. Edge process được tạo nhưng Playwright timeout trước khi trả context/page. Không retry, không đổi browser hoặc launch flags sau lỗi. **Cleanup chưa hoàn tất; có owned processes còn chạy tại lần đọc cuối.**

## 1. Approval và preflight# SMART AGRICULTURE — SAFE EDGE PROCESS CLEANUP

**Workspace:** `C:\DATN\Project_datn`

**Authorization:** USER APPROVED — CLEANUP OF VERIFIED OWNED PROCESSES ONLY

**Mode:** TARGETED PROCESS CLEANUP / NO BROWSER RELAUNCH

## 1. Mục tiêu

Dọn dẹp an toàn các tiến trình Node và Microsoft Edge còn sót từ lượt `EDGE_PLAYWRIGHT_CAPABILITY_BLOCKED`.

Không sửa frontend, manifest, launcher, browser configuration hoặc các thành phần khác.

Đây là quyền cleanup riêng, không phải phê duyệt chạy lại smoke test.

## 2. Evidence gốc

Đọc báo cáo:

`docs/EDGE_PLAYWRIGHT_CAPABILITY_RESULT.md`

Private run:

`C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke\edge-capability-1793934788305-b063f271`

Process identities lịch sử:

| Process | PID | OS creation UTC |
|---|---|---|
| Node smoke | 19068 | 2026-11-06T03:17:49.6704907Z |
| Edge root | 19708 | 2026-11-06T03:17:51.0849419Z |

Node parent lịch sử: 17896.

Edge root parent lịch sử: 19068.

Direct Edge child PIDs lịch sử:

`17824, 10592, 20784, 22060, 17400, 23020, 19424, 15824`

**Những PID này chỉ là dữ liệu lịch sử, không phải bằng chứng các tiến trình vẫn tồn tại hoặc vẫn thuộc lượt smoke tại thời điểm cleanup.**

## 3. Bắt buộc xác minh trước khi dừng

Dùng Windows process APIs/CIM với quyền hiện tại để kiểm tra:

- Actual PID.
- Executable path.
- OS creation time.
- ParentProcessId.
- Process owner/SID.
- Process command line nếu đọc được.
- Private `user-data-dir`/profile.
- Process tree quan sát thực tế.
- Đối chiếu với saved evidence và exact timestamps.

Với Edge root, cần xác nhận đồng thời executable, PID, thời điểm tạo, parent và private profile đã được dùng trong lượt smoke.

Với từng Edge child, phải xác minh nguồn gốc từ Edge root bằng quan hệ parent-child và creation time, đối chiếu saved evidence. Nếu thiếu dữ liệu để xác nhận chắc chắn, không được kết thúc tiến trình đó.

Với Node, xác minh đúng executable, PID, creation time, parent và quan hệ với smoke script/private run.

Nếu PID đã thoát hoặc bị Windows tái sử dụng, ghi `ALREADY_EXITED` hoặc `IDENTITY_MISMATCH`, không tác động.

Nếu không thể xác minh ownership, ghi `UNKNOWN` và bỏ qua.

## 4. Cleanup an toàn

Chỉ thực hiện với những process đã được xác minh chắc chắn thuộc lượt smoke.

1. Tạo snapshot read-only trước cleanup.
2. Thử graceful close nếu tiến trình có cơ chế đóng hợp lệ và được xác định đúng ownership.
3. Quan sát exit với timeout hữu hạn.
4. Nếu vẫn tồn tại và không thể graceful close, được phép force terminate **chỉ đúng PID đã xác minh** theo phê duyệt hiện tại.
5. Kiểm tra lại PID, executable và creation time ngay trước mỗi hành động dừng để tránh PID reuse.
6. Xử lý theo dependency của process tree; không vô tình kết thúc Agent host hoặc observer không thuộc phạm vi.
7. Ghi native exit nếu quan sát được, hoặc ghi `TERMINATED_CONFIRMED`/`UNKNOWN` đúng bằng chứng.
8. Kiểm tra lại toàn bộ owned tree sau cleanup.

Không dùng:

- `taskkill /IM msedge.exe`
- `taskkill /IM node.exe`
- `Stop-Process -Name msedge`
- `Stop-Process -Name node`
- Lệnh kill toàn bộ process tree chưa được xác minh từng thành viên.

Không dừng Edge cá nhân, Chrome, VS Code, Agent hoặc process không xác định.

Không coi exit code của lệnh kill là bằng chứng duy nhất rằng mọi process đã kết thúc.

## 5. Giữ nguyên evidence

Không xóa private run, profile, logs, attempt marker hoặc evidence lịch sử trong bước này.

Lưu cleanup evidence mới bằng file create-new, gồm:

- Snapshot trước/sau.
- PID/creation/owner/parent đã kiểm tra.
- Phương thức dừng của từng process.
- Thời điểm và native completion nếu có.
- Danh sách process đã thoát.
- Danh sách chưa thể xác minh hoặc chưa thể dừng.

Không ghi raw command line chứa thông tin nhạy cảm; chỉ lưu metadata cần thiết và đường dẫn profile đã được kiểm tra.

## 6. Safety restrictions

KHÔNG:

- Launch Edge lần nữa.
- Chạy Playwright smoke mới.
- Khởi động Website DEV.
- Khởi động PostgreSQL/API/Frontend.
- Kết nối MQTT.
- DeviceCommand, Pump ON/OFF, Automation.
- Sửa source/runtime/manifest.
- Đổi Windows settings, environment, firewall hoặc sandbox.
- Xóa dữ liệu của process khác.
- Tự bắt đầu phase chẩn đoán browser tiếp theo.

Active manifest Revision 10 phải giữ nguyên:

`47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`

Website live attempt vẫn **0/1**.

## 7. Báo cáo

Tạo:

`docs/EDGE_PLAYWRIGHT_SAFE_CLEANUP_RESULT.md`

Trả về:

```text
SMART AGRICULTURE — EDGE CLEANUP

Authorization: APPROVED

Historical Node PID: 19068
Historical Edge root PID: 19708
Historical Edge child count: 8

Process identities verified: X
Already exited: X
Gracefully closed: X
Force terminated: X
Skipped due to unknown identity: X
Still running (verified owned): X

Owned process tree remaining:
[Exact verified state]

Foreign processes affected: 0

Active manifest: REV10 UNCHANGED
Frontend source: UNCHANGED
Website live attempts: 0/1
New browser launches: 0
PostgreSQL/API/Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED

FINAL:
EDGE_OWNED_PROCESSES_CLEANED
or
EDGE_CLEANUP_PARTIAL
or
EDGE_CLEANUP_BLOCKED
```

Chỉ trả `EDGE_OWNED_PROCESSES_CLEANED` khi toàn bộ tiến trình thuộc lượt smoke đã được xác minh không còn chạy và không tác động tiến trình khác.

**Thực hiện cleanup trong phạm vi được phê duyệt, lưu bằng chứng và STOP.**

- Approval thật: attachment `76d31ff0-d172-4bbf-8691-14eb5367d29a/Pasted text.txt`, scope one Edge `about:blank` capability smoke.
- SHA256 approval: `f1c5de8586adfb2d0fdd4eb97376aa152691d9e1cb0bc17eb8021cfd4fae4ce0`.
- Edge executable: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, version **156.0.4314.58**.
- Edge SHA256 trước/sau: `d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b`.
- Installed `playwright-core`: **1.62.1**. Package SHA256 `07c47543631fef9508760365dee9fbe958c562093ec8d122543949ed231f233f`; `lib/coreBundle.js` SHA256 `9393fa79e1c67c74edc26b610d65a4f7ed73d345a762465cc88340a33a2454ac`.
- Active manifest rev10 SHA256: `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`.
- 250 source/4 runtime/4 offline-test pins kiểm tra trước và sau đều khớp. Không sửa source, dependencies hoặc manifest.

Tên `.ps1` thực tế của smoke cũ là `scripts/mvp-edge-smoke-once.ps1`; không có `scripts/mvp-edge-smoke-observer.ps1`. Đã đọc cả launcher thực tế, observer `.cjs` và phân tích AB/AC trước execution.

Observer cũ chưa đọc DOM/chụp ảnh, chưa có independent OS-handle completion và cap combined output đúng contract mới. Theo quyền chuẩn bị file-based smoke tối thiểu, tạo hai helper **chỉ trong private run**, không chỉnh scripts dự án. Tái sử dụng native spawn/one-shot/no-force-kill boundary đã review từ observer cũ; không dùng lại approval cũ.

## 2. Private run và source hashes

Run:
`C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke\edge-capability-1793934788305-b063f271`

Base/run/profile/TEMP directories đã kiểm tra owner operator, protected DACL chỉ operator FullControl, no reparse; không sửa ACL của thư mục hiện hữu. Files trong run kế thừa quyền private. Không dùng profile Edge cá nhân.

| Source | SHA256 |
|---|---|
| Private `smoke.cjs` | `61e6613202d7cb7aae9d7112079ea6c421d77b9fcf46d82d29229c8f665aeee3` |
| Private `run-once.ps1` | `2df5f98a50fd13640b812cf0e233e3d025dd6c4e8e2fdbd0806c552992e4fc64` |
| Reused `scripts/mvp-edge-smoke-observer.cjs` | `ab8afa61f54471ba16a224c9be71a9c4e3ecd1f6c4c854c1182b74e200b4b137` |
| Existing launcher, đọc/review nhưng không chạy | `9ad40553e7b3cdae9ec1af04b08cdef6ddd53e2e1c1d05dbf8009fa4657f69ae` |

Fake-browser tests **5/5 PASS, native exit0**, kiểm tra success/one-launch/about:blank-only flow, launch/navigation/screenshot failures không retry và timeout không tạo launch thứ hai. Node syntax/PowerShell AST PASS. Tests không launch Edge hoặc tạo screenshot giả trên đĩa.

Approval/preflight/source pins lưu `preflight.json`. Fresh approval marker create-new nằm ở private base:
`edge-approved-f1c5de8586adfb2d0fdd4eb97376aa152691d9e1cb0bc17eb8021cfd4fae4ce0.attempt.json`.
`attempt.json` trong run ghi Node PID và maximumLaunches=1 trước lời gọi browser.

## 3. Exact launch configuration

Chỉ gọi một lần `chromium.launchPersistentContext` với:

```text
executablePath: C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
userDataDir: <private run>\tmp\user-data
headless: true
chromiumSandbox: true
viewport: 1280 × 720
serviceWorkers: block
timeout: 18000ms
handleSIGINT / handleSIGTERM / handleSIGHUP: false
```

Browser environment đóng: chỉ SystemRoot/WINDIR/PATH, TEMP/TMP và USERPROFILE/APPDATA/LOCALAPPDATA trỏ các private directories. Không truyền credentials/JWT/DB/MQTT variables.

Không có custom `args` hoặc `ignoreDefaultArgs`, không `--no-sandbox`, không CDP TCP endpoint. Actual arguments do Playwright sinh có `--user-data-dir=<private run>\tmp\user-data`, `--remote-debugging-pipe`, `about:blank`; lưu nguyên trong `browser-arguments.json`, SHA256 `d9719783741c71268fe4c448ce389860ca87bff8ca3431127a21e775d1f9fa30`.

Node flow deadline25giây; independent parent watchdog30giây. Captured Edge diagnostics budget49,152 bytes, Node8,192 bytes, chừa dung lượng cho outer metadata trong tổng giới hạn65,536 bytes. Thực tế combined Edge/Node stdout+stderr lưu **1,007 bytes**, không capped; không lấy stdout marker làm native completion.

## 4. Actual process và failure evidence

| Process / event | Kết quả |
|---|---|
| Parent observer | PID17896 |
| Node smoke child | PID19068, start `2026-11-06T03:17:49.6704907Z` |
| Edge root | PID19708, direct parent PID19068, start `2026-11-06T03:17:51.0849419Z` |
| Edge spawn | Một request/spawn; direct owned child handle ghi lúc `03:17:51.100Z` |
| Playwright | `TimeoutError`, launchPersistentContext vượt18,000ms; chưa usable context/page |
| Parent watchdog | Timeout; elapsed đo được **30,058ms** khi quan sát hết hạn, không báo deadline thực thi chính xác từng millisecond |
| Independent native handle | OS OpenProcess thành công và giữ handle độc lập với Node stdout/stderr |
| OS creation FILETIME | `134384086710849419` |
| OS exit FILETIME | **0**, trạng thái `INVALID_OR_INCOMPLETE`; không chuyển zero thành timestamp1601 hoặc coi là valid exit |
| Native exit Node/Edge tại deadline | **UNKNOWN/null**, không gán exit0 |
| Outer execution host | Exit1 do lượt smoke không hoàn tất thành công; không thay bằng stdout success |

`outcome.json`: launchAttempted=true, launch=false, page/navigation/DOM/screenshot/closed=false, failureStage=launch, spawnAttempts=1. `timeout=false` trong flow outcome chỉ là global25s-timer chưa fire: error thực tế là **Playwright launch timeout18s**; independent parent `timeout=true` ở30s. Hai trường này đo hai deadline khác nhau.

Thông báo thực tế trong Edge stderr:

- PathService key112: token không tồn tại, error `0x3F0`.
- `DevTools remote debugging requires a non-default data directory. Specify this using --user-data-dir.`
- `Unable to get local app data path.`
- Edge identity error `kTokenRequestFailed / kDLLInvalidAccountId`.

Arguments thực tế đã có private `--user-data-dir`; vì vậy không kết luận đơn giản rằng thiếu flag này. Các lỗi path/profile/token là hướng điều tra có bằng chứng, nhưng **root cause launch timeout chưa được chứng minh**. Không sửa environment, tắt sandbox, đổi flags hoặc chạy lần hai để thử giả thuyết.

Không có context/page trả về nên chưa đọc được URL, document title/readyState/documentElement. **Không có screenshot PNG**, không có screenshot hash và không tạo ảnh thay thế. Chỉ target argument `about:blank` được đưa vào launch. Page routing chưa được cài vì launch chưa xong; không tuyên bố browser background networking đã được cách ly tuyệt đối.

## 5. Cleanup — BLOCKED

Không có context để gọi graceful close. Tại deadline, held OS handle chưa signaled, Node/Edge chưa có exit được xác nhận, có8 direct Edge children.

Lần read-only postcheck `2026-11-06T03:23:06.7683270Z` (10:23:06 UTC+7) xác nhận:

- Node19068 còn tồn tại, đúng start time ở trên.
- Edge19708 còn tồn tại, đúng start time ở trên.
- Direct child PIDs:17824,10592,20784,22060,17400,23020,19424,15824.

Đây là một browser root launch với các process con, không phải8 launch attempts mới. Không Stop-Process/taskkill/force-kill hoặc attach process lạ. Parent đã đóng OS observation handle và kết thúc, không có retry. **Không báo cleanup PASS hoặc tất cả browser processes đã đóng.**

Cần xử lý riêng việc dừng owned process tree trên, phải revalidate PID/creation/parent trước thao tác để tránh PID reuse. Không tự thực hiện force cleanup sau điều kiện STOP của approval này. Chưa đủ điều kiện nghiệm thu Website.

## 6. Evidence và integrity

Trong private run giữ: `preflight.json`, `identity.json`, `attempt.json`, `edge-pid.json`, `native-events.jsonl`, `browser-arguments.json`, `edge-diagnostic.log`, `node-diagnostic.log`, `outcome.json`, `parent-native.json`, `postrun-process-check.json`, `post-integrity.json`, source và synthetic tests.

Outcome SHA256: `2a44ecef092e314100c9accd88d5c37a478c43b2ac7ca7b8671a089876f59c9e`.
Parent native SHA256: `7d730b9a64ce4ecc08dd98884f19a7afff31ca518b2d334f3b18bb5043a0c2ca`.
Edge diagnostic SHA256: `3d83a6617d965c7c27e1d9bb10bd527e4461fbca574176f926760c2192274d05`.

Integrity postcheck PASS: active manifest/hash và toàn bộ project pins, Edge/library/private smoke source hashes nguyên vẹn. Không sửa dependencies/firmware, không startup PostgreSQL/API/frontend, không mở localhost Website hoặc login, không query DB/MQTT, không DeviceCommand/ON/OFF/Automation.

## 7. Kết luận

```text
SMART AGRICULTURE — EDGE PLAYWRIGHT SMOKE
Authorization: APPROVED
Launch attempts: 1/1
Edge binary integrity: PASS
Playwright library: VERIFIED (installed version/hashes)
Launch: FAIL (OS spawn succeeded; Playwright launch timed out)
Protocol handshake: FAIL
about:blank navigation: NOT_EXECUTED
DOM read: NOT_EXECUTED
Screenshot: NOT_EXECUTED
Native completion: BLOCKED
Cleanup: BLOCKED (owned processes still present at postcheck)
Active manifest: REV10 UNCHANGED
Frontend source: UNCHANGED
Website live attempts: 0/1
PostgreSQL/API/Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
FINAL: EDGE_PLAYWRIGHT_CAPABILITY_BLOCKED
```

Approval smoke này đã tiêu thụ1/1. Dừng; không tự chuyển sang Website acceptance, không đổi execution path hoặc launch lại.
