# Pre-Session 4 Readiness Review — Smart Agriculture

Ngày: **07/11/2026, UTC+7**. Phạm vi: offline review và focused preparation. **PRE_SESSION4_PARTIAL**.

Current installed bundle hợp lệ;observer revision và exact-resource proposal đã chuẩn bị,37/37 focused tests PASS. Chưa có authority/runtime wiring để mở favicon grant và revised observer chưa được phê duyệt dùng. **Chưa đủ điều kiện chỉ cấp một live approval rồi chạy ngay phiên4.** Active deny giữ nguyên;không khởi động Website/DB/Edge/MQTT hoặc thay source.

## 1. Current source readiness

Đã đối chiếu `FINAL_FRONTEND_THIRD_REMEDIATION_SOURCE_ACTIVATION.md`,third-remediation vàthird-live reports. Source activation COMPLETE không đồng nghĩa UI acceptance COMPLETE.

Fresh independent installed verification,khôngpreload:

-250baseline catalogue,248unchanged+2approved Supervisor/Runtime replacements.
-16supplemental helpers;READY7Bridge,runtime/browser/offline pins PASS.
-Latest descriptor:`docs/FINAL_FRONTEND_THIRD_BLOCKER_PINS.json`,SHA256`1bfd2e3431908fb3ab6f0bdc7cea487e6fb9650e6f7fca72477537b40745bd55`.
-REV10`47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`vàhistorical descriptors giữ nguyên.
-IndependentPowerShellhashes:**288/288MATCH**,native exit0.
-KhôngDEV listeners/readers chuyên dụng ở snapshot kiểm tra. Không suy trạng thái ESP32/production từ snapshot này.

`readiness-proof.json` lưu actual lineage,hash counts,source metadata và candidate hash checks. Không chạy lại363regressions vì không đổi installed module hoặc pinned test nào trong review này.

## 2. Observer integrity và timing review

Original staged candidate verified:
`0a0160f6fecacbbb79a7c7b7f3745acf01dbd0f5cb1dc458a8b80aa809901eaa`.

Historical original verified:
`2de4b2cc873ff2269c9b0cb8c7eed8990ebf591eca2b5554c1dedb7a3fe04d65`.

Existing diff verified:
`44622f8ebc1ae829cc01bd3208b51470aec04dd913a4031a67d2af446dd7586c`.

Existing candidate đã tách prompt budget300s và runtime-observation1100s;bắt đầu runtime theo consumed marker;không thay session600s. Một launcher start,held handle giữ trên cùngProcessobject;WaitForExit/HasExited/ExitCode/ExitTime từ object đó,không mở process khác để giả completion. Native nonzero không biến thành0;1601/precreation/missing timestamp không fullPASS. NoKill/NoRetry giữ nguyên.

### Thiếu sót xác nhận từ source

1. `Test-ConsumedBinding` chỉ kiểm approvalSHA/runbase/pattern;không kiểm marker.at,staleness,futuretimestamp hoặc relation với launcher start.
2. Expiry chỉ kiểm trước prompt;marker sau khi approval hết hạn có thể bắt đầu runtime-observation clock trước khi launcher/runtime tự reject.
3. Race:marker bị từ chối đúng lúc process vừa thoát có thể đi qua nhánh native exit mà không giữ verdict fail-closed cho observation contract.
4. Accessor HasExited failure chưa có safeUNKNOWN handling riêng.

Các defects này thuộc observer preparation,không có bằng chứng cần sửa PostgreSQL,READY7,adapter hoặc React.

### Revised observer candidate

`build/pre-session4-readiness-20261107-1/capture-once.revised.ps1`

SHA256:`e1d045b452fb9790bfa74b9c27ca01149e1842d3fa201069e1f7743ea5fe0490`.

Diff:`build/pre-session4-readiness-20261107-1/capture-once.revised.ps1.patch`

DiffSHA256:`dc5725df6377b8fa4b471088f97d1611f3544398699795e1cde34ea3c93b5387`.

-Require exactmarker keys(run,at,approvalSha256),correctapproval/runnamespace,validUTCtimestamp,markerAt≥launcherStart,markerAt≤now,age≤300s,marker/now<approvalexpiry.
-Recheckexpiry trong prompt observation. Invalid/expired binding báo explicit phase;không reset timer. Prompt budget300s/runtimebudget1100s/session600s giữ nguyên.
-Native facts và observation-contract verdict tách biệt. Giữ nativeexit0/7…đúng thực tế,nhưng missingruntime binding/invalidphase/unknownnative/invalidExitTime khiến observer exit4. Race không được nâng thànhPASS.
-Handle/owner/cleanup policy không thay. Không thêm observer/launcher retry hoặc foreign/unknown process kill.

**Get-Credential chưa được chứng minh cancellable.** Sau prompt timeout,observer báoUNKNOWN/BLOCKED,noKill;không giả prompt hay launcher đã đóng. Nếu operator bỏ dở,phải có quy trình hủy tại chỗ/kiểm tra độc lập;không tự tái chạy approval cũ. Revised candidate không hứa native completion khi prompt không được hoàn tất trong budget.

## 3. Pinning observer vào future fresh plan

`FUTURE_OBSERVER_BUNDLE_PROPOSAL.json` có SHA256:
`4c00038ed34dcbe142654b770a256f8f2a96e24540e0fb55bf4b838440f4a4d0`.

Đề xuất trust boundary:

1. Genuine future approval phải nêu **externally reviewed bundleSHA +observerSHA +scope**,không chỉ approved=true trong plan. Current offline request không phải executionapproval.
2. Reviewed executor kiểm bundle bytes/hash từ authority độc lập trước parse,kiểm revisedobserver bytes/hash,launcher fixedpath/hash,owner/ACL/canonical/reparse và fresh installed lineage. Không lấy observerpath/expectedhash từ mutableexecutionplan.
3. Chỉ sau approval riêng mới được tạo **newprivate plan directory**,copy exact reviewed observer bytes create-new,revalidate owner/ACL/hash và tạo plan theo existing reviewed contract. Planthamchiếubundle không cấp authority để thay bundle/observer.
4. Launcher vẫn là `scripts/mvp-ui-only-session.ps1`,SHA256`d01b1c6b78ef9cdb07c9a8dd7b3b8977799729d82b32d26c13593084f9f5be86`;oneattempt/create-new và existingcheck-plan/securehandoff/READY/cleanup vẫn bắt buộc. Không đổi600s hoặc chọn fallback runner.

**Chưa copy/activate/chạy revised observer trong một plan nào.** Bundle proposal ghi futureapprovalNOT_GRANTED và không phải source-authority descriptor đang hoạt động.

## 4. Actual Login dependency chain

| File |Actual verified SHA256|Current authority|
|---|---|---|
| `frontend/index.html` | `1e49e388e9330af8cc1e16a73773603ff3f5da25d23fedfcd0ebd939c68d13b3` | Proposed extra dependency; not current authority |
| `frontend/public/favicon.svg` | `0654e9c9d4fed9e1244875e901c80f3e8c66bb5b06cbbd97276c0dc689f55022` | Proposed extra dependency; not current authority |
| `scripts/mvp-ui-only-frontend.mjs` | `cecd399201fde662b701d0ce286d43f317ac22cfb53223683e66be2abda3cba9` | Existing REV10 pin |
| `frontend/src/main.tsx` | `15d22597ed6216783c18850331538d72836ecca79649748b24400ff1d546c6b9` | Existing REV10 pin |
| `frontend/node_modules/vite/dist/node/chunks/config.js` | `c2fcfa51206dc1f8d22120ef4a82af8b9acdc02f4476520b6a0897d12a724ba3` | Proposed extra dependency; not current authority |

Source facts:

-`frontend/index.html` thật khai báo `<link rel="icon" ... href="/favicon.svg">` và entrypoint`/src/main.tsx`.
-Public SVG tồn tại,reviewedbytes chỉ cóSVGrect/path của logo,không phải request URL được phục dựng từ historical evidence.
-HistoricalDEV dùng pinned `scripts/mvp-ui-only-frontend.mjs`:createServer vớiconfigFile:false,rootfrontend,port55173. VìconfigFile:false,normal`frontend/vite.config.ts`(port5173)không điều khiển historicalDEV server.
-Launcher không overridepublicDir;actualVitecode códefaultpublicDir:"public" và resolve theo root. Do đópublic/favicon.svg là legitimate source-declared resource của frontend này;không phải thêm chức năng mới.
-main.tsx/pinnedReactLogin nằm trongREV10 source;index.html/publicSVG vàViteimplementation chunk chưa nằm trong current16/250authority. Package-lock pins không thay việc verify actual installedVitechunk bytes.
-CurrentpolicydenyGET`/favicon.svg`;diagnostic-only declaration không cấp grant. Existingread-onlyAPI/ISOquery behavior không đổi.

**Historical UNKNOWN_DENIED_GET vẫnUNKNOWN**:không córawURL/resourceType nên không thể kết luận request lịch sử làfavicon. Đây là source dependency finding riêng,bây giờ có đủ căn cứ để *đề xuất* exactresourcepin/grant,không để tự mởactivepolicy.

## 5. Exact HTTP resource authority proposal

Prepared descriptor:`build/pre-session4-readiness-20261107-1/EXACT_UI_DEPENDENCY_PROPOSAL.json`.

SHA256:`8e253d63b88a69637fb6c776f8f497ccc2b796c45a7b23285779d216b0f0bd85`.

Đề xuất chỉ thêmresource:

```text
Origin: http://127.0.0.1:55173
Path: /favicon.svg
Methods: GET, HEAD
Query / fragment / userinfo / encoded alias: NONE
Reviewed file: frontend/public/favicon.svg, exact SHA256
Dependencies: exact index/entrypoint/DEV launcher/Vite implementation pins above
```

Không arbitrarySVG/staticfiles,externalorigins,unknownAPI,mutation hoặc allGET.

Review prototype:`exact-resource-review.cjs`,SHA256`5b2ccce5dac4e2cfcfb1717bf7e4bdaadef5fe9e32c4e185dab56b3ec87c3c75`. FixeddescriptorSHA nằm trong code;strictJSON parser,knowncanonical paths,operatorowner/reparse/identity checks,dependencyhashes và two-passverification;proof là WeakMap-branded in-process object,serializedapproved=true hoặc mutableplan hashes không thay thế được. Dependency thay đổi sau proof làm conditionalrequest bịdeny khi recheck.

Policy prototype:`build/pre-session4-readiness-20261107-1/policy.resource.candidate.cjs`.

CurrentpolicySHA:`4e9c282e925f132832a4aa5e3b295b7c040da1b25d35e98a7d4d384d0d9c30e8`.

CandidateSHA:`ba4f653a22a3b96c0c782ce9950c87a53ef85652a54bf394d047927d1ebff073`.

DiffSHA:`dfba32718439b809521ca8ce8a14b96fcb34faee05facd9c74fd5059eda08a59`.

Policy prototype giữdefaultdeny khi không có dependencyproof;chỉ exact reviewedfavicon có thể đi qua trong synthetic candidate-authority model. Existingpolicyvẫnkhôngđổi. Tests không tạo actualapproval hoặc productiongrant.

### Authority-chain gap: BLOCKED for live use

Descriptor purpose làPREPARED_EXACT_DEPENDENCY_NOT_ACTIVATION. Guard/proof chỉ là review prototype;**trusted runtime preflight/host/worker wiring chưa triển khai hoặc phê duyệt**. Active installedauthority chưa pin nhữngextraresources/guard/conditionalpolicy này. Không coi static/prototypePASS là liveauthorizationPASS.

Trước khi deploy cần source-review scope riêng để tích hợp dependency pins vào externally anchored supplemental authority và actual read-only metadata reader,tạo proof trong đúng worker sau fresh source checks,và verify lại trước resourceuse. Không nhận arbitraryproof/IO/hash từplan. Có thể review embedguard trongpolicy hoặc pinnewhelper riêng;cataloguechange phải explicit,không tự dùng unchanged16map để chứa file thứ17.

Vì chain chưa wired/activated,**resource live gateBLOCKED;để nguyên deny**. Không sửaREV10hoặc addresource chỉ vì hypothesis về phiên3.

## 6. Focused offline verification

**37/37PASS,nativeNodeexit0**,0FAIL/skip/cancel.

-Observer old/revised hashes,diff/scope,oneStart/heldhandle/noKill/noRetry.
-ActualrevisedPSfunctions với fakeprocess/streams:24assertions;markerwrongapproval/path/shape/timestamp,stale/future/expired,slowoperator250s,prompt300s,runtime1100s,contractrace,native7preserved,zero/1601/precreation/unknownaccessor,memory-onlyfacts. AST0errors.
-Exactresourceconditionalallow với checkedcandidateauthority;missing/changedasset/index/launcher/Vitehash;driftafterproof;descriptor substitution/fakeapprovedobject;prefix/case/query/credential/external/encodedtraversal;unsafe methods/unknownAPI/DeviceCommanddeny;existing ISOGETremainsvalid;owner/reparse/canonical controls.
-Actualresourcefiles giữ nguyên trước/sau;futuredescriptor không tồn tại tạiactive target.
-Node syntax4filesexit0;independentcurrent288hash proofexit0. Không rerun363unchanged regressions hoặc nativecapability/live acceptance.

Evidence:`focused-final.tap`,`review-evidence.json`,`readiness-proof.json`,`proposal.json` trong`build/pre-session4-readiness-20261107-1/`. Intermediate37/37progresslog giữ nguyên;sau siếtobservercontract đã chạy lạifocused37trên finalbytes. Không failure/nonzero bị che.

Allbrowser/process targets trong tests làfake;PowerShellhost chỉ parse/extract các purefunctions,không invokeobservermain,Start-Process hoặc DEV launcher. Không sandbox/browser/service setup mới.

## 7. Mandatory gates trước phiên4

| Gate |State|
|---|---|
| Currentinstalledsource250/16/288hashes/READY7 |PASS|
| Originalobserverintegrity |PASS|
| Revisedobserverfocusedfunctions |PASS_OFFLINE|
| Revisedobserverexternalapproval/privatepinning |NOT_GRANTED /NOT_ACTIVATED|
| Exactfaviconsourcelegitimacy |CONFIRMED_SOURCE|
| Dependencyauthority/prototypecontrols |PREPARED_OFFLINE|
| Actualresourceauthority+wiring+grant |BLOCKED_NOT_IMPLEMENTED_NOT_APPROVED|
| NaturalEdgegracefulclose |NOT_VERIFIED|
| NewgenuineWebsiteexecutionapproval |NOT_GRANTED|

Các điều kiện phải hoàn tất trước một liveapproval có thể thực thi ngay:

1. Review revisedobserver exacthash/budgets/markercontract,phê duyệt việc dùng privateobserver riêng theo externally pinnedbundle. Không dùngcandidate0a016cũ khi cần các checks mới.
2. Hoàn thiện và review narrowresourceauthority/wiring;phê duyệt exact sourceactivation/pins và focusedinstalledtests. Activefavicondeny không được bypass tronglivesession.
3. Sau hai phần này mới freshsource/runtime/identitycheck và xin genuineone-shotexecutionapproval riêng;threehistoricalapprovals remainconsumed. Không tự tạoapprovalID.
4. Naturalclose chưa verified phải giữfail-closed boundedcleanup/nativebarrier;không quảng bámockPASS làgracefulEdgePASS.

Currentreview chỉ chuẩn bị,không cấp quyền activation hoặc session4.

## 8. Final status

```text
Observer integrity:PASS
Observer revised candidate:PREPARED_NOT_ACTIVATED
Focused offline tests:37/37 PASS
Current source-lineage:PASS (250 baseline,248+2,16 helpers)
Independent hashes:288/288 MATCH
Favicon legitimate source dependency:CONFIRMED
Historical denied GET exact URL:UNKNOWN
Exact resource grant:PROPOSED_ONLY
Live resource authority/wiring:BLOCKED
Natural Edge graceful close:NOT_VERIFIED
Active source/manifest/authority changes:0
Observer copied/executed as runner:0
New Website/DEV sessions:0
New real Edge launches:0
MQTT/DeviceCommand/Pump actions:0
FINAL:PRE_SESSION4_PARTIAL
```

STOP sau readiness review. Không khởi động Website thứ tư,không kích hoạtobserver hoặc resourcegrant.
