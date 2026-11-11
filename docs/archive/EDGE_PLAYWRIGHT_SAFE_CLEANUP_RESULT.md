# Edge Playwright safe cleanup result

06/11/2026 (UTC+7). **EDGE_OWNED_PROCESSES_CLEANED**.

?? x?c minh v? x?c nh?n c?10 process Node/Edge thu?c l??t smoke kh?ng c?n ch?y. Ch? force terminate ??ng Edge root PID19708; Node v?8 Edge children t? tho?t sau ??. Kh?ng relaunch browser ho?c s?a c?u h?nh.

## 1. Approval v? evidence

Approval m?i do ng??i d?ng cung c?p: `3c6bfcf5-475c-4ca7-a40c-fec997366713/Pasted text.txt`, scope cleanup verified owned processes only.

SHA256: `20b3b081439b5c8270ec1a38decf0c98bc27dc9fde6b3ad1212a33b1e3b57207`.

??c `EDGE_PLAYWRIGHT_CAPABILITY_RESULT.md`, original identity/attempt/arguments/native events v? saved postrun process snapshot. Evidence m?i create-new, private operator-only:

`C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke\edge-capability-1793934788305-b063f271\cleanup-20b3b081439b`

- `before.json`: read-only snapshot tr??c h?nh ??ng, PID/path/creation/parent/owner v? command-line match booleans.
- `after-and-result.json`: action journal, native exit qua held handles, snapshot sau.
- `independent-reconciliation.json`: ki?m tra ch? ??c ??c l?p, tr?ng th?i k?t lu?n cu?i.
- `post-integrity.json`: hashes/source/evidence integrity sau cleanup.
- `cleanup.ps1`: script ?? AST-check; SHA256 `707d2e27dff13bf0c0c092270bc60237e6272808f58048921599b442c9a9f6df`.

Kh?ng l?u raw command line. Kh?ng x?a profile, logs, attempt marker ho?c evidence c?.

## 2. Identity verification tr??c cleanup

CIM/Windows process APIs x?c nh?n:

- Node19068 ??ng executable `C:\Program Files\nodejs\node.exe`, creation UTC ch?nh x?c `2026-11-06T03:17:49.6704907Z`, parent17896. Parsed arguments kh?p ch?nh x?c private `smoke.cjs --execute <original run>`.
- Edge19708 ??ng executable `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, creation UTC ch?nh x?c `2026-11-06T03:17:51.0849419Z`, parent19068, ??ng private `--user-data-dir=<original run>\tmp\user-data`.
- C?10 process c? owner SID tr?ng operator ???c pin. M?i child kh?p Edge executable, parent19708, creation time sau Edge root v? tr??c saved postrun observation; PID/parent ??i chi?u saved evidence. Profile argument c?ng kh?p.
- Gi? native process handles v? ??i chi?u OS creation FILETIME, kh?ng coi PID ??n l? l? ownership.
- Ngay tr??c m?i thao t?c d?ng, ??c l?i PID/executable/creation/owner/parent; tr??c force termination ki?m tra l?i l?n n?a. Native termination d?ng held handle ?? g?n ??ng process object, kh?ng kill theo t?n ho?c `/T`.

## 3. C?c h?nh ??ng th?c t?

Edge headless kh?ng c? main window v? kh?ng c? context/IPC graceful-close kh? d?ng t? l??t smoke ?? l?i. V? v?y kh?ng ph?t WM_CLOSE ho?c gi? b?o graceful success. Sau fresh identity check, g?i **m?t** `TerminateProcess` tr?n handle c?a PID19708 v?i requested exit code1.

Held handle ?? signaled v? GetExitCodeProcess x?c nh?n exit1; ??y l? m? termination ???c y?u c?u, kh?ng ph?i natural browser exit ho?c capability PASS. Root d?ng l?c `2026-11-06T03:40:02.6489876Z` (10:40:02 UTC+7).

D?ng controlling root tr??c gi?p tr?nh renderer/GPU respawn. Sau ch? bounded,8 child v? Node ??u ?? signaled, n?n kh?ng g?i termination cho c?c PID ??. Kh?ng t?c ??ng observer17896, Agent host, Edge c? nh?n ho?c Chrome.

| PID | Parent l?c snapshot | Exact OS creation UTC | Native exit qua held handle | Ph??ng th?c |
|---|---|---|---|---|
| 19068 | 17896 | `2026-11-06T03:17:49.6704907Z` | 3 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |
| 19708 | 19068 | `2026-11-06T03:17:51.0849419Z` | 1 | TerminateProcess ? TERMINATED_CONFIRMED |
| 17824 | 19708 | `2026-11-06T03:17:51.1723884Z` | 0 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |
| 10592 | 19708 | `2026-11-06T03:17:51.6050224Z` | 0 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |
| 20784 | 19708 | `2026-11-06T03:17:51.6057790Z` | 0 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |
| 22060 | 19708 | `2026-11-06T03:17:51.6677871Z` | 0 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |
| 17400 | 19708 | `2026-11-06T03:17:51.8448589Z` | 0 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |
| 23020 | 19708 | `2026-11-06T03:17:51.8448569Z` | 0 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |
| 19424 | 19708 | `2026-11-06T03:18:51.9193792Z` | 0 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |
| 15824 | 19708 | `2026-11-06T03:20:51.5875141Z` | 0 | Exit sau khi Edge root d?ng; kh?ng terminate ri?ng |

Root termination ???c ki?m ch?ng b?ng held-handle wait/native exit, original smoke producer c?ng ghi th?m actual native-exit event cho Edge. Kh?ng d?a duy nh?t v?o k?t qu? tr? v? c?a l?nh terminate.

## 4. Process ngo?i danh s?ch ?? ???c b? qua

Tree discovery ph?t hi?n th?m `conhost.exe` PID19472, parent19068, creation `2026-11-06T03:17:49.7366255Z`. Process kh?ng thu?c l?p Node/Edge ?? ???c x?c minh n?n ???c ??nh d?u UNKNOWN v? **kh?ng c? h?nh ??ng d?ng nh?m v?o PID19472**. Khi Node tho?t, conhost c?ng kh?ng c?n t?n t?i; native exit ri?ng c?a conhost kh?ng ???c gi?/quan s?t.

Raw automation receipt b?o th? ghi `EDGE_CLEANUP_PARTIAL` v? c?1 skipped unknown, d? to?n b? snapshot sau ?? v?ng m?t. Receipt n?y ???c gi? nguy?n. Independent read-only reconciliation ki?m tra l?i c?11 IDs v? parent graph: t?t c? v?ng m?t, graph remaining r?ng; skipped conhost c?ng ?? tho?t, kh?ng c? unresolved process c?n ch?y. V? v?y k?t lu?n cu?i **EDGE_OWNED_PROCESSES_CLEANED** d?a tr?n b?ng ch?ng m?i, kh?ng s?a raw receipt ho?c gi? ownership c?a conhost.

## 5. Independent postcheck

L?c `2026-11-06T03:41:32.4170647Z` (10:41:32 UTC+7):

- 10/10 verified Node/Edge process kh?ng c?n hi?n di?n v? c? native exit x?c nh?n t? held handles.
- Kh?ng c?n process ho?c descendant trong graph c?a c?c IDs ?? quan s?t.
- Kh?ng c? verified owned process ?ang ch?y; conhost ?? b? qua c?ng v?ng m?t.
- Initial already-exited0; initial identity-mismatch0; gracefully-closed0; force-terminated1; exited-after-parent9; skipped-unknown1, skipped-still-running0.
- Kh?ng th?c hi?n th?m force/kill ho?c browser launch trong postcheck.

## 6. Integrity v? safety

Active revision10 gi? SHA256:
`47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`.

250 source/4 runtime binary/4 offline-test pins v? smoke source/binary pins ??u nguy?n v?n. Original outcome, parent-native v? browser-arguments hashes gi? nguy?n. `native-events.jsonl` ???c **smoke producer t? append m?t exit event th?c t?** khi root tho?t; kh?ng x?a ho?c s?a d?ng l?ch s?. Kh?ng ch?nh profile/settings/environment/firewall/sandbox ho?c dependencies.

Kh?ng launch Edge/smoke m?i; kh?ng start PostgreSQL/API/frontend ho?c MQTT; kh?ng query/ghi database, migration/seed/restore, DeviceCommand, ON/OFF ho?c Automation. Website live attempt v?n0/1.

Cleanup th?nh c?ng kh?ng ??i k?t lu?n smoke: **EDGE_PLAYWRIGHT_CAPABILITY_BLOCKED** v?n gi? nguy?n. Native termination trong cleanup kh?ng ph?i native completion th?nh c?ng c?a original smoke. Kh?ng b?t ??u ch?n ?o?n browser ho?c nghi?m thu Website ti?p theo.

```text
SMART AGRICULTURE ? EDGE CLEANUP
Authorization: APPROVED
Historical Node PID: 19068
Historical Edge root PID: 19708
Historical Edge child count: 8
Process identities verified: 10
Already exited: 0 (before cleanup)
Gracefully closed: 0
Force terminated: 1
Exited after parent termination: 9
Skipped due to unknown identity: 1 (conhost19472; now exited)
Still running (verified owned): 0
Owned process tree remaining: EMPTY, independently verified
Foreign processes affected: 0 targeted
Active manifest: REV10 UNCHANGED
Frontend source: UNCHANGED
Website live attempts: 0/1
New browser launches: 0
PostgreSQL/API/Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
FINAL: EDGE_OWNED_PROCESSES_CLEANED
```

STOP sau cleanup v? b?o c?o. Kh?ng reuse approval n?y cho smoke ho?c browser acceptance.
