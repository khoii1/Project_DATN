# Remediated Edge/Playwright capability smoke

Ngày 06/11/2026, UTC+7. **EDGE_PLAYWRIGHT_CAPABILITY_VERIFIED** cho đúng một phiên Edge `about:blank`. Không thực hiện Website acceptance.

## 1. Authorization và private run

Approval mới: attachment `99bcc29e-537b-4e67-8dea-3901cc312809/Pasted text.txt`, SHA256:
`27bd8294147a651064a98ff55fc6ecea3baadbb3c5226454b846f87db2bbf252`.

Phạm vi đã dùng: một Edge capability smoke, tối đa30 giây observation, cleanup riêng có giới hạn chỉ cho verified-owned processes. Không dùng lại approval hoặc attempt của smoke cũ.

Private run mới:
`C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke\edge-remediation-run-a02b65a35eaf4b84b5396ac39a2e0bcb`

Run/tmp/user-data được tạo mới, không overwrite; owner SID `S-1-5-21-1432835263-483988321-3159128977-1001`, protected operator-only FullControl DACL. Parent recheck known folders, canonical paths, owner/DACL của private directories và reparse trên ancestors trước attempt. Không sửa ACL hiện hữu.

Evidence: `plan.json`, `preflight.json`, `environment-receipt.json`, `ownership-baseline.json`, `approval-attempt.json`, `attempt.json`, `identity.json`, `browser-arguments.json`, `native-events.jsonl`, `outcome.json`, `native-before-cleanup.json`, `parent-native.json`, `cleanup-journal.json`, `independent-reconciliation.json`, private diagnostics, PNG và synthetic TAP. Không lưu application credentials.

## 2. Offline integration và source hashes

Đã đọc remediation/capability/cleanup/preparation reports và nguồn private helper. Chỉ thêm executor mới trong private run, không sửa old helper/launcher, Website source, dependencies hoặc manifest.

`smoke.cjs` mới dùng nguyên candidate đã pin, nhập receipt từ parent và so sánh closed environment đúng8 keys. Parent capture `.NET GetFolderPath` và current SID trước khi clear env. Native observer vẫn dùng executable/environment/profile gates và one-shot process boundary từ source cũ; alternate child APIs bị chặn trước khi import Playwright. Native spawn thứ hai bị từ chối kể cả internal retry path của library.

| Source/binary | SHA256 |
|---|---|
| Approved environment candidate | `b1387aaf769b20b7a9fa65a371c8b8a500accdbd9d05c1c99c9e98f7d5f09b5d` |
| Approved synthetic source | `780dde5a22579d6cb8afa61b30717a0ef998d6030143dc11153ed153713d9425` |
| New private smoke.cjs | `40469b2046d76c8abd46abd414cbb6768f82d57e89ef7b74330cb7ec15f79d9e` |
| New private run-once.ps1 | `1f41a49a83cf7ebfd44cd132d01395e632d6dd5c78108b1b4c3d0a563be5bbd6` |
| New integration.test.cjs | `3451a02dc4cb4bf094c79829c708e6b0ec7b6033706c3ce5e14371b159eed18a` |
| Edge156.0.4314.58 | `d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b` |
| Environment receipt | `4dc3addfcdef78085a6b762a04e6d848a17e22594b88e47f6467d5e39b81891c` |

Playwright-core **1.62.1**. Executor/launcher/Node/library/original helper/manifest hashes pin trước execution trong `plan.json`, không tự coi hash mới là approval mở rộng.

Offline verification: **41/41 PASS** =29 candidate regressions +12 integration tests. Native test exit0; Node syntax exit0; PowerShell AST0 errors. Fake integration kiểm tra chính các hàm integratedPlan/guardedTrace/runFlow của executor mới; không launch browser. Parent timeout/cleanup boundaries được kiểm tra AST/source; OS native lifecycle được kiểm chứng bằng phiên thật bên dưới, không suy từ tests giả.

## 3. Environment thực tế và security

| Biến | Giá trị |
|---|---|
| USERPROFILE | `C:\Users\Acer Swift3` |
| APPDATA | `C:\Users\Acer Swift3\AppData\Roaming` |
| LOCALAPPDATA | `C:\Users\Acer Swift3\AppData\Local` |
| TEMP/TMP | private run `\tmp` |
| SystemRoot/WINDIR | Windows known folder |
| PATH | Chỉ Windows `\System32` |

Explicit userDataDir: private run `\tmp\user-data`, không personal Edge profile. Headlesstrue, chromiumSandboxtrue, launch timeout18000ms, private viewport1280×720, serviceWorkersblock. Không args mới, TCP CDP, fallback/channel hay sandbox change. Actual browser args có đúng private user-data-dir và remote-debugging-pipe; spawn gate kiểm tra chúng trước native launch.

Không kế thừa JWT, DB/MQTT credentials, application env hoặc NODE_OPTIONS. Node parent nhận cùng8-key environment. Page route abort sau context creation. **Không gọi đây là network-isolated:** Edge vẫn chạy dưới Windows account của operator, có thể truy vấn OS/account và background network; không có firewall/OS isolation mới.

## 4. Actual browser result

Timeline UTC:

| Event | Time |
|---|---|
| Playwright launch-start | `2026-11-06T05:37:52.928Z` |
| Native spawn request | `05:37:52.950Z` |
| Native direct-child handle event | `05:37:52.961Z` |
| Edge OS creation | `05:37:52.9543182Z` |
| Edge OS exit | `05:37:55.2186639Z` |
| Node native event observes Edge exit0 | `05:37:55.253Z` |
| Context close completed | `05:37:55.261Z` |
| Node OS exit | `05:37:55.2815763Z` |
| Parent final native receipt | `05:37:56.0311253Z` |
| Independent reconciliation | `05:38:28.4905770Z` |

Actual launches **1/1**, no retry/fallback. Parent observation3027ms; cleanup749ms. Outer invocation observed parent native exit0. `launchPersistentContext` trả context, page usable; `page.url()` đúng `about:blank`. DOM: readyState`complete`, root`HTML`, title rỗng, bodyChildren0. Assertions PASS; context graceful close một lần, không timeout.

Ảnh thật `about-blank.png`: PNG signature/dimensions/hash PASS, **1280×720,4254 bytes**; đã mở kiểm tra trực quan, trang trắng đúng about:blank. SHA256:
`3878570f4a62a0d65f57cf1754e0269e56ec797f4e36e26b44c172eb6e800401`.

Đây là screenshot capability, không phải ảnh Website hoặc dữ liệu cảm biến. Captured Edge diagnostics0 bytes; Node diagnostic rỗng. Không kết luận stderr lịch sử cùng một root cause chỉ vì lần này không tái hiện.

## 5. Native completion và cleanup

| Process | Parent | Native exit | OS timestamp |
|---|---|---|---|
| PowerShell observer22360 | outer tool host | 0, quan sát bởi caller | OS exit time riêng của observer không được held-handle capture |
| Node23660 | 22360 | 0 | VALID, independent held handle |
| Edge root23748 | 23660 | 0 | VALID, independent held handle |
| Edge child13108 | 23748 | 0 | VALID, independent held handle |

Parent giữ3 native handles, dùng OS creation FILETIME, owner SID, executable, parent graph và profile/script identity; không dùng JSON success thay native completion. `osExitTimeUtc` tách `observedCompletionUtc`, không nhận zero/1601 thành timestamp hợp lệ.

Có6 candidate descendant IDs bị bỏ qua vì không pin/verify đủ identity/owner hoặc đã thoát:3832,4960,3944,20488,23996,21856. Không terminate chúng; không gán native exit0 cho các process không có held-handle evidence. Một số sandbox/helper process không thỏa operator identity; không coi đây là browser launch failure hoặc sửa ACL/security để vượt gate.

**Không force terminate process nào.** Flow graceful-close thành công, root/Node/held child tự exit0. Cleanup journal không có TerminateProcess action. Immediate graph và unknownStillRunning đều rỗng. Independent read-only reconciliation kiểm tra toàn bộ9 observed/candidate IDs, parent graph và mọi Edge private-profile matches: **0 remaining**. Không có unresolved ownership process còn chạy; foreign processes targeted0.

Cleanup chỉ đọc/đối chiếu metadata; không kill theo tên hoặc tree chưa xác minh. Không dùng exit codes chưa quan sát của sandbox descendants làm bằng chứng. Kết luận tree-empty dựa snapshot độc lập, không dựa giả định mọi child đều exit0.

## 6. Integrity, interpretation và điểm dừng

Postcheck: manifest revision10 SHA256 `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`;250 source pins +4 runtime binary pins +4 offline-test pins **0 drift**. Tất cả13 executor/library/source/binary pins trong plan **0 drift**. Không sửa/xóa evidence cũ.

Lần thực tế này chứng minh đường Edge156 + Playwright1.62.1 với environment đã sửa hoạt động cho capability smoke. Giả thuyết environment được củng cố: old lookup/handshake failures không tái hiện. Đây không phải thử nghiệm kiểm soát đủ để quy mọi stderr cũ cho một nguyên nhân, cũng không phải bảo đảm ổn định lâu dài hoặc Website acceptance PASS.

Không start PostgreSQL/API/frontend, không connect MQTT, không DeviceCommand/ON/OFF/Automation/hardware. Website live attempts vẫn0/1. Approval smoke đã dùng1/1; không được retry hoặc chuyển sang Website acceptance. Cần phiên Website được phê duyệt riêng cùng read-only browser adapter/gates trước khi nghiệm thu19 trang.

```text
SMART AGRICULTURE — REMEDIATED EDGE SMOKE
Authorization: APPROVED
Launch attempts: 1/1
Environment remediation: PASS
Synthetic integration tests: 41/41 PASS
Edge launch: PASS
Playwright handshake: PASS
Browser context: PASS
about:blank: PASS
DOM read: PASS
Screenshot: PASS
Native completion: PASS (Node/Edge held handles; parent exit0)
Cleanup: PASS
Owned processes remaining: 0
Foreign processes affected: 0 targeted
Manifest: REV10 UNCHANGED
Frontend source: UNCHANGED
Website live attempts: 0/1
PostgreSQL/API/Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
FINAL: EDGE_PLAYWRIGHT_CAPABILITY_VERIFIED
```

STOP sau smoke/cleanup/report. Không tự mở phiên Website.
