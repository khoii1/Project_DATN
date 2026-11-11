# Offline Browser Acceptance Remediation — Smart Agriculture

Ngày thực hiện: 2026-11-06. Phạm vi: source review, candidate trong staging và kiểm thử offline. **Không kích hoạt source, không chạy Website/Edge/PostgreSQL/MQTT.**

## 1. Kết luận

**BROWSER_REMEDIATION_PARTIAL.** Đã triển khai và kiểm thử các bản sửa harness có căn cứ từ source. Candidate đủ để review source/lineage; chưa đủ bằng chứng để kết luận toàn bộ blocker lịch sử đã được giải quyết. 22 denied GET mất URL gốc và 20 non-HMR console errors không lưu message/source nên nguyên nhân từng request/error vẫn chưa xác định.

49/49 tests mới và 253/253 regression hiện có PASS, tổng **302/302**, hai native test processes exit0. Đây là synthetic/offline verification, không phải nghiệm thu trình duyệt thật.

## 2. Evidence đã đọc và giới hạn

- `docs/FINAL_FRONTEND_SECOND_LIVE_BROWSER_ACCEPTANCE.md`, báo cáo READY source activation, live acceptance lần một; implementation adapter/policy/assertions/contract/worker/live-provider; React routes/pages, frontend services và backend GET query contracts.
- Evidence phiên hai: browser directory `edge-remediation-run-3eb539ddf1fd91372b04969391d85310`; run `ui-only-historical-1793980687347-42395aaad839`; plan `ui-only-plan-1793980377123-0859593598bf`. Chỉ đọc browser-result, native receipts, matrix/inventory, summary và cleanup/source postcheck metadata. Không mở/copy auth profile, cookies hoặc token.
- Screenshot thật duy nhất `mobile.png`: 390×844, 40,930 bytes, SHA256 `5a1b33aafb5c477ded7b539239d2e5af796c8d9c0db22322db471f45a617648e`. Đã đối chiếu hình Dashboard; không tạo ảnh nghiệm thu mới.
- Matrix lịch sử: 8 PASS, 4 FAIL, 3 PARTIAL, 80 NOT_VERIFIED. 4 FAIL là Dashboard/Sensors tại 1440 và 1024; 3 PARTIAL là Dashboard tại 768/390/375. Không đổi nhãn các cell lịch sử.
- Browser native Edge exit0, worker exit3; cleanup CLOSED, owned processes remaining0. DB bounded digest trước/sau bằng nhau, ActivityLog68→68. Đây là bằng chứng phiên hai, không phải runtime check mới.
- Có 114 accepted API observations (113 GET, 1 POST login), tất cả200; latest-readings có3 GET200. Điều này không chứng minh 22 GET bị chặn là hợp lệ.
- Edge chạy khoảng42 giây, phiên bắt đầu đến browser exit khoảng46 giây. History `DEADLINE` không chứng minh đã hết cửa sổ600 giây: active adapter dùng cùng loại lỗi cho bounded step8 giây và deadline toàn phiên.

## 3. Root-cause assessment theo blocker

| Blocker | Bằng chứng source/evidence | Kết luận |
|---|---|---|
| 22 denied GET | Tất cả chỉ còn method GET, path `REDACTED_PATH`, status null | **BLOCKED** về phân loại lịch sử; không đoán URL, origin hay quan hệ nhân quả |
| 4 desktop FAIL | Adapter dùng `page.locator('aside').boundingBox()`; Sidebar là aside, historical transform cũng chèn aside. Source-level reproduction xác nhận hai asides | **CONFIRMED_DEFECT**: selector mơ hồ. Exact historical exception không được lưu nên không quy toàn bộ4 cell cho riêng lỗi này |
| 3 mobile Dashboard PARTIAL | loading=true trong observations; thiếu các điều kiện acceptance. Hình không có bằng chứng body overflow; recorded bodyWidth=scrollWidth | **PARTIAL**: có vấn đề chụp state quá sớm; chưa chứng minh UI responsive bug |
| Sensor discovery | Link thực tế có aria-label `Xem lịch sử <sensorCode>`; href có sensorId. Adapter đọc links trước settled data và sau optional menu assertion; desktop throw có thể bỏ qua discovery | Timing/order defect xác nhận từ source; historical exact causal chain **PARTIAL** |
| Generic History timeout | Contract chờ “Dữ liệu chi tiết”; React chỉ render section đó khi có sensorId. Generic route chưa chọn sensor hiển thị heading “Lịch sử dữ liệu cảm biến” và hướng dẫn chọn | **CONFIRMED_DEFECT**, resolved offline bằng đúng heading/predicate |
| Root redirect FAIL | React `/` dùng Navigate replace; adapter đọc pathname ngay sau domcontentloaded | Race-prone observation xác nhận từ source; historical transition không lưu. Bounded asynchronous test PASS; real redirect chưa nghiệm thu lại |
| 20 console errors | Chỉ có counts; pageErrors0; riêng expectedHmrErrors20 | Không thể phân loại từng error cũ. Không gộp20 non-HMR với20 expected HMR |

Một defect policy riêng đã xác nhận: active `url()` từ chối mọi `%`, gồm ISO datetime query do sensorService encode từ `from`/`to`. Candidate cho phép riêng query được xác minh của readings/chart/statistics. **Không có bằng chứng đây là nguyên nhân của22 request lịch sử.** Không mở all GET hoặc nới origin.

Historical warning có `role=alert`; active generic alert probe vì thế báo app-error dù banner đúng chủ ý. Candidate loại riêng `#ui-only-historical-warning` khỏi error probe; không loại các alert thật.

## 4. Functional staged fixes

1. **adapter.cjs**: sidebar selector gắn đúng `nav[aria-label="Điều hướng chính"]`, yêu cầu đúng1 element; chờ loading settle; sensor discovery theo observed label/href trước optional menu; bounded root waitForURL; generic/selected History readiness tách biệt; structured step/failure evidence. Không tăng mặc định8 giây.
2. **policy.cjs**: chỉ cho encoded ISO query ở ba endpoint sensor history đã có trong actual GET catalogue. Kiểm tra date/order, keys duy nhất, readings page/limit/sort và chart resolution đúng backend contract. Encoded path, external origin, credential query, mutation và unknown API tiếp tục bị chặn. Không sửa API/server allowlist hoặc runtime policy production.
3. **assertions.cjs**: phân biệt historical banner với app error. Không sửa React để ép PASS.
4. **contract.cjs**: generic History heading khớp actual React heading; data section chỉ đợi sau khi đã chọn sensor quan sát được.

Readiness không tự biến thành PASS: actual loading/error, missing rows, selectors và required presentation facts vẫn quyết định FAIL/PARTIAL. Historical loading evidence không được sửa thành dữ liệu mới.

### Coverage resilience và safety

- Tách `ACCEPTANCE_STEP_TIMEOUT` khỏi global deadline. Chỉ tiếp tục cell/route chưa kiểm tra khi browser còn mở, URL thuộc approved UI, không policy violation và deadline còn cho phép; không retry cell/navigation thất bại.
- OPEN/NAVIGATE/AUTH timeout, global deadline và network safety violation dừng flow. Unknown GET vẫn bị abort và đặt policyViolation; không cố chạy thêm routes để đủ95 cells.
- Giữ max600 giây, cleanup reserve45 giây, một browser launch, không fallback; close-and-observe barrier giữ nguyên trước DB/service shutdown.
- Test fake đi qua95 render cells và4 chart types/12 rows nhưng kết quả tổng vẫn không được tự nâng thành real PASS. Một injected heading failure vẫn FAIL, các cell an toàn chưa thăm được tiếp tục; policy denial dừng ở navigation đầu và close đúng1 lần.

## 5. Diagnostics an toàn cho phiên tương lai

Request diagnostic chỉ lưu method hữu hạn, origin category, resource category, safe path template, denialRule, route/viewport/step và aggregate counts. Unknown path thành `UNKNOWN`; unknown GET thành `UNKNOWN_DENIED_GET`. Không lưu raw query, userinfo, headers, body, credentials hoặc IDs trong template mới. Prefix lookalikes không được đưa vào safe template catalogue.

Failure diagnostic chỉ lưu assertion/expected-condition ID dựa trên step, error category, duration có giới hạn và booleans/counts/geometry được whitelist. Không lưu exception.message hoặc raw DOM. Step IDs gồm HEADING, DATA_READY, DESKTOP_MENU, ROOT_REDIRECT, HISTORY_ROWS…; thiếu dữ kiện không được đoán exact failing DOM node.

Console diagnostic giữ các category EXPECTED_HMR / NETWORK_BLOCKED / NETWORK_FAILURE / REACT_DIAGNOSTIC / UNKNOWN_CONSOLE_ERROR, source identity hữu hạn từ approved UI location, context và counts. Đây là phân loại dấu hiệu message, không phải root-cause proof hay correlation theo request ID. Vẫn theo dõi pageerror và non-HMR errors; không tắt tracking. Arrays có giới hạn256; aggregate counters có cap.

## 6. Candidate files, diffs và hashes

Tất cả nằm trong `build/browser-remediation-20261106-1/`. **7 patches**, gồm4 functional và3 authority candidates; thêm1 descriptor candidate. `proposal.json` chứa exact target, old/new SHA256, candidateFile, patchFile, patchSha256. Chưa tạo descriptor tại đường dẫn active.

| Active target | Original SHA256 giữ nguyên | Candidate SHA256 |
|---|---|---|
| `scripts/frontend-acceptance/adapter.cjs` | `1617f6a221f899c1f8107417a8a175bc4ec58673adbd55324bbe38a3215ae19e` | `4b78f3c928db2c40939d5e17f2672cb6c801ee1a9a0f24d4f5fe294d3e8457c2` |
| `scripts/frontend-acceptance/policy.cjs` | `e70a7c922fe902434fa4f5712a8805ad5c649971d1b8e09781c821279d07f119` | `2af4991d3425434c15f66368b221c07f046722217c84f94120ec6f9de2f2a4f8` |
| `scripts/frontend-acceptance/assertions.cjs` | `c5fc747f4f31da4945a029f18e9b7b8338955bf7f608cd43dc0b9ebd9cabff65` | `ca9fe0b7c03831e4e66c8f560b59a4b5691abda91aaebba40c5f0c62e673d191` |
| `scripts/frontend-acceptance/contract.cjs` | `a0be73f63accce5e872a256dabeab8adb6fdcd91da9177ac8a7269a0e30e99df` | `89c00551046464a7397b224691a17cf01f932a0a8b48f3da4ab0a29ccc1826c7` |
| `scripts/frontend-acceptance/strict-lineage.cjs` | `2e9458917803299c554606b663bd8cbccc4cce2a6c50437bf7f2e9233a044ba1` | `cfc799600ad71f65c1b299d2325823cd61e97bdd10decf3f26b2c5ed936198de` |
| `scripts/frontend-acceptance/lineage-fs.cjs` | `7648683938e3c4ddcc59073b6fd9e6adaf502d597305c93affc1658c9dc6f605` | `e99bb38d4e04a3f6f3d819ace0d6cb91c3b1a030c60c955af52f5b71d32887d8` |
| `scripts/frontend-acceptance/lineage-anchor.cjs` | `dcea627f8d6fbc4802be437a21cae1b429da722942bdf0788461eaa1d331c22a` | `670b707d5511b15ab28c5bb3a38117a0d97215f089807e38606fbf8587e1447f` |

| Unified diff | SHA256 |
|---|---|
| `adapter.cjs.patch` | `7ada5ed10786e6ff0a790fbd2f4dc74becef1d8c4757481681f2199f06c69c30` |
| `policy.cjs.patch` | `cedaf546f975e693b9ddf9d3b8023213820294f53df88623d4ae6dc01c73d496` |
| `assertions.cjs.patch` | `ea4b8ab5ce006278eafabf88ba39aaa5e01056505dfbee62e8c3d215e7679303` |
| `contract.cjs.patch` | `74a74790f3f39878c2ab3414c8d8da08507b419f3883fdad75fdbf2463399346` |
| `strict-lineage.cjs.patch` | `bfb1d49022327ba15e00a950b4d3ab4f16940f47434be460b252be4385c84e7e` |
| `lineage-fs.cjs.patch` | `3b67de2581004cfece9f86837068d40ca333f28557cbe4225821030f12f0c824` |
| `lineage-anchor.cjs.patch` | `daffc02c579f8f19a4d5a820a16315bebdc9e74c417c47237a17ff2a9e6a1c1d` |

Descriptor candidate: `build/browser-remediation-20261106-1/FINAL_FRONTEND_BROWSER_REMEDIATION_PINS.json`.

SHA256: `f097e563ce287ba31bef1dad3377e90c5e16a672727b56e9b0f17471f8bed635`.

Proposal SHA256: `6959ce73031daab285c30fffbfe79bc70f6c79e14754290097ecf9da53e4fe1f`.

## 7. Minimal source-lineage proposal — review only

- Immutable REV10 vẫn `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`; không REV11, không repin execution plan.
- Giữ parent READY descriptor `c634f044958c4684420d957c1adea23bed2d7e5125d4b05fdd757d2f4061c79d`, approved two-file Supervisor/Runtime delta, READY7 bridge và prior source-contract/test overrides.
- Candidate strict-lineage chứa fixed old/new map chỉ4 functional files, fixed parent/reference hashes và scope check. Candidate lineage-fs thêm read-only metadata paths cho parent/reference; candidate anchor chọn đúng future descriptor hash. Helper catalogue vẫn16; baseline250 vẫn248+2.
- Preparation reference là attachment9637d66a, SHA256 `41aa934eec56c834d61101b23a539d6a1ba551c0f9c118c24059820cfcb96e7f`. Nó chứng minh **quyền chuẩn bị**, không phải activation/live approval.
- Synthetic candidate verifier chấp nhận đúng overlay; từ chối repin frontend/worker ngoài scope hoặc widen overlay. **Active verifier hiện tại vẫn từ chối candidate helper repins**.
- Independent active verification đọc file/owner/reparse/hash thực tế: APPROVED_DELTA_VALID,250 baseline sources,248 unchanged+2 approved replacements,16helpers; authorities/runtime/binary/test pins PASS. 7active targets khớp old SHA256. `active-integrity-final.json` lưu kết quả. Không dùng fixture làm bằng chứng active source intact.

## 8. Offline test evidence

| Suite | Actual PASS | Native exit |
|---|---:|---:|
| New remediation tests |49/49|0 (trong final-219)|
| Existing adapter + bridge |90/90|0 (trong final-219)|
| Existing strict-lineage integration |8/8|0 (trong final-219)|
| Existing strict-lineage unit |31/31|0 (trong final-219)|
| READY policy installed regressions |41/41|0 (trong final-219)|
| Supervisor regressions, chạy riêng |83/83|0|
| **Tổng** |**302/302,0 FAIL/skip/cancel**|**0/0**|

- `final-219.tap`:219/219; `final-supervisor-83.tap`:83/83. PowerShell redirected TAP có UTF16 BOM; evidence parser đọc đúng encoding.
- Node syntax7candidates và5support/test/verification files:12/12 exit0. Không sửa PowerShell nên không phát sinh AST change cần nghiệm thu.
- Fixtures synthetic chỉ ở memory/staging; SHA/bytes checks giữ fixture/password/data thật nguyên vẹn. Không sửa pinned tests; preload review-only đưa candidate bytes vào đúng module identity. Historical preload chỉ phục vụ old baseline fixture test. Source-level checks đọc actual React và dedicated presentation transform.
- `final-test-evidence.json` ghi source/test/TAP hashes, counts và native exits. Kết quả47/47 và253/253 intermediate được giữ; sau bổ sung2negative tests và siết safe asset-prefix classification đã chạy lại toàn bộ302 trên candidate cuối.
- Không có timeout/nonzero ở hai final test processes. Stage generator từng từ chối anchor replacement không unique; đã sửa exact generator anchor trước khi sinh candidate, không bỏ guard hoặc sửa active source.

Lệnh final test1:

```powershell
node --require ./build/browser-remediation-20261106-1/preload.cjs --require ./build/source-activation-d35c4f433ef641abbdb75515592a26d6/historical-fixture-preload.cjs --test build/browser-remediation-20261106-1/remediation.test.cjs scripts/frontend-acceptance/adapter.test.cjs scripts/frontend-acceptance/bridge.test.cjs scripts/frontend-acceptance/strict-lineage-integration.test.cjs scripts/frontend-acceptance/strict-lineage.test.cjs build/ready-policy-activation-20261106-1/ready-policy-installed.test.cjs
```

Lệnh final test2 (riêng):

```powershell
node --require ./build/browser-remediation-20261106-1/preload.cjs --test scripts/mvp-ui-only-supervisor.test.cjs
```

## 9. Còn thiếu và phê duyệt tiếp theo

1. Review7diffs, descriptor và exact final hashes. Nếu chấp thuận, cấp phạm vi riêng để kích hoạt đúng bundle source; không xem tài liệu này là authorization. Rollback source sau activation cần dùng exact old-byte artifacts/digests và revalidate lineage, không tự chỉnh plan để vượt gate.
2. Sau activation hợp lệ mới xem xét **approval mới riêng** cho một Website acceptance có existing READ ONLY/CORS/auth/READY gates, một browser và close-before-shutdown. Không dùng lại hai approvals đã tiêu thụ.
3. Phiên tương lai phải xác minh network diagnostics mới và chặn UNKNOWN, desktop/mobile selectors, settled states, actual four histories12rows, root redirect, console categories và screenshots thật. Encoded query negative controls PASS không chứng minh historical22 đã hợp lệ.
4. Nếu network denial tái xuất hiện, dùng structured evidence để điều tra; không tự allow all GET, tăng timeout, fallback browser hoặc bật MQTT.

Không sửa Frontend/firmware/manifest/active authority, không startup DB/API/Frontend/Edge, không tạo/sửa records hay fixtures lịch sử, không MQTT/DeviceCommand/ON-OFF/Automation. SOIL_SENSOR_QUALITY_BLOCKED giữ nguyên. Bơm không được Agent kích hoạt.

## 10. Final status

```text
Historical session 1: CONSUMED
Historical session 2: CONSUMED
Edge/browser capability: VERIFIED (historical)
Authenticated browser: VERIFIED (historical)
Database/source cleanup: VERIFIED (historical session 2)
Denied GET classification: BLOCKED (22 original URLs unavailable)
Assertion failures: PARTIAL (confirmed selector/readiness defects patched offline)
Sensor link discovery: RESOLVED_OFFLINE (live verification pending)
History timeout: RESOLVED_OFFLINE (live verification pending)
Root redirect: RESOLVED_OFFLINE (live verification pending)
Console error diagnostics: READY (historical20 root causes unknown)
Source modifications activated: 0
Staged patches: 7
New regression tests: 49/49 PASS
Existing regressions: 253/253 PASS
Source-lineage proposal: READY FOR REVIEW ONLY
New Website attempts: 0
New Edge launches: 0
Database/MQTT/Pump actions: 0
FINAL: BROWSER_REMEDIATION_PARTIAL
```

STOP sau offline remediation. Không kích hoạt candidate hoặc bắt đầu phiên live mới.
