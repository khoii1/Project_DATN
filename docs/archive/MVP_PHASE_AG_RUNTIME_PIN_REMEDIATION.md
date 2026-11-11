# Phase AG — Offline PostgreSQL Binary Pin Provenance and Baseline Remediation

Ngày báo cáo: 03/11/2026, UTC+7. Phạm vi: review offline, sửa pin tối thiểu, synthetic tests. Không thực thi phiên AF.

## A. Source và tham chiếu AF

- Approval AG: attachment `744678db-a290-4ff4-a932-c1d3867f9d75/Pasted text.txt`.
- [AF](MVP_PHASE_AF_UI_ONLY_ACCEPTANCE.md) giữ nguyên kết luận **HISTORICAL_WEBSITE_UI_BLOCKED**, dừng trước startup.
- Đã đọc [AE](MVP_UI_ONLY_SUPERVISOR_PREPARATION.md), manifest revision 2, runtime, supervisor và tests liên quan.
- Trước sửa: manifest revision 2 SHA256 đúng `9f3d8e6115975d8739996e461187249c39a44f969c5c31b18045bbfa7bb6bf59`; **250/250 source hashes khớp**, không có source drift.
- Không có AF approval-consumption marker tại đường dẫn theo approval SHA256 `15266e9661283c3c94ec4263d810f953d8e5827421229d9013e4704332f1bf29`; AF báo chưa tạo run/attempt. AG không tạo execution plan, run, attempt hoặc marker mới.

## B. Exact pin defect

Target: `C:\Program Files\PostgreSQL\17\bin\postgres.exe`.

```text
Revision 2 expected (65 hex characters):
94a8ea85cffd4a15c21290ca555a06438d3f7621b001beae6b1373c210d5a1746

Actual / reviewed baseline (64 hex characters):
94a8ea85cffd4a15c21290ca555a06438d3f7621b001bea6b1373c210d5a1746
```

Thừa một ký tự `e` ở vị trí 48, đếm từ 1. Xóa đúng ký tự này làm pin khớp. Phép so sánh này xác định lỗi dữ liệu pin; provenance được đánh giá riêng ở C.

**INVALID_SHA256_PIN_ROOT_CAUSE_CONFIRMED**. Chưa xác định thao tác soạn thảo cụ thể đã chèn ký tự; không dựng lại lịch sử Git không tồn tại.

## C. Independent binary provenance evidence

### File identity hiện tại — chỉ đọc

| Trường | Kết quả |
| --- | --- |
| Canonical path | Exact target trong Program Files, resolved path khớp |
| Size | 9,890,304 bytes |
| File/Product version | 17.2 / 17.2 |
| Creation UTC | 2025-02-18T09:49:11.4882896Z |
| Last-write UTC | 2024-12-17T10:31:04.0000000Z |
| SHA256 | 64-character reviewed baseline ở B |
| Authenticode | NotSigned; không có signer certificate |

Không chạy binary, thay file hoặc permission. Version/timestamps/size và NotSigned không được dùng riêng để kết luận provenance.

### Chuỗi bằng chứng có trước AE

Nguồn chính: `C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793621385609-f8d159` của Phase Y.

1. `manifest.json` pin source preflight `mvp-dev-direct.cjs` bằng hash `a23a8aa468b967bc34366a575ab29902222af6a340f865a7ff1a09b194f4917e`. Source hiện tại khớp hash này và đã chứa **pin 64 ký tự đúng**, trước runtime AE.
2. Actual `preflight()` trong source đó kiểm tra SHA256 của `postgres.exe` **trước** chạy các child đọc control/ACL. Không đổi pin này trong AG.
3. `safety-facts.json` ghi cùng hash 64 ký tự, systemID `7698826681383327460`, state `shut down`.
4. `verification.json` ghi **D_ALL_NATIVE_EXITS_ZERO**: outer PowerShell PID15052, Node preflight PID24268, control child PID13196, NTFS/listener child PID4892 đều native exit0; timeout false, signal/error null, stderr0. Đây là dữ liệu lịch sử Y, không phải preflight mới trong AG.
5. Prepared evidence Y `mvp-real-esp32-1793621402417-43902d/prepared.json` cũng có đúng pin trong `preflight.binaries`; đây là cùng chuỗi thực thi Y, không đếm thành một phép đo độc lập thứ hai.

| Historical evidence | SHA256 hiện tại |
| --- | --- |
| Y diagnostic manifest.json | 824db8d563c65f3a3c362edc46178ebdffed311c0a60a2cd6d7820ce62e81685 |
| Y safety-facts.json | 1d58c540cfc656d1aa1a4b2bb5d73c5ebe797509caf7249bb1d102778ab169e0 |
| Y verification.json | 265c0b936bc6e4468c947f442b2da6f332cb983be8dd5c929644770c76adbc7a |
| Y prepared.json | 6d9673512d44c61580e3401350d00e28324ffba6b162b9870700245823c769d8 |

Báo cáo R2.3B và R2.4 trước AE cũng ghi đúng pin 64 ký tự; chúng chỉ là corroborating documentation, không thay native Y evidence. Git không có reviewed commit history cho runtime AE hiện đang untracked; không dùng Git để xác thực nguồn này. Không tải installer hoặc truy cập mạng để tìm thêm bằng chứng.

**POSTGRES_BINARY_PROVENANCE_VERIFIED** trong phạm vi **continuity với local baseline đã kiểm tra thực tế ở Y**. Đủ bằng chứng hợp lý để sửa lỗi sao chép pin của AE. Không phải vendor signature/supply-chain attestation, không chống sửa đồng thời source/evidence bởi tài khoản đặc quyền. Không có dấu hiệu hash binary thay đổi so với baseline trước AE trong các bằng chứng đã kiểm tra.

## D. Reviewed minimal diff

Chỉ thay đổi active execution source `scripts/mvp-ui-only-runtime.cjs`: xóa đúng một ký tự `e` trong constant `postgres.exe`. Byte comparison phục hồi lại ký tự đó tái tạo đúng SHA256 source AE revision 2, chứng minh không có sửa đổi khác trong file.

```diff
- [path.join(BIN,'postgres.exe')]:'94a8ea85cffd4a15c21290ca555a06438d3f7621b001beae6b1373c210d5a1746'};
+ [path.join(BIN,'postgres.exe')]:'94a8ea85cffd4a15c21290ca555a06438d3f7621b001bea6b1373c210d5a1746'};
```

Thêm offline-only `scripts/mvp-ui-only-pin-audit.cjs` và `.test.cjs` để kiểm tra pin/manifest/provenance bằng dependency-injected synthetic fixtures và read-only filesystem. Không import chúng vào supervisor/launcher hoặc production. Không thay preflight, approval gates, flags, PGDATA, systemID, Prisma schema, firmware hoặc business code.

## E. Runtime constant correction

Runtime constant và manifest runtime pin đều dùng lowercase SHA256 64 ký tự đã review. Ba binary pins khác giữ nguyên. Original preflight đã có pin đúng nên không sửa `mvp-dev-direct.cjs` hoặc các historical contracts.

Runtime dùng equality check với actual SHA256; malformed/wrong pin vẫn fail closed. Offline audit bổ sung kiểm tra format rõ ràng; không giảm hoặc thay cơ chế thực thi. Các pin sai trong snapshot/report lịch sử vẫn giữ nguyên để đối chiếu, không phải alternate active execution path.

## F. Manifest revision 2 → 3

- Giữ nguyên byte snapshot revision 2: `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev2.json` (create-new, không overwrite bằng chứng).
- Active manifest: `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json`, revision 3; giữ version/schema 1 và purpose `SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL`.
- Exact 250 source members không đổi; chỉ entry hash `scripts/mvp-ui-only-runtime.cjs` đổi theo diff một ký tự.
- Chỉ runtime pin `postgres.exe` đổi; ba pins còn lại và `offlineTestHashes` AE giữ nguyên.
- Bổ sung `previousManifestFile`, `previousManifestSha256`, revision reason; không có approval hoặc self-referential hash.
- Các helper/test AG là công cụ review offline, không trở thành dependency của execution path; hashes riêng ở G.
- `preparedAt` giữ thời điểm chuẩn bị baseline AE; ngày review revision 3 ghi trong báo cáo AG này.

## G. Final hashes

| File | SHA256 |
| --- | --- |
| Active manifest revision 3 | 9dba4f40586e31db45f8fac63147d71875bb6260d8a66fa75df9b656460cbc8a |
| Preserved manifest revision 2 | 9f3d8e6115975d8739996e461187249c39a44f969c5c31b18045bbfa7bb6bf59 |
| scripts/mvp-ui-only-runtime.cjs | a179003b30cc9596b8b615477cecd1b04711a915cab001c4a096a00136d39560 |
| scripts/mvp-ui-only-pin-audit.cjs | 5abd42bdc6e452c566301c87d8ffa31f033d3c59af38b4e1ef3541a6615a6fee |
| scripts/mvp-ui-only-pin-audit.test.cjs | 570eb3f2dac9cedeea9fbae162e1532560276f54ab081e255b3a6a09a0a9d87d |

## H. Offline tests và native completion

Final sequential run **129/129 PASS**, fail/cancelled/skipped0, Node native exit0, signal/error null:

- Existing AE suites: **96 tests**.
- New AG pin audit: **18 tests**.
- Existing preflight boundary regression: **15 tests**.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-concurrency=1 --test-reporter=tap scripts/mvp-ui-only-pin-audit.test.cjs scripts/mvp-ui-only-supervisor.test.cjs scripts/mvp-ui-only.test.cjs scripts/mvp-ui-launcher-exit.test.cjs scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-edge-smoke-analysis.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs scripts/mvp-preflight-boundary.test.cjs
```

Cases cover invalid65/nonhex/noncanonical pins, wrong valid-length hash, runtime/manifest mismatch, altered source, duplicate canonical path/traversal/reparse, missing provenance, unexpected source set, actual runtime `checkPlan` with synthetic dependencies, approval before preparation, real 250-entry/four-binary filesystem audit and exact revision lineage. Không chạy real preflight hoặc verifier with credentials.

Evidence: `build/phase-ag-final-1793643328940/{offline-regression.tap,stderr.txt,outcome.json,integrity.json}`. TAP SHA256 `60f1a1c5099a804f04b8321c015331e34dc2f74d603cdd6ad1bb43572e01dc53`; stderr rỗng.

Lịch sử lỗi được giữ: lượt đầu 126/129 có một test fixture cross-realm prototype failure và hai native PowerShell helper timeouts. Chỉ sửa fixture VM của test AG để dùng host-realm source list; không sửa validator thực thi. Lượt tuần tự tiếp theo 128/129, một AST helper hết deadline 5 giây; log `build/phase-ag-pin-1793643270319`. Test supervisor riêng sau đó **42/42 PASS**, log `build/phase-ag-targeted-1793643320006`. Lượt final đầy đủ 129/129 PASS giữ nguyên deadlines/source gates. Không kết luận chính xác nguyên nhân OS timeout hoặc hệ thống đã hết lỗi lâu dài từ một lượt PASS. Không xóa evidence failure để che kết quả.

Node syntax: runtime/audit/test đều native exit0. PowerShell source không thay đổi; AST regressions trong lượt final PASS. Backend `tsc -p backend/tsconfig.json --noEmit` **exit0**; frontend `tsc -p frontend/tsconfig.app.json --noEmit --incremental false` **exit0**.

## I. Final source/binary integrity

Revalidated sau tests: exact **250/250** source hashes, sourceFiles consistency, canonical root paths/no duplicate/traversal/reparse, **4/4** runtime hashes và format, provenance chain, revision-2 snapshot hash. Không đổi source trong test để vượt gate. Native PostgreSQL binary chỉ được đọc/hash, không chạy.

## J. No-live-execution evidence và safety

AG chỉ thực thi Node offline tests/typecheck/syntax và các PowerShell synthetic/AST helper được tests sử dụng. Không khởi động PostgreSQL, gọi pg_ctl start/stop, mở DB connection, API/frontend/browser, MQTT session, decrypt credentials, tạo DeviceCommand/ON/OFF hoặc bật Automation. Không đổi broker/ACL/password, migration/restore/seed, firmware/hardware hoặc cấp nguồn bơm. Không đọc/sửa/xóa tám identity records hoặc 12 readings qua DB.

Không tuyên bố current runtime flags/PENDING đã xác minh: không kết nối runtime/DB trong AG. No-network guard là test-process boundary theo source đã review, không OS packet-capture proof. Synthetic tests và metadata hashing không nghiệm thu real SQL read-only hoặc UI.

## K. Remaining blockers và verdicts

```text
INVALID_SHA256_PIN_ROOT_CAUSE_CONFIRMED
POSTGRES_BINARY_PROVENANCE_VERIFIED
RUNTIME_PIN_OFFLINE_REMEDIATION_PASS
SOURCE_MANIFEST_REV3_250_VERIFIED_PASS
OFFLINE_REGRESSION_PASS
REAL_POSTGRESQL_NOT_STARTED
REAL_POSTGRESQL_READONLY_NOT_VERIFIED
DEV_API_FRONTEND_NOT_STARTED
MQTT_CONNECT_NOT_EXECUTED
MANUAL_WEBSITE_ACCEPTANCE_NOT_EXECUTED
SOIL_SENSOR_QUALITY_BLOCKED
READY_FOR_NEW_UI_ONLY_EXECUTION_APPROVAL
```

Real supervisor/native lifecycle, actual SQL guard across supported application paths, privileges, mappings/readings current baseline, audit before/after, authentication, browser/screenshots và cleanup vẫn phải được kiểm chứng trong phiên riêng. Giữ soil quality blocker; không nâng VERIFIED_LIVE hoặc ACTIVE. Readiness ở đây chỉ là source-pin remediation, không chứng nhận Website hoặc hệ thống production.

## L. Requirements cho approval thực thi mới

Phiên tiếp theo cần phê duyệt mới scope `ONE_DEV_UI_ONLY_HISTORICAL_SESSION`, tối đa một phiên, **manifest revision 3 SHA256 ở G** và exact runtime/source pins mới. Phê duyệt phải bao gồm DEV-only credential handoff/decrypt đã review, manual window hữu hạn, fresh preflight/actual SQL readonly/identity/correlation, manual browser evidence và graceful cleanup. Không dùng lại approval AF hoặc coi AG/manifest là execution approval.

Nếu cần quay về source revision 2 để review: dùng pin/source hash đã bảo toàn và invalidate execution plans; revision 2 vẫn có defect nên không được chạy để nghiệm thu. Không có DB rollback vì AG không mở DB hoặc sửa business data.

**STOP sau AG. Không khởi động phiên UI-only hoặc tự chuyển phase.**
