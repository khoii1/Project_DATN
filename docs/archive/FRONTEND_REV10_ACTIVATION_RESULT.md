# Frontend revision10 activation result

06/11/2026 (UTC+7). **FRONTEND_REV10_ACTIVATED**.

Đã hoàn tất đúng **một lần atomic activation**, không retry hoặc rollback. Không khởi động Website hay chuyển sang browser acceptance.

## 1. Approval và provenance

- Phê duyệt mới do người dùng đính kèm trong phiên Agent: `18ec841e-0f72-4ecd-b3c3-7441a8eb54ef/Pasted text.txt`, tiêu đề `ACTIVATE FRONTEND REVISION 10`.
- SHA256 thật: `2fae493f3f6b3cc9b9161a3e153f5633917ee2b34266059864ea439029cdd897`.
- Scope: `ONE ATOMIC MANIFEST ACTIVATION`, activation only, không Website startup.
- Approval cũ không được dùng. Approval evidence và create-new one-shot marker đã được tạo trước lần gọi helper duy nhất.

## 2. Pre-execution gates

Tất cả PASS trước activation:

| Gate | Kết quả |
|---|---|
| Active và archive revision9 | Hash chính xác `2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9` |
| Candidate revision10 | Hash chính xác `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb` |
| Source/runtime/offline tests | 250/250 source, 4/4 binaries, 4/4 tests khớp candidate |
| Delta so với rev9 | Đúng 21 source pins, 1 existing-test pin, 1 added offline-test pin |
| Lineage/source catalogue | Revision10 trỏ đúng archive/hash revision9; catalogue khớp reviewed launcher |
| Launcher compatibility | Pure validator chấp nhận source/runtime pins hiện hành; không bypass gate |
| Fixed helper/comparator | Cả ba hashes khớp phê duyệt, AST hợp lệ, comparator trong helper giống bản đã kiểm thử |
| File.Replace | AST có đúng một lời gọi, dùng `NullString.Value`; không Copy/Move fallback |
| Filesystem | Operator/owner khớp; canonical paths, no reparse ở files/ancestors đã kiểm tra; cùng volume `C:\`; files tồn tại, không ReadOnly |
| ACL trước activation | SDDL active/archive/candidate khớp; không sửa ACL |
| Evidence cũ | Temporary lịch sử còn tồn tại và đúng candidate hash; không ghi đè |

Exact helper pins:

```text
build/activate-approved-rev10.fixed.candidate.ps1
6037901bfe7f8cc3dfeb678fad022de76e6060a2cf460f1db0372a0671475382

build/rev10-activation-precheck.fixed.candidate.cjs
85fb753b9a0a66626722365738a5b26dea148f658568324433015a4ea623b969

build/frontend-replacement-acl.ps1
9bf42aadc1a24b4eeba425e8027f1ddcd27ded5b211435f88501990af7cfc79e
```

Danh sách đầy đủ 21 file và cặp hashes giữ trong [FRONTEND_RELEASE_HASH_REVIEW.json](FRONTEND_RELEASE_HASH_REVIEW.json), được kiểm tra lại trước và sau activation. Không chỉnh các pin để ép PASS. Không chạy lại các bộ tests frontend; chỉ kiểm tra bytes/contract và activation được phê duyệt.

## 3. Thực thi và native completion

- Envelope chỉ gọi fixed helper một lần; chính helper có một lời gọi File.Replace, không loop/retry.
- Temporary mới tạo bằng CreateNew trong `docs`, cùng volume; flush rồi hash khớp candidate trước replace.
- `[IO.File]::Replace($temporary, $active, [System.Management.Automation.Language.NullString]::Value)` **trả bình thường, không exception**.
- File.Replace là .NET method, không có process exit code riêng. Read-only Node prechecker exit0; PowerShell execution envelope exit0; independent Python postcheck exit0.
- Receipt UTC: `2026-11-05T17:29:17.6089452Z`, tương ứng **00:29:17 ngày 06/11/2026 UTC+7**. Đây là timestamp ghi nhận thao tác, không phải nghiệm thu clock-health.
- Activation attempt: **1/1**. Không có lần replacement thứ hai hoặc rollback.

## 4. Kết quả độc lập sau activation

| Artifact / gate | Kết quả |
|---|---|
| Active manifest | **revision=10**, bytes bằng candidate, SHA256 `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb` |
| Candidate | UNCHANGED, cùng hash trên |
| Archive revision9 | UNCHANGED, SHA256 `2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9` |
| Source pins | **250/250 PASS** |
| Runtime binary pins | **4/4 PASS**, chỉ đọc hashes, không chạy PostgreSQL |
| Offline-test pins | **4/4 PASS** |
| Reviewed helper pins | Không đổi |
| Auxiliary frontend package.json | Khớp hash đã review |
| Historical temporary artifact | Giữ nguyên bytes/hash |
| Application source/dependencies | Không thay đổi trong phiên activation |

Không tạo revision11. Thay đổi có chủ đích duy nhất ở manifest là active rev9 được thay bằng **đúng bytes candidate rev10**.

### ACL/owner

Owner và group cùng operator SID đã pin; ACE identities, allow/deny, rights và inheritance protection không đổi. ACL vẫn kế thừa, `AreAccessRulesProtected=false`. Comparator độc lập PASS.

Raw SDDL trước:

```text
O:S-1-5-21-1432835263-483988321-3159128977-1001G:S-1-5-21-1432835263-483988321-3159128977-1001D:(A;ID;FA;;;BA)(A;ID;FA;;;SY)(A;ID;0x1200a9;;;BU)(A;ID;0x1301bf;;;AU)
```

Raw SDDL sau:

```text
O:S-1-5-21-1432835263-483988321-3159128977-1001G:S-1-5-21-1432835263-483988321-3159128977-1001D:AI(A;ID;FA;;;BA)(A;ID;FA;;;SY)(A;ID;0x1200a9;;;BU)(A;ID;0x1301bf;;;AU)
```

Khác biệt duy nhất: `DiscretionaryAclAutoInherited` (`D:` → `D:AI`). `rawSddlUnchanged=false`, `authorizationAclUnchanged=true`. Không gọi Set-Acl hoặc bỏ qua thay đổi owner/quyền. Repository ACL có Authenticated Users Modify; không coi đây là private credential storage hoặc chứng minh chống mọi sửa đổi tương lai.

## 5. Evidence

- Run: `build/rev10-approved-activation-1793899756535-a66ae062/`.
- `approval-and-precheck.json`: provenance, hashes, ACL trước và precheck native outcome.
- `activation-envelope-result.json`: helper completed, independent manifest/ACL postcheck, before/after SDDL, exception=null.
- `independent-post-pins.json`: kiểm tra độc lập toàn bộ source/runtime/test pins sau activation.
- Immutable marker: `build/rev10-activation-approved-2fae493f3f6b3cc9b9161a3e153f5633917ee2b34266059864ea439029cdd897.attempt.json`.
- Pinned-helper receipt: `build/rev10-activation-1793899757486-2c8127b9.json`.

Envelope `build/execute-rev10-approved-once.ps1` chỉ thêm one-shot marker/evidence và postcheck quanh đúng helper đã pin; không sửa helper. Evidence lịch sử, helper gốc và candidate đều được giữ.

## 6. Safety và blocker tiếp theo

Không khởi động PostgreSQL, API, frontend, browser hoặc MQTT; không query/write DB, migration/seed/restore, tạo DeviceCommand, đổi credentials/firmware hoặc gửi ON/OFF. Không bật Automation. Đây là các hành động của Agent trong phiên này; không có khảo sát trạng thái runtime của các process sẵn có.

**Live Website attempts: 0/1**, không tạo hoặc tiêu thụ live-session marker. Approval activation này đã dùng 1/1, không dùng lại.

Browser-control chưa được kiểm tra lại vì phê duyệt hiện tại cấm mở browser session. Bằng chứng gần nhất vẫn là `iab unavailable`, registry 0 instances trong [FRONTEND_RELEASE_BLOCKER_RESOLUTION.md](FRONTEND_RELEASE_BLOCKER_RESOLUTION.md). Trước nghiệm thu Website cần browser capability thực sự hoạt động và phạm vi phê duyệt browser/DEV riêng. Manifest active không phải browser acceptance hoặc PROJECT_READY_FOR_DEFENSE.

```text
SMART AGRICULTURE — REV10 ACTIVATION
Authorization: APPROVED
Activation attempts: 1/1
Precheck: PASS
Fixed helper pins: PASS
File.Replace: PASS
Active revision: 10
Active SHA256: 47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb
Revision9 archive: UNCHANGED
Candidate revision10: UNCHANGED
Source integrity: PASS
ACL/owner integrity: PASS (only approved AutoInherited bit differs)
Frontend source changes: 0
Live Website attempts: 0/1
PostgreSQL/API/Frontend: NOT_STARTED
Browser: NOT_STARTED
MQTT: NOT_CONNECTED
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
FINAL: FRONTEND_REV10_ACTIVATED
```

STOP sau activation và báo cáo. Không tự mở Website hoặc chuyển sang browser acceptance.
