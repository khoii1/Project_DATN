# Frontend release blocker resolution

06/11/2026 (UTC+7). **Offline diagnosis + preparation only.** Không activation thật hoặc live retry.

## A. File.Replace — nguyên nhân CONFIRMED

Môi trường kiểm thử: Windows PowerShell `5.1.26100.9711`, CLR `4.0.30319.42000`.

- `$temporary` và `$active` được dựng lại theo đúng biểu thức trong helper gốc; cả hai có kiểu `System.String`, canonical absolute paths trên cùng volume `C:\`. Temporary cũ và active đều tồn tại, attributes `Archive`, không phải ReadOnly.
- Owner khớp operator; ACL kế thừa cho Administrators/SYSTEM FullControl, Users ReadAndExecute, Authenticated Users Modify. Không sửa ACL hoặc thử ghi lên manifest để kiểm tra quyền.
- Trong lời gọi static .NET nhận tham số `string`, PowerShell biến `$null` thành `""`. Chứng minh bằng `String.CompareOrdinal($null, '') == 0`, trong khi typed CLR null so với `''` trả giá trị nhỏ hơn 0.
- Gọi `File.Replace` với `$null` trên hai JSON giả đang tồn tại tái hiện đúng lỗi **“The path is not of a legal form.”** Source/destination giữ nguyên hash sau exception.
- Cùng thao tác với backup path hợp lệ thành công: destination nhận bytes source, backup giữ bytes destination cũ.
- Cùng thao tác với `[System.Management.Automation.Language.NullString]::Value` thành công mà không tạo backup.

Nguyên nhân: **backup-path `$null` bị bind thành chuỗi rỗng, sau đó .NET chuẩn hóa chuỗi rỗng như một đường dẫn không hợp lệ**. Không phải thiếu source/destination, khác volume hoặc lỗi hash.

Exception chain của phép tái hiện dummy:

| Cấp | Type / HRESULT | Vị trí |
|---|---|---|
| PowerShell wrapper | `System.Management.Automation.MethodInvocationException`, `-2146233087` | Method invocation / PowerShell interpreter |
| Inner/root | `System.ArgumentException`, `-2147024809` (`0x80070057`) | `Path.NewNormalizePath` → `GetFullPathInternal` → `File.InternalReplace` |

Full message, stack trace và ScriptStackTrace được lưu trong evidence JSON. Full exception chain của lần activation lịch sử không được lưu lúc đó; chain trên là **tái hiện dummy mới**, không được gán ngược làm log lịch sử.

## B. Bản sửa tối thiểu đã chuẩn bị

Thay đúng argument của atomic replacement:

```powershell
[IO.File]::Replace($temporary, $active, [System.Management.Automation.Language.NullString]::Value)
```

Không có Copy/Move fallback, không dùng `ignoreMetadataErrors=true`.

Kiểm thử cũng phát hiện `File.Replace` thêm cờ DACL `AutoInherited` (`D:` → `D:AI`) trên file giả. Owner, group và ACE permissions giữ nguyên, nhưng phép so sánh raw SDDL tuyệt đối của helper cũ sẽ báo fail sau một replacement thành công.

Bản chuẩn bị so sánh descriptor chính xác sau khi bỏ **duy nhất** cờ `DiscretionaryAclAutoInherited` trong các bản sao descriptor trong bộ nhớ. Không gọi Set-Acl; không đổi quyền hoặc inheritance protection. Owner/group, ACE identities/allow-deny/rights, cờ protected và các metadata flags khác vẫn phải khớp. Receipt ghi cả raw SDDL trước/sau và `rawSddlUnchanged`, không gọi hai SDDL khác nhau là byte-identical.

Helper mới bắt buộc nhận approval file/hash mới, từ chối hash approval activation cũ. Companion precheck cũng kiểm tra approval mới, không giữ hardcoded approval cũ làm quyền thực thi. Không tạo approval giả hoặc chạy hai helper này.

Artifacts chuẩn bị:

| Artifact | SHA256 |
|---|---|
| `build/activate-approved-rev10.fixed.candidate.ps1` | `6037901bfe7f8cc3dfeb678fad022de76e6060a2cf460f1db0372a0671475382` |
| `build/rev10-activation-precheck.fixed.candidate.cjs` | `85fb753b9a0a66626722365738a5b26dea148f658568324433015a4ea623b969` |
| `build/frontend-rev10-activation-fix.patch` | `516ad379419f08adc3b8e5511c0c6ebc72cc7312c5d3cf9a0f38ccf577881b5c` |
| `build/frontend-replacement-acl.ps1` — pure comparator | `9bf42aadc1a24b4eeba425e8027f1ddcd27ded5b211435f88501990af7cfc79e` |
| `build/frontend-replace-dummy-tests.ps1` | `697f9a4bff59dea633dc6d7df8d27e4b0c16a010d38d4b48141b25da95866924` |

Helper lỗi gốc `build/activate-approved-rev10.ps1` giữ nguyên SHA256 `a84d26f9295c250c5a44dabf1fb2d4671fd9a986b238a22d1436089e3856d72c`. Patch chưa áp dụng vào helper gốc. Helper fixed v1 được giữ riêng khi bổ sung fresh-approval handoff; không xóa evidence.

## C. Dummy regression tests

**11/11 PASS; native exit0.** PowerShell AST và Node syntax của prepared helpers: PASS. Không chạy toàn bộ activation helper; chỉ trích xuất và thực thi chính xác biểu thức replacement của candidate với các biến trỏ vào dummy files, sau guard giới hạn đường dẫn.

Các trường hợp:

1. Phân biệt PowerShell null/empty-string và typed CLR null.
2. `$null` tái hiện ArgumentException; source/destination không mất bytes.
3. Backup path hợp lệ: new destination/old backup khớp hashes.
4. Typed-null: replacement thành công, JSON đúng, access ACL tương đương.
5. Thiếu source: exception, destination không đổi.
6. Thiếu destination: exception, source không bị tiêu thụ.
7. Comparator từ chối thay đổi owner/group/protection/rights, ACE mới và deny thay allow.
8. Chỉ khác bit AutoInherited được chấp nhận, vẫn quan sát được raw SDDL khác nhau.
9. Dummy-path guard chặn manifest thật trước replacement.
10. Biểu thức replacement của candidate chạy đúng trên dummy; comparator giống bản đã test, chỉ chuẩn hóa CRLF/LF khi đối chiếu source text.
11. Candidate giữ hash/archive/post-replacement guards, yêu cầu approval mới, không Copy/Move fallback.

Evidence cuối:
`build/frontend-blocker-resolution-1793899125486/` gồm `dummy-results.json`, `fixture-final-hashes.json`, `safety-and-fix-hashes.json`. Thư mục con `synthetic-json-only` chỉ có JSON giả, không chứa nội dung database/manifest/credential dự án.

Giữ các evidence trước: lượt đầu 6/7 phát hiện khác biệt ACL flag; sau comparator 9/9; lượt mở rộng 10/11 do đối chiếu CRLF/LF, sau sửa phép so sánh source đạt 11/11. Không che failure bằng retry trên manifest thật; mọi lần File.Replace trong phiên này đều trên dummy files mới.

## D. Browser-control

- Đã đọc Browser skill và troubleshooting, dùng browser-client qua công cụ được hỗ trợ.
- `agent.browsers.get("iab")` vẫn trả **`Browser is not available: iab`**.
- `agent.browsers.list()` trả **0 instances**, `browserIds=[]`. Client/tool callable không đồng nghĩa đã có backend instance kết nối.
- Quyền truy cập backend: **NOT_VERIFIED**. Không có lỗi permission-denied để kết luận người dùng thiếu quyền. Missing condition được chứng minh là chưa có browser instance khả dụng qua registry được cung cấp cho Agent.
- API `refresh` không được facade hiện tại hỗ trợ; không tiếp tục thử các phương thức khởi tạo không được cung cấp. Không đổi backend, cài extension hoặc chạy Playwright/CDP/headless thay thế.
- Không thể mở `about:blank`, nên navigation/click/viewport/screenshot/Network capability đều NOT_VERIFIED. Không khởi động Website để thử.

Hướng cần thiết: môi trường Agent phải cung cấp và kết nối được browser backend `iab`; sau đó mới kiểm tra `about:blank`. Nếu phiên VS Code hiện tại không expose backend này, cần dùng/kết nối một phiên Agent có browser-control được hỗ trợ. Chỉ mở cửa sổ Edge thông thường không đủ. Công cụ hiện có không expose thao tác cấp quyền/đăng ký backend hoặc tên setting cụ thể; không đoán rằng một toggle/extension nào sẽ sửa được lỗi, và không tự cài đặt.

## E. Safety và bước phê duyệt tiếp theo

Đọc lại 250 source pins, 4 runtime binary hashes và 4 offline-test pins: tất cả vẫn khớp candidate; không chỉnh frontend, dependencies, firmware hoặc runtime policy. Không thực thi PostgreSQL binaries, query database, MQTT hoặc Website.

- Active và archive rev9 vẫn `2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9`.
- Candidate rev10 vẫn `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`.
- Temporary activation lịch sử còn nguyên. Không dùng lại approval cũ, không tạo live plan/attempt marker. Live Website **0/1**.

Approval tiếp theo, nếu người dùng muốn xử lý activation độc lập: **cho phép dùng đúng hai prepared helper hashes ở mục B, revalidate operator/paths/ACL/pins và thực hiện đúng một atomic activation rev9 → exact candidate rev10, với approval file/hash mới**. Chỉ cho phép khác bit AutoInherited như đã thử; mọi khác biệt quyền hoặc owner phải dừng. Không kèm Website/DB/browser startup hoặc tiêu thụ live attempt. Đây mới là đề xuất, chưa phải approval đã cấp.

Nghiệm thu Website vẫn bị chặn cho tới khi browser-control thật khả dụng. Bộ dummy tests không chứng minh activation thật hoặc browser acceptance đã PASS.

```yaml
File.Replace root cause: CONFIRMED
Dummy replacement tests: PASS # 11/11, native exit0
Activation fix: PREPARED
Active manifest: REVISION 9 UNCHANGED
Candidate revision10: UNCHANGED
Browser control: UNAVAILABLE
Browser blocker: "iab unavailable; available browser instances = 0; backend authorization not verified"
Live Website attempt: 0/1 UNCHANGED
Frontend source: UNCHANGED
Next approval required: "One activation-only operation using the reviewed fixed helper hashes and a new approval; no services or live session"
FINAL: RELEASE_BLOCKERS_REMAIN
```

STOP. Không chạy prepared activation helpers, không kích hoạt manifest thật hoặc chuyển sang nghiệm thu tự động.
