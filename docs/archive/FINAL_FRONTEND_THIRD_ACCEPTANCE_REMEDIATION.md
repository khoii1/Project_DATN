# Third Acceptance Blocker Remediation — Smart Agriculture

Ngày: **07/11/2026, UTC+7**. Phạm vi: offline analysis, staged implementation và synthetic regressions.

**THIRD_ACCEPTANCE_REMEDIATION_PARTIAL**. Đã triển khai cancellation/cleanup coordination, safe request diagnostics và observer timing candidates.35/35 tests mới và328/328 regression liên quan PASS. Không đủ bằng chứng để xác định URL lịch sử hoặc bảo đảm graceful Edge close đã được sửa; không mở thêm allowlist.

## 1. Evidence và current authority

Đã đối chiếu ba báo cáo third-live acceptance, browser-remediation source activation và second-live acceptance; actual policy/adapter/worker/live-provider/native-host/bridge/session launcher, outer capture observer và pinned Playwright implementation. Đọc browser-result/native receipts/cleanup journal/summary/inventory của phiên ba; không mở auth profile,cookies,password,JWT,token hoặc storageState.

Historical run:
`C:\DATN\test-instances\phase13-3b\ui-only-historical-1793985406933-e4b50bd1ebcf`

Historical browser evidence:
`C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke\edge-remediation-run-3eba42112b0374f4c254d88f83d44555`

Facts giữ nguyên:1GET deny tại Login1440;1cellFAIL/94NOT_VERIFIED;0screenshots;browser loginNOT_EXECUTED;non-HMR1NETWORK_BLOCKED vàHMR1riêng;pageerror0. SQL READ ONLY6/6,CORS/direct-auth/READY7/startup PASS. Host550010ms observation +3974ms cleanup,owned Edge/worker exit1 sau TerminateProcess;remaining0,foreign targeted0,barrier CLOSED. DB bounded digest trước/sau khớp,ActivityLog68→68;DEV STOPPED_GRACEFULLY. Outer launcher native exitUNKNOWN. Không sửa hoặc nâng các verdict này.

Active source kiểm lại độc lập sau offline work: APPROVED_DELTA_VALID,250baseline=248+2,16helpers,runtime/browser/offline pins PASS. REV10,Supervisor/Runtime,READY7Bridge,current descriptor `f097e563ce287ba31bef1dad3377e90c5e16a672727b56e9b0f17471f8bed635` và historical authorities giữ nguyên. Không chạy lại PostgreSQL,READY hoặc real Edge capability.

## 2. UNKNOWN_DENIED_GET: xác nhận và giới hạn

Request diagnostic cũ chỉ chứng minh GET,APPROVED_UI,UNKNOWN_RESOURCE,pathTemplateUNKNOWN,Login1440/HEADING. Không còn raw URL hoặc resourceType/navigation/initiator. Không thể khôi phục exactURL bằng suy luận source.

Interception order:context.routeWebSocket và context.route được cài trước newPage; route callback đọc method/url,OPTIONSpreflight method nếu cần,áp policy rồi continue/abort. Sau deny,setpolicyViolation; bước adapter kiểm lại sẽ stop. Request classification hiện không phân biệt navigation/document với resource type; React Router không phát một HTTP navigation mới cho mọi route transition. Domcontentloaded/HEADING context không chứng minh request bị chặn chính là document hoặc React module.

Policy hiện giữ strict origins,refuses encoded path/traversal,unknown API và mutation; có asset patterns cho Vite/imported source. Encoded ISO query chỉ được ngoại lệ ở exact reviewed sensor history GET catalogue. Không có bằng chứng sai ở PostgreSQL/READY7/React Router từ deny này.

### Source-derived finding, không phải historical root cause

Actual `frontend/index.html` khai báo `/favicon.svg`; file `frontend/public/favicon.svg` tồn tại. Policy hiện chỉ nêu favicon.ico/vite.svg và imported-source classes,nên fake GET `/favicon.svg` bị deny.

Tuy nhiên **hai files này không thuộc250REV10 source catalogue hoặc supplemental runtime pins**:

| Unpinned file | Current SHA256 (review evidence only) |
|---|---|
| frontend/index.html |1e49e388e9330af8cc1e16a73773603ff3f5da25d23fedfcd0ebd939c68d13b3|
| frontend/public/favicon.svg |0654e9c9d4fed9e1244875e901c80f3e8c66bb5b06cbbd97276c0dc689f55022|

Các hash trên không tự cấp authority hoặc chứng minh đó là historical request. Vì chưa có exactrequest và pinned dependency evidence cần thiết, **Policy allowlist fix:NOT_JUSTIFIED**. Candidate không cho favicon.svg hoặc bất kỳ class mới nào đi qua. Muốn mở resource sau này cần review/binding rõ ràng và scope riêng; không tự bổ sung vào REV10.

### Diagnostic candidate

Giữ method/origin/resource/path-template/denialRule/route/viewport/step/counts. Thêm resourceType theo enumPlaywright,boolean navigation và initiatorCategory theo approved frame origin; không lưu frame URL hoặc query. Framelss/unavailable metadata trở thành NO_FRAME/unknown. `/favicon.svg` được nhận diện bằng diagnostic-only template DECLARED_UNPINNED_PUBLIC_ASSET,**vẫn denied**. Unknown paths vẫn UNKNOWN_DENIED_GET. Đây là giúp nhận diện lần sau,không retrofit vào evidence cũ.

Không log raw query/header/body/Authorization/Cookie/JWT/credentials hoặc arbitrary error messages. Existing console/pageerror tracking giữ nguyên,không gộp NETWORK_BLOCKED vào HMR.

## 3. Worker/host550-second issue

### CONFIRMED

- Original adapter dùng boundedCleanup30s; worker clean lần lượt context.close rồi chờ native completion receipt15s. Nếu cleanup lỗi/chưa xong,adapter chỉ ghi nativeBLOCKED.
- Actual browser-result xuất hiện khoảng00:17:49,trong khi Edge spawn khoảng00:17:16. Source/evidence phù hợp với bounded cleanup hết thời gian; không có per-phase close/error receipt để xác định chính xác chỗ treo.
- Sau khi ghi result,worker chỉ setprocess.exitCode,không forceprocess.exit. Worker và Edge vẫn sống đến owned termination. Không có chứng cứ handle inventory để khẳng định IPC,stdin/stdout,CDP pipe hay navigation promise nào là nguyên nhân duy nhất.
- Host chỉ kiểm native worker exit hoặc observation deadline; không có bound shutdown-request protocol. Việc browser-result đã BLOCKED không khiến host bắt đầu cleanup sớm. Host thực tế đợi550010ms,đúng source cap550000ms.
- Pinned Playwright close code đợi graceful-close/cleanup completion; force-kill path trênWindows dùng taskkill,nhưng existing spawn boundary cấm đường này. Không có force-kill-blocked event trong evidence phiên ba nên **không quy timeout cho taskkill hoặc boundary bằng suy đoán**.

### Staged cancellation/cleanup coordination

**adapter**:

- AbortController nội bộ được kích hoạt sau policy abort. Bounded step race nhận cancellation ngay; check lại trước gọi bất kỳ scheduled operation nào và sau resolution.
- Promise bị supersede vẫn có rejection handler; late rejection không thành unhandled rejection. Không giả rằng AbortController tự hủy được mọi Playwright API không hỗ trợ signal.
- Sau policyViolation,late requests kể cả trước đó allowed vẫn abort. Không tháo route guard/unrouteAll để tránh vô tình mở network trong cleanup.
- Không retry navigation,không thêm browser launch;finally dừng/cancel và gọi owned cleanup1lần.600s/45s reserve giữ nguyên.

**worker**:

- Create-new `worker-shutdown-request.json` gồmversion1,workerPid,supervisorPid,runId,reason hữu hạn,graceMs30000. Không chứa credential hoặc claimCLOSED.
- Context close public API chỉ gọi1lần,bounded10s; native receipt wait bounded15s,vẫn bắt buộc trước tạo native completion fact. Không forceprocess.exit hoặc đặt nativeexit0.
- Hai safe per-phase files `worker-close-context.json`/`worker-close-native.json` cho biết RESOLVED/TIMEOUT/ERROR và bounded monotonic duration. Không rawerror text. RESOLVED nghĩa là operation trả về,không thay cho kiểm native exit/ownership.
- Unknown/nonzero native receipt vẫn không PASS; duplicate cleanup announcement bị create-new từ chối. Không spawn/kill trong helper.

**native host**:

- Chỉ nhận shutdown request đúng heldworker/parent/run/version/reason/grace. Partial JSON write được chờ poll sau; binding sai fail-closed. Marker không cấp ownership hoặc native success.
- Sau valid request,chờ thêm tối đa30s để worker/native có thể hoàn tất; nếu vẫn chưa thoát,đi vào existing verified-owned last-resort cleanup thay vì chờ550s. Host hardcap hiện hữu không được tăng.
- Existing freshidentity/held-handle/reparse/owned-only rules giữ nguyên;unknown PID không bị kill;native nonzero/timeout vẫn exit3;CLOSED barrier vẫn đòi actual held native completion và independent reconciliation.

**Host timeout issue:PARTIAL**:early handoff/timing được kiểm offline,nhưng chưa quan sát một process thật dùng protocol này. **Worker graceful-close root cause vẫn UNKNOWN**. Candidate cải thiện cancellation,boundaries và evidence;không hứa rằng natural Edge close sẽ thành công. Owned termination vẫn là fallback và không được báo graceful success.

## 4. Outer launcher observer

Root cause **CONFIRMED**:capture observer bắt đầu stopwatch trước secure prompt;budget1100s bao gồm khoảng16phút operator input. Observer hết hạn trước phiên kết thúc,ghi nativeExitCodenull/UNKNOWN dù cuối cùng process đã hết. Không bổ sung observer thứ hai để hợp thức hóa kết quả cũ.

Staged `capture-once.candidate.ps1` chỉ dành cho **future new private plan directory**,không ghi đè observer cũ hoặc sửa pinned `mvp-ui-only-session.ps1`:

- Giữ một launcher start,held process handle,create-new attempts và existing launcher gates.
- Kiểm expiry và consumed marker trước launch. Prompt observation budget đề xuất300s;runtime observation budget1100s bắt đầu riêng khi thấy genuine consumed marker đúng approval/run,targetbase. Không đổi Website session600s.
- Marker xuất hiện sau prompt deadline không reset budget. Clock-inconsistent state bị từ chối. Native completion luôn từ cùng process/held handle;không giả OSExitTime hoặc observedCompletion là OSExitTime.
- Synthetic slow input250s +runtime600s không tiêu hao runtime budget. Prompt hết300s hoặc runtime hết1100s thì ghi timeout/UNKNOWN,noKill. Native nonzero giữ nguyên;zeroFILETIME/1601/precreation/missing exit metadata không thành full evidence PASS.

**Giới hạn:**Get-Credential gốc vẫn chưa có cơ chế tự hủy prompt đã nghiệm thu. Candidate observer hết budget sẽ báo UNKNOWN và không kill launcher. Nếu cần đảm bảo prompt/process tự đóng khi operator bỏ dở,cần review pinned launcher/secure prompt cancellation riêng;không coi việc tách stopwatch là đã giải quyết phần này. Các budget là proposal,chưa được dùng thực tế hoặc coi là approval mới.

## 5. Staging inventory và hashes

Directory: `build/third-acceptance-remediation-20261107-1/`.

**8source candidates**:7pinned replacements +1future private observer. Thêm1descriptor candidate. Các generator,preload/tests/verification/evidence nằm trong staging;không sửa pinned files/tests hoặc historical artifacts.

| Target | Current SHA256 giữ nguyên | Candidate SHA256 |
|---|---|---|
| `scripts/frontend-acceptance/policy.cjs` | `2af4991d3425434c15f66368b221c07f046722217c84f94120ec6f9de2f2a4f8` | `4e9c282e925f132832a4aa5e3b295b7c040da1b25d35e98a7d4d384d0d9c30e8` |
| `scripts/frontend-acceptance/adapter.cjs` | `4b78f3c928db2c40939d5e17f2672cb6c801ee1a9a0f24d4f5fe294d3e8457c2` | `44c9f7dd5750dbe44e942e6baaf6923e037ec58754870c6bb52db798c9b0f7f4` |
| `scripts/frontend-acceptance/worker.cjs` | `8da79aba15c74a84f864e7e6d1d2ecd4653e4ea75c4b3102bc057f0bc7e0e2b4` | `b5430a2d7d1de0971424b613e0e1703e2e50485b222207e36677d3d5f0c7440c` |
| `scripts/frontend-acceptance/native-host.ps1` | `381d7da2ad388dbd5595e46b554ff73c88922a9008c5bb83531de6c9f8ab3823` | `612c907bb17a386e0734ee119781537dd7539c3580196aebff8ba3d93a6db8bf` |
| `scripts/frontend-acceptance/strict-lineage.cjs` | `cfc799600ad71f65c1b299d2325823cd61e97bdd10decf3f26b2c5ed936198de` | `2dc1300ac926e8a8348afacf569113531130b62f24a9d9499737796670a1043a` |
| `scripts/frontend-acceptance/lineage-fs.cjs` | `e99bb38d4e04a3f6f3d819ace0d6cb91c3b1a030c60c955af52f5b71d32887d8` | `fab9d64c3235ea730b63a34ab6299dd3409e4d6be88d062ac7aa9bd429694f3b` |
| `scripts/frontend-acceptance/lineage-anchor.cjs` | `670b707d5511b15ab28c5bb3a38117a0d97215f089807e38606fbf8587e1447f` | `a5c374167a55f824a2aeb791b6afbee2c97eda249912e063a713254e71cb814d` |

| Unified diff | SHA256 |
|---|---|
| `policy.cjs.patch` | `813dcb1519fec444a1295e81072c42cd4fbf23620b4f665c3ffbb3e1d113ff63` |
| `adapter.cjs.patch` | `8ea5e2a6041716415fa8a9daad8d74258a29ec349343dcf679fda90f431f0c27` |
| `worker.cjs.patch` | `2591db7698699b2269b186aad72aa94bf408d27255e89f0991bc9ffbc4f56223` |
| `native-host.ps1.patch` | `57c168cb4efac5d364cf22643f7439f9c29cf6e6709bbc63efc1e2fce13f2b8e` |
| `strict-lineage.cjs.patch` | `c99ee9d69402b77b2c61176cf0dd2c5324aa118c0ee0be09de66d0a0572d25ad` |
| `lineage-fs.cjs.patch` | `9f98bb27905751ec9b64edd0b541857f51b16287c26e3d2a5ffb193296f615e7` |
| `lineage-anchor.cjs.patch` | `8cc5f3d293c507f486f2ffdc180f0d9908e2a451305fe91a79ba2f9186ff083b` |

Future private observer:

- Original private helper SHA256:`2de4b2cc873ff2269c9b0cb8c7eed8990ebf591eca2b5554c1dedb7a3fe04d65`.
- Candidate SHA256:`0a0160f6fecacbbb79a7c7b7f3745acf01dbd0f5cb1dc458a8b80aa809901eaa`.
- Diff SHA256:`44622f8ebc1ae829cc01bd3208b51470aec04dd913a4031a67d2af446dd7586c`.
- Candidate:`build/third-acceptance-remediation-20261107-1/capture-once.candidate.ps1`.

Descriptor candidate:`build/third-acceptance-remediation-20261107-1/FINAL_FRONTEND_THIRD_BLOCKER_PINS.json`.

SHA256:`1bfd2e3431908fb3ab6f0bdc7cea487e6fb9650e6f7fca72477537b40745bd55`.

Source proposal:`build/third-acceptance-remediation-20261107-1/proposal.json`,SHA256:`bba1203ff08be610c65276d59f16de6c43dc4d2727873fe58d442898f8f96566`.

Outer proposal:`build/third-acceptance-remediation-20261107-1/outer-proposal.json`.

## 6. Source-lineage proposal — READY FOR REVIEW ONLY

Fixed parent descriptor vẫnf097,current browser-remediation/READY layers và immutable REV10/b3/4f/c634 không đổi. New candidate layer `thirdBlockerRemediation` chốt đúng4helper pairs(policy/adapter/worker/native-host),parent bytes/hash và preparation reference/hash;candidate core/fs/anchor có exact new pins.

Preparation reference:538b1157-f6d0-4a16-b1c5-c7ad14b5003e,SHA256:`dbcd6fbaabad5ced15c540252fba4c76e777adaa0202ed8d6078a9491d55db85`. Đây chỉ là offline preparation authority,không phải quyền activation/live.

Candidate descriptor target tương lai:`docs/FINAL_FRONTEND_THIRD_BLOCKER_PINS.json`. Chưa tạo ởactive docs. Catalogue vẫn250baseline248+2,helpers16;không thay API/React/launcher baseline hoặc tạoREV11.

Synthetic candidate validation chấp nhận exact scope và từ chối extrahelper/arbitraryplanrepin/parenttamper/scopeexpansion. **Installed current authority vẫn từ chối staged hashes này**. Private observer nằm ngoài source-catalogue này;việc dùng nó cần review/pin SHA256 riêng tại execution boundary,không đưa arbitrary mutable-plan hash làm quyền thực thi.

Activation scope cần duyệt riêng:exact7pinned source replacements +create-new descriptor. Future observer candidate cần explicit source/hash review và one-shot execution approval riêng trước khi được copy vào một fresh private plan. Không xin lại quyền đã có hoặc tự kích hoạt trong phase này.

## 7. Actual offline regressions

| Suite |PASS|Native exit|
|---|---:|---:|
| New targeted remediation |35/35|0,trongfinal254|
| Previous browser-remediation tests |49/49|0,trongfinal254|
| Adapter/bridge |90/90|0,trongfinal254|
| Lineage integration |8/8|0,trongfinal254|
| Strict lineage unit |31/31|0,trongfinal254|
| READY policy |41/41|0,trongfinal254|
| Combined |254/254|0|
| Supervisor/legacy MANUAL,chạy riêng |83/83|0|
| Existing native observer/cleanup analysis mocks |26/26|0|
| **Unique total** |**363/363**|**3processes exit0**|

New35 vàexisting328 đều PASS. Existing328 gồm302acceptance regressions +26native mocks. Final receipts:`final-254.tap`,`final-supervisor-83.tap`,`native-cleanup-regressions.tap`;0FAIL,0skip,0cancel. TAP UTF16BOM đọc đúng. Native process exit codes được kiểm riêng,không dùng JSON PASS thay native exit.

New cases gồm network allow/deny/redaction,unpinned dependency distinction,resource/navigation/initiator enums,pending-heading cancellation/late rejection,late request abort,bounded close/native wait,missing/nonzero/unknown receipts,create-new,no-retry,independent authority rejection. Một testPowerShell chạy actual candidate functions với fake process objects,18assertions và AST parse cả2PS candidates;không gọi main/Start-Process/real browser. Unknownownership Stop-Owned test dùng held-map rỗng,không gọi native termination.

6candidateCJS syntax exit0;2candidatePS AST0errors. No-source-drift proof chạy độc lập khôngpreload:250/16/binary/runtime/offline pins và7oldhashes PASS;historical private observer và unpinned resources còn nguyên bytes.

Preload chỉ dùng cho staged code/fixture projection trong tests;không coi fake browser/native/context PASS là live evidence. Historical fixture-only adaptation như phase trước,không sửa pinned test files. Existing real-target `mvp-native-exit.test.cjs` không chạy vì nó spawn real synthetic executables;scope hiện yêu cầu fake process/streams. Thay vào đó chạy26existing mocknative/cleanup cases và native contract cases mới;không tuyên bố đã nghiệm thu actual OS completion của candidates.

Intermediate188/188,33/33,34/34 và252/252 logs được giữ. Sau thêm phase diagnostics trong worker và một test,bundle cuối chạy lại254 +83;không có failure/timeout/nonzero bị che hoặc tăng timeout.26mocknative tests không thay source liên quan nên dùng receipt đãPASS,không lặp không cần thiết.

## 8. Safety và remaining verification

- Active source changed:NO. ManifestREV10/current/historical authority giữ nguyên. Staged hashes/diffs kiểm đầy đủ;newdescriptor không tồn tại ởactive target.
- New Website/DEV sessions0,Edge launches0,MQTT0,DeviceCommand0,Pumpactions0;không start PostgreSQL/API/frontend/Edge hoặc đổi sensor data/firmware.
- Không mở auth profile hoặc đọc credentials;không apply ACL/password/broker changes. SOIL_SENSOR_QUALITY_BLOCKED giữ nguyên.
- Không reuse ba consumed Website approvals. Không tự khởi tạo approval hoặc live execution plan.

Còn thiếu:exact deniedresource,approved dependency binding nếu muốn mở một grant,gracefulclose thực tế,early-host protocol và newobserver thực tế. Không nên chạy phiên4 trước khi review chính các gaps này. Nếu được duyệt source activation sau này,phải fresh-check exact old/new pins và installed regression trước mọi live approval riêng.

## 9. Final summary

```text
SMART AGRICULTURE — THIRD ACCEPTANCE REMEDIATION
Historical Website sessions:3 CONSUMED
UNKNOWN_DENIED_GET root cause:UNKNOWN
Policy fix:NOT_JUSTIFIED (no allowlist expansion; diagnostics prepared)
Worker graceful-close fix:PREPARED (cancellation/coordination; real graceful reliability NOT_VERIFIED)
Host timeout issue:PARTIAL
Outer launcher observer fix:PREPARED (prompt cancellation limitation remains)
New tests:35/35 PASS
Existing regressions:328/328 PASS
Staged changes:8 source candidates +1 descriptor candidate
Source-lineage proposal:READY FOR REVIEW ONLY
Active source changed:NO
Manifest REV10:UNCHANGED
New DEV sessions:0
New Edge launches:0
MQTT commands:0
Pump actions:0
FINAL:THIRD_ACCEPTANCE_REMEDIATION_PARTIAL
```

STOP sau offline implementation/verification. Không apply source hoặc chạy live session mới.
