# Final 19-page Website acceptance — offline preparation

06/11/2026. **AUTOMATED_ACCEPTANCE_ADAPTER_BLOCKED** ở bước nối lifecycle với supervisor; browser-only core và targeted synthetic tests đã hoàn thành. Chưa mở Edge/Website, chưa start database/API/frontend, chưa dùng Website attempt0/1.

## 1. Kế thừa và phạm vi

Đã đối chiếu `EDGE_PLAYWRIGHT_REMEDIATED_SMOKE_RESULT.md`, `AUTOMATED_FRONTEND_ACCEPTANCE_PREPARATION.md`, `FINAL_FRONTEND_UI_AUDIT.md`, `FINAL_DEV_WEBSITE_ACCEPTANCE.md`, actual AppRoutes/components và existing session/supervisor/runtime/auth/read-only gates.

Edge156.0.4314.58 + playwright-core1.62.1 đã **VERIFIED trong smoke trước**: launch/context/page/DOM/PNG, native exit0 và empty owned tree. Không dùng approval smoke đó cho Website. Thiết kế provider cho Website giữ Windows known-folder env allowlist8, private profile/TEMP, sandboxtrue, serviceWorkersblock, pipe/no TCP, một native launch, không retry/fallback. Không quay lại spoofed Windows profile env.

Không sửa Frontend, active manifest, dependencies, existing DEV launcher/supervisor/runtime, firmware hoặc production policy. Các file mới là preparation modules, không tự khởi động services/browser khi import và không có CLI live executor.

## 2. Source mới và responsibilities

| File trong `scripts/frontend-acceptance/` | Nội dung |
|---|---|
| `adapter.cjs` | Browser-only navigation/DOM assertions, discovery IDs qua links thật,95-cell matrix,4 sensor histories, screenshot quota, network observations, one open/close và deadline/cleanup contract |
| `contract.cjs` | Actual19 routes,5 viewport, checks khởi tạo NOT_VERIFIED và10 screenshot slots |
| `policy.cjs` | Exact DEV origins, HTTP read allowlist, exact login/logout POST, session/safety/deadline checks và evidence redaction |
| `credential-source.cjs` | Bounded15s UTF-8 stdin, dùng reviewed `mvp-credential-input.cjs`, không trim/normalize password |
| `credential-handoff.ps1` | Chỉ khai báo secure prompt→stdin function, không tự prompt/start khi load |
| `adapter.test.cjs` | Fake browser/request/stream/native receipt tests; không Playwright import hoặc real browser |

Adapter nhận supervisor session qua trusted binding callback, không nhận URL tùy ý hoặc coi một JSON có flags=true là proof. Contract bắt buộc đúng UI55173/API55001, REV10 hash, current supervisor/API/frontend identities, historical mode, MQTT/Commands/Automationfalse/cap1s, max1 launch và deadline≤600s. Provider ownership/cleanup callbacks đều bắt buộc; thiếu callback hoặc close barrier thì STOP trước open.

Adapter không sở hữu DB client, MQTT client, hardware gateway hoặc application startup. Không import các historical browser runners có mutation.

## 3. Read-only và credential handling

- Browser request chỉ tới `http://127.0.0.1:55173` và `http://127.0.0.1:55001`. UI chỉ GET/HEAD cho routed pages/Vite assets đã liệt kê. `.env`, package metadata, production5000, localhost alias, external origins, userinfo/encoded/traversal URLs bị chặn.
- API GET/HEAD có catalogue riêng, bám existing read routes; POST chỉ exact `/api/auth/login` và `/api/auth/logout`, không query. OPTIONS chỉ cho đúng read/login/logout methods; không tự gửi OPTIONS để ép evidence.
- Pump/DeviceCommand/ACTIVE/automation writes, DELETE/PATCH/PUT, unknown endpoints, live-evidence/shadow-preview và export download bị chặn. Không click Save/Delete/ON/OFF/Automation hoặc ACK cảnh báo.
- WebSocket interception phải có trước page; đóng toàn bộ WS, kể cả Vite HMR. HMR bị chặn là giới hạn có chủ đích trong phiên acceptance, không suy nó là lỗi MQTT. Service workers phải block ở browser provider.
- Network evidence chỉ method/path/status cho known API paths; không query, headers, body, Authorization, Cookie, JWT. Console/pageerror giữ counts/category, không raw message. Các buffers PNG là ảnh thật khi live được duyệt; không export storageState/HAR/trace.
- Website credential chỉ `owner-a@mvp.invalid`, Get-Credential tại máy, UTF-8 stdin có giới hạn8192bytes, không CLI/env/file. Không dùng PostgreSQL/MQTT password. Password Unicode/leading/trailing whitespace được giữ nguyên; buffers handoff được clear, JS strings chỉ giảm lifetime, không hứa zeroization tuyệt đối.
- Login screenshot bị từ chối; uncheck remember. Browser private profile có thể chứa dữ liệu xác thực do chính Web application/browser quản lý; adapter không sao chép/export các storage files này thành evidence. Private profile không phải network sandbox hoặc OS-account isolation.

Policy **PASS bằng synthetic tests**, chưa phải live network enforcement đã nghiệm thu Website.

## 4. Catalogue và coverage được chuẩn bị

| Route | Priority | Assertions/giới hạn |
|---|---|---|
| `/login` | P0 | Render5 viewport trước auth; submit một login hợp lệ, không chụp password |
| `/dashboard` | P0 | Render/path/overflow, historical/notLIVE/banner, disabled pump nếu có, network latest-readings |
| `/sensors` | P0 | Render/table; tìm sensorId từ history links có accessible code thật |
| `/sensors/history` | P0 | Range30d;4 sensor types,3 raw rows/type, units/MQTT/recorded/received time, UTC+7, historical/chart/bucket/SOIL warning |
| `/devices/:deviceId` | P0 | ID thật từ DEV links; historical wording, không current-live claim, linked sensor data |
| `/irrigation` | P0 | Historical/UNKNOWN và buttons/switches disabled nếu hiện; không tương tác controls |
| `/reports` | P0 | Render/historical wording; không export; count/aggregation sâu chưa tự đánh PASS |
| `/settings` | P0 | Render/read-only navigation, không Save |
| `/devices` | P1 | Render/list và discovery detail link |
| `/farms` | P1 | Render/list và discovery detail link |
| `/farms/:farmId` | P1 | Chỉ ID từ actual link; thiếu record thì NOT_VERIFIED |
| `/zones` | P1 | Render/list và discovery detail link |
| `/zones/:zoneId` | P1 | Chỉ ID từ actual link; thiếu record thì NOT_VERIFIED |
| `/crops` | P1 | Render/available empty state, không thêm crop |
| `/alerts` | P1 | Render/available states, không ACK/resolve/save rule |
| `/activity-logs` | P1 | Render; memory-only disclaimer thuộc lịch sử; không claim durable login audit |
| `/users` | P1 | Owner route phải về `/forbidden`; ADMIN-positive NOT_VERIFIED vì không có credential được duyệt |
| `/forbidden` | P1 | Render/path; nội dung403 cần đối chiếu ảnh/DOM thực |
| `*` | P1 | Dùng `/__acceptance_missing_route__`, render/path;404 không được giả định từ status HTTP200 |

Redirect `/` được kiểm tra riêng, không tính trang20. Discovery chỉ đọc `/devices`, `/farms`, `/zones` sau login; không hardcode IDs từ fixture hoặc đăng ký record mới. Sensor history không mặc định "today" vì12 readings là lịch sử02/11.

Matrix95 cells: **1440×1000,1024×900,768×1024,390×844,375×812**. Mỗi cell giữ riêng render/path/body overflow/historical/banner/unitsTime/controls/keyboard/navigation/states/visualClipping; không suy PASS từ route khác. Tab/Shift+Tab focus được ghi riêng; Escape được gửi nhưng dismissal chưa assertion thì NOT_VERIFIED. Mobile menu chỉ click nút Mở/Đóng navigation đã xác định; không click arbitrary buttons.

**Coverage PARTIAL, không phải full visual/a11y audit:** exact title/content của dynamic pages, chart tooltip/statistics/aggregation chính xác, missing/stale semantics theo từng card, desktop sidebar-collapse, dialog focus trapping/Escape dismissal, clipping/occlusion, empty/loading/error behavior chưa có complete assertions. Trạng thái thấy sẵn chỉ ghi observation; không giả fixture mới hoặc stop service để thử lỗi. Đặc biệt3 readings trong một2h bucket vẫn hợp lệ; adapter không sửa aggregation.

Code hiện giữ overall PARTIAL khi còn các check chưa được thực hiện; fake render đủ95 cells không biến cả matrix thành PASS. Muốn tuyên bố full19-page acceptance phải bổ sung/quan sát các mục còn thiếu trong scope trước khi chốt.

## 5. Screenshots và deadlines

Tối đa10 ảnh: Dashboard, TEMP/HUM/LIGHT/SOIL History×4, Device Detail, Irrigation, Reports, Settings, mobile Dashboard. Không ảnh Login. Tên allowlist, không overwrite/duplicate; sink tương lai phải create-new trong private run có ACL đã verify. Signature/dimensions/size/SHA256 được kiểm tra trên PNG buffer thật; không tạo ảnh nghiệm thu trong phase này.

Evidence matrix/Network/keyboard/console tách khỏi legacy operator-intake. `build/frontend-acceptance-prep-eea609de04644afc822a078d1434b4f3/planned-matrix.json` là **PLANNED_NOT_BROWSER_EVIDENCE**,95 cells đều NOT_VERIFIED; không chứa fake screenshot hoặc operator attestation.

Session≤600s, bound cả wall deadline và monotonic elapsed. Mỗi step≤8s; launch provider≤18s với18.5s caller bound; credential input≤15s. Dành45s trước supervisor deadline cho đóng browser, cleanup callback≤30s. Timeout dừng navigation tiếp; không mở browser thứ hai. Launch chưa trả context vẫn phải abort/observe provider-owned launch; cleanup unknown không được giả native0 hoặc kill process lạ.

## 6. Blocker tích hợp chính xác

Existing `mvp-ui-only-runtime.cjs:manualInspection` hiện:

1. Chỉ ghi `manual-checklist.json`, không xuất trusted browser-session receipt với readyAt/deadline/native ownership binding.
2. Chờ một file `operator-acceptance.json` có **operatorAttested=true**, đúng12 boolean và3–10 PNG. Nó có thể hoàn tất sớm khi file xuất hiện.
3. Supervisor tiếp tục post-verification và shutdown frontend/API/DEV cluster; không có callback/barrier chờ browser đã close/native-complete.

Vì vậy không được chuyển95-cell automated matrix thành12true operator assertions, giả operatorAttested, sửa legacy summary hoặc coi screenshots của Agent là attestation của người dùng. Một sidecar chỉ poll manual-checklist không chứng minh close-before-shutdown, không được dùng để vượt gate.

**Chưa có live bridge/provider được triển khai** để cấp trusted session receipt, secure credential stream cho browser worker, bound Windows environment/native owner handles và close barrier. Adapter core từ chối khi thiếu bridge. Proven smoke parent có thời hạn ngắn và approval cụ thể; không chạy nguyên parent đó cho Website600s.

Phần tối thiểu cần review/authorization tiếp theo: một lifecycle bridge/hook hẹp nhận READY sau DB/API/CORS/auth/source gates hiện có, bound worker/credentials/deadline≤600s, chờ browser native cleanup trước post-check/shutdown, và giữ operator-intake thật tách biệt automated matrix. Nếu hook cần đổi pinned supervisor/runtime thì phải proposal/diff và lineage manifest riêng; **chưa sửa hoặc tự tạo revision11**. Có thể review coordinator khác nếu chứng minh tương đương, nhưng không tự coi polling là đủ. Chưa xin live approval để chạy một integration chưa đầy đủ.

## 7. Native ownership design review

Provider phải tái sử dụng các invariants đã PASS của remediation smoke: exact Edge hash/environment/private profile, native spawn boundary1, OS creation time/ownerSID/executable/parent graph và held handles độc lập. Không browser.process() giả định; không dùng JSON flow PASS thay native completion.

`verifyOwnership`, `closeAndObserve`, `abortOpenAndObserve` là callback bắt buộc, **hiện chưa wire tới executor Windows cho Website**. Cleanup record xuất ra chỉ schema allowlist; native0 thiếu held handles/valid OS exit/tree-empty vẫn BLOCKED. Unknown owner/native/sandbox child không được tự kill. Không copy approval/attempt cũ. Native cleanup design REVIEWED; actual Website native cleanup NOT_EXECUTED.

## 8. Tests và integrity

- **45/45 adapter synthetic tests PASS**, Node native exit0. Các test fake exercise95-cell loop,4 sensor histories/12 rows,10 screenshot quota, flags/env provider contract, read-only HTTP/OPTIONS/WS, credential UTF-8/no trim/redaction, unknown ownership, bounded cleanup/late-launch abort và no retry. Fake PNG chỉ là test buffer trong memory, không được lưu làm screenshot evidence.
- **23/23 selected existing supervisor regressions PASS**, native exit0: approval/source/identity/SQL historical rejection, readiness cleanup, native nonzero/unknown và approval reuse. Fake dependencies, không database/services.
- Node syntax5 CJS files exit0; PowerShell handoff AST0 errors, không gọi prompt. Không chạy lại137 frontend tests hoặc full system acceptance.
- Lượt đầu42/43 do fake `/users` chưa mô phỏng RoleRoute redirect; đã sửa fixture sau source review. Final45/45 sau policy/cleanup tests; không sửa application để ép test PASS.
- Evidence: `build/frontend-acceptance-prep-eea609de04644afc822a078d1434b4f3/`, gồm adapter TAP đầu/cuối và verification JSON. Một lệnh xuất planned matrix bằng Node -e bị lỗi shell quoting, đã dùng stdin script để tạo plan thành công; không liên quan browser/native crash và không bỏ qua exit nonzero.

Source pins riêng: `FINAL_FRONTEND_AUTOMATED_ACCEPTANCE_SOURCE_PINS.json`, purpose **SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL**. SHA256:
`6ddbd5bd2967eebb6561bbbeb3defe657dd74926e169138543e281c38ff79561`.

| New source | SHA256 |
|---|---|
| adapter.cjs | `a97cdde69b9b02bf5cb6a9f3c1ec5ea4bb84114b64141535ca3ebf47be1df742` |
| adapter.test.cjs | `aee8027df3f8c4a1399f1c76192a600e5661941c6c6d0ba66e68a6eed87620c8` |
| contract.cjs | `a0be73f63accce5e872a256dabeab8adb6fdcd91da9177ac8a7269a0e30e99df` |
| policy.cjs | `e70a7c922fe902434fa4f5712a8805ad5c649971d1b8e09781c821279d07f119` |
| credential-source.cjs | `fc7409f6efa4b1fe5fe18db86b78467ff5c0f1fb9fd9b1ae36004a00df238ef3` |
| credential-handoff.ps1 | `6e12f2bdefcd7020b9f04211d27359c18785232bf92b13062c49648f2cf636ae` |

Active REV10 `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`; actual250 source+4 runtime+4 offline-test pins0 drift. New adapter files không được tự thêm vào active manifest. Không website/services/MQTT/credentials thật, không DeviceCommand/pump/Automation actions.

## 9. Final status

```text
SMART AGRICULTURE — FINAL WEBSITE ACCEPTANCE PREP
Edge/Playwright capability: VERIFIED (previous smoke)
Browser adapter: BLOCKED (offline core implemented; live binding absent)
Read-only request enforcement: PASS (synthetic; live not executed)
Synthetic browser tests: 45/45 PASS
Related supervisor regressions: 23/23 PASS
19-route test coverage: PARTIAL
5-viewport matrix: PARTIAL (95-cell plan/fake traversal prepared)
Screenshot capture: PREPARED
Supervisor integration: BLOCKED
Credential handling: REVIEWED (no real credential input)
Native cleanup: REVIEWED (Website provider not wired)
Manifest: REV10 UNCHANGED
Website live attempts: 0/1
FINAL: AUTOMATED_ACCEPTANCE_ADAPTER_BLOCKED
```

STOP sau code/tests/report. Không launch browser, không start DEV/production/database, không dùng lại smoke approval, không tự tạo attestation hoặc mở phiên nghiệm thu.
