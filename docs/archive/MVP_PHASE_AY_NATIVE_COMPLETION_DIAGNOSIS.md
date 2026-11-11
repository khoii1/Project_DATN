# Phase AY — Native completion failure forensics

Ngày05/11/2026 UTC+7. **Existing-evidence review only**. Không chạy lại AX verification/helper/classifier/diagnostic; không thu Event Log/WER/dump mới. Chỉ thêm báo cáo này.

Classification: **CRASH_BOUNDARY_NARROWED_NOT_CONFIRMED**. Xác định được invocation/session báo abnormal completion và phân biệt với helper output/lệnh hậu kiểm khác; **faulting process/module và nguyên nhân vẫn UNKNOWN**. Final: **EVIDENCE_INSUFFICIENT** để xác nhận crashing executable hoặc cho phép resume.

## 1. AX failure và phạm vi bảo toàn

[AX](MVP_PHASE_AX_FINAL_HISTORICAL_UI_ACCEPTANCE.md) giữ nguyên HISTORICAL_WEBSITE_UI_BLOCKED/attempt0/1. Fresh verification đã in observations khớp manifest9/250sources/4runtimebinaries nhưng completion của session32916 là **-1073741819 /0xC0000005**. Không có actual PostgreSQL/native supervised preflight,plan/launcher/password/startup hay manualwindow.

AY không coi approval AX chưa consumed là quyền thử lại. Không sửa AX report,source,manifest,wrapper,hash logic hoặc artifact lịch sử. Không lấy stdout PASS thay process/native completion.

## 2. Existing evidence inventory

| Nguồn đã đọc | Phạm vi sử dụng |
|---|---|
|AX report|Recorded chunk/session/native failure; pre/post-stop observations,attempt0/1|
|AW report và existing pipeline result được ghi trong AX|Historical Vite fix/320tests/10modules; không là native completion evidence cho AX|
|AJ preparation / AK execution / AL reconciliation|Independent native transport contract và hai invocation AK tách biệt|
|AE/AP launcher/native contracts; existing source|Ownership,closed child environment,held handles,timeout/error propagation,auth gates; không execute|
|`build/phase-ar-final-1793812343679/membership-check.cjs`|Exact Node helper file AX gọi; đọc source, không chạy|
|`scripts/mvp-ui-only-runtime.cjs`,supervisor/native-exit source|Helper import graph và sourceFiles/RUNTIME behavior; không require/execute trong AY|
|Existing AK run's target/outer/observer native JSON,launcher receipt,post-review anomaly|Readback PID/parent/native0 fields và giữ separate abnormal post-review|
|Existing local journal, filtered records below|Original AX tool request/result,call linkage,timestamps,source transport; không sao chép cả journal|
|AI sectionC và master report sectionQ|Already-recorded historical Application/WER references; không đọc Event Log hoặc Report.wer mới|

Journal path (đã được AL ghi nhận):

`C:\Users\Acer Swift3\.codex\sessions\2026\08\26\rollout-2026-08-26T10-47-04-01a03c2d-b71e-7cb3-8ee6-f1f9eed11306.jsonl`.

Chỉ lọc records/call IDs liên quan; không công bố các messages/environment/credentials không liên quan. File journal đang được writer sử dụng: một lần .NETReadLines mặc định gặp sharing violation; sau đó đọc bằng read-only FileStream/FileShareReadWrite|Delete,không sửa file/ACL hoặc ngăn writer,đã hoàn tất native0. Sharing violation được ghi nhận, không giả là lần đọc thành công. Đây là đổi cơ chế đọc file evidence, không replay AX command.

## 3. Timeline reconstructed từ original journal

Tất cả mốc sự cố là **05/11/2026**; UTC+7 cột thứ hai. Journal timestamp là thời điểm record/request/result, không tự biến thành OS processStart/crash time.

| Mốc | UTC / Việt Nam | Completion authority / evidence |
|---|---|---|
|Tool request fresh-verification|11:02:11.187Z /18:02:11.187|Journal line30568,customcall `call_b8542386465245098cf7ebe9be255be5`; actual OS start NOT_RECORDED|
|Node helper creation/invocation|NOT_RECORDED|Request source calls absolute node.exe and file helper; no OS PID/spawn record|
|Helper prints membership result|Before outer observations below; exact timestamp NOT_RECORDED|`SOURCE_MEMBERSHIP_250_RUNTIME_PINS_4_PASS` in original tool output|
|Helper completion checked by wrapper|Before outer observations; exact timestamp NOT_RECORDED|PowerShell source checks `$LASTEXITCODE`; no independent held-handle artifact|
|Outer filtered observations timestamp|11:02:19.6238809Z /18:02:19.6238809|Timestamp in printed JSON; not flush/crash time or native PASS|
|Tool yields running session|11:02:21.614Z /18:02:21.614|Journal30570,chunk4942b9,session32916,wall10.0652728s|
|Poll request|Before result below; exact request timestamp not extracted|Customcall `call_510d0506fb9e46ab98f3712eeb44d540` contains write_stdin32916 then a different source-read command|
|Poll completion|11:02:30.963Z /18:02:30.963|Journal30578,chunk7ee6de,exit-1073741819,no additional output|
|Separate source/AW evidence read|Same customcall output,independent exec_command|Chunk802f0b,native0; not failed command replay and not proof32916 succeeded|
|Post-stop metadata observation|11:03:06.3932254Z /18:03:06.3932254|Markerabsent,DEVlisteners0,postmasterabsent|
|Post-stop tool completion|11:03:06.582Z /18:03:06.582|Journal30587,`call_30089b0eed7d42b8b4333ea9542c0986`,chunk57a50b,native0|

The first result lacking exit_code means running/session yielded, **not exit0**. Poll confirms abnormal completion; it does not record actual crash instant or identify an executable. Do not assign the result timestamp to process termination time. Output ordering only bounds what was observed; it does not prove fault occurred after the running result was emitted.

Original source record30568 is4210characters; metadata analysis found file-based membership target and LASTEXITCODE check, no stdin JavaScript pipeline and no Diagnostics.Process held-handle capture. Original output record30578 contains **two separate tool results**: failing poll7ee6de and successful read802f0b. Their codes must not be merged.

## 4. Process / completion matrix

| Boundary | Requested/known executable | PID / parent | Start/end | Actual exit / independent evidence | Missing |
|---|---|---|---|---|---|
|AX command host/shell|PowerShell command body supplied to exec_command; actual OS executable identity not separately captured|NOT_RECORDED /NOT_RECORDED|OS timesNOT_RECORDED; journal request/result times above|Session32916 tool completion-1073741819 confirmed; no independent shell handle|Actual executable/PID,parent,OSstart/end,exception event|
|Membership helper child|Requested `C:\Program Files\nodejs\node.exe` running existing file|NOT_RECORDED /NOT_RECORDED|NOT_RECORDED|PASS output + source LASTEXITCODE gate; **not independently verified native0**|Spawn metadata,held handle/nativeexit,timing|
|Helper import graph|UI runtime/supervisor/API libraries imported as code|Not separate processes|Not applicable|No individual process completion to assert|No basis to blame any imported module|
|Actual supervised PostgreSQL preflight/control children|NOT_STARTED|None|None|NOT_EXECUTED|Not an unexplained crash boundary|
|AX launcher/supervisor/API/frontend/DB|NOT_STARTED|None|None|NOT_EXECUTED|No cleanup/process evidence expected|
|Separate source-read invocation802f0b|Tool-supplied read-only PowerShell body|NOT_RECORDED|Independent OS timesNOT_RECORDED|Its tool native0,not32916's result|No independent executable/module correlation|
|Post-stop metadata57a50b|Read-only tool command|NOT_RECORDED|Timestamp above,not OS start|Its tool native0 confirmed|Not a source/hash gate replay or repair|

**Session ID32916 and chunk IDs are not Windows PIDs.** No old AK PID may fill these missing fields. Tool-output completion is authoritative for its invocation status; it does not identify faulting application/module. Source-level LASTEXITCODE check suggests the helper returned without a detected error before remaining script ran, but that inference is not a replacement for independent child completion.

## 5. Exact source-level reconstruction

The AX wrapper is the existing **inline PowerShell command text in journal30568**, not a saved diagnostic wrapper file with its own process/receipt artifact. Sequence reviewed from that source:

1. ErrorActionPreferenceStop; read manifest9/lineage/source hashes,binary hashes,test hashes and PowerShell executable pin; canonical/reparse checks.
2. Call absolute node.exe with acceptance-offline-guard and existing **file** `build/phase-ar-final-1793812343679/membership-check.cjs`.
3. Check LASTEXITCODE and throw if nonzero.
4. Check operator/root-data ACL,ports/postmaster; read prior reports as files; confirm enforcepre source text.
5. Print filtered JSON observations.

No here-string JavaScript→stdin transport, new .NETProcess capture, parent/child PID log, observer,process-exit artifact or target native transcript was present in this invocation. No Prisma/DB/network/service operation was requested.

Membership helper source reads current manifest and imports UI runtime, calls sourceFiles to enumerate source membership,compares RUNTIME object,then prints a label. It is **not AJ's pure text-only target**: importing runtime brings its library dependencies into Node memory. Imports do not themselves establish that startup functions ran, and no evidence identifies an imported dependency as the crash cause. No process/module repair is justified from this import distinction alone.

## 6. Inventory of already-recorded crash references

No correlated AX Event1000/1001/WER/dump reference was found in the reviewed AX records/artifacts. This means **AX_CRASH_EVENT_EVIDENCE_NOT_AVAILABLE**, not “Windows has no such event”. AY did not query current logs or open WER/dump files.

| Existing report reference | Already-recorded metadata | Relevance to AX |
|---|---|---|
|Master reportQ|Event1000 Record65378,02/11/2026 07:28:00.4703005Z,powershell.exe10.0.26100.9549,ntdll.dll10.0.26100.9711,c0000005,offset0000000000166447,PID21828,processStart07:27:56.6420156Z,ReportId9328e90c-9c4a-448b-a3a2-4f68ae3a4abd;1001Records65379/65381 sameReportId|Earlier diagnostic; no AX PID/time relationship|
|Master reportQ older event|1000Record65022,30/10/2026 10:01:09.7802852Z,powershell.exe/ntdll.dll/c0000005,PID8796,ReportId1d241cd9-73ae-4b89-8a96-e2b424a4c7bb|Older case; not proof Prisma/Node crashed or same bug|
|AI sectionC|Bounded AH Application1000/1001 query had no matching event under available access; existing WER metadata APPCRASH02/11/2026 18:23:35.3649042Z,powershell.exe/ntdll.dll/c0000005,ReportIdc236f626-eccd-4c7f-8d04-23cb967897d8|Contemporaneous with AH only; no AH PID linkage, none for AX|
|Old WER access / dumps|Q reported ReportArchive Report.wer access denied; no dump read. No usable dump path/call-stack artifact for AX found|No new access attempted; no memory dump may be published|

Old correlated application name/module/offset cannot be transferred to a new incident. Even a confirmed faulting ntdll module is not proof of the origin of memory corruption.

## 7. AK/AL comparison and independent evidence readback

Existing AK run: `C:\DATN\test-instances\phase13-3b\hash-only-native-1793646806048-57cd748a21d6`. AY read existing native JSON/launcher receipt/anomaly without invoking target/classifier.

| Invocation | Transport | Native evidence | What it proves |
|---|---|---|---|
|AK approved diagnostic04f249|Pinned launcher→Nodeobserver→PowerShell-File→Nodefiletarget|Target2368,parent13664,exit0;outer13664,parent16784,exit0;observer16784,parent12008,exit0;ALjournal linkage launcher12008/tool0|Four completion boundaries historically verified for that invocation only|
|AK separate post-review466e8a|PowerShell here-string/stdin→Node|Tool-1073741819,no independent outer/NodePIDs; anomaly artifact preserves distinction|Post-review abnormal,process/module unknown; does not invalidate or replace04f249's exits|
|AX session32916|PowerShell command→Node **file** helper; no observers|Tool-1073741819; helper output/LASTEXITCODE logic only|Abnormal AX completion; no same-stdin-transport finding|

Existing target-native JSON: target2368 OSstart19:13:27.1857549Z/end19:13:27.7347715Z,parent13664,independentNativeExittrue/code0. Outer end19:13:27.786Z; observer OSstart19:13:26.1390066Z/end19:13:27.8048563Z; launcher receipt12008 at19:13:26.1028301Z. These are **02/11/2026 UTC**,03/11UTC+7,not AX times/PIDs. AL independently reconciled tool04f249/466e8a in journal; its historical verdict remains unchanged.

AJ/AK scripts use held .NETProcess/ChildProcess handles,explicit exit/error/timeout and outer linkage; current AE/AP launcher similarly captures actual supervisor native exit. AX stopped **before using that reviewed supervised path**. Existing AJ pin set is for older manifest4; it is not a drop-in approval/executor for current9 and was not run or repinned in AY.

Conclusion: successful file-based AK chain does not cure AX; shared exit code does not prove shared root cause. AX is also file-based at the Node helper boundary, so “use a file instead of stdin” alone is not an evidence-based fix for this occurrence.

## 8. Additional AY read-invocation anomalies — separate incidents

While reviewing existing files, AY observed native-1073741819 from these **read-only report/metadata invocations**, not AX replay or deliberate crash tests:

- AJreport read: chunk52379a.
- AKreport read: chunkae301a.
- Journal reference inventory/old crash-reference read: chunka5560b.

ALreport read9c8308,shared-reader metadataa34066,selected original-record read33ebab and later source/reference reade0d9b9 completed native0. File-sharing error in an intermediate ReadLines attempt was explicit and not reclassified as successful; subsequent artifact reads in that same invocation did succeed.

The failing AY read requests did not explicitly invoke the AX membership helper/Node target. This shows that the observed status is not unique to AX's verification content; **it still does not identify the OS crashing process or prove a common defect**. No PID/module/independent native handles were captured for these reads. AY does not label those entire read invocations PASS because text was output. Correlation uses existing primary records, with successful file-read completion distinguished from observed contents of abnormal reads. No new diagnostic attempt created.

## 9. Confirmed facts / hypotheses / evidence gaps

**Confirmed:** original AX call/result linkage,exact source transport,session32916 abnormal completion,post-stop separate native0,attempt0/1,absence of independent AX native artifacts,old AK chain and separate post-review distinction. No AX startup or source changes were executed by Agent.

**Source-level inference only:** helper may have completed exit0 before final observations because source checks LASTEXITCODE. This does not prove its independent native exit.

**Unproven hypotheses:** outer PowerShell shutdown/stream cleanup,tool host/session handling,Node/native-library cleanup,Windows runtime/DLL issue. No evidence picks one. Do not identify ntdll.dll,powershell.exe,node.exe,Prisma,Vite,MQTT,PostgreSQL or firmware as the confirmed AX crashing component.

**Missing:** actual AX shell/Node/helperPID,parent,OSstart/end,held native exits,signal/error/timeout artifacts,correlated Event1000/1001 or WERReportId/module/offset/call stack. Printed timestamp is not exception time. No original per-process artifact exists to reconcile into a full nativePASS with current evidence.

**Classification:** CRASH_BOUNDARY_NARROWED_NOT_CONFIRMED — narrowed to the particular command-completion invocation after successful-looking observations; **not narrowed to a proven executable/module**. Native failure cause UNKNOWN. No wrapper/source fix or live approval follows from this classification.

## 10. One minimal next step — PLAN ONLY, separate approval required

Recommend **one bounded read-only Application Event1000/1001 metadata collection for the AX time window**, before proposing any command replay. No fresh execution is authorized by AY.

Proposed exact scope:

1. One approved collector invocation,maximum1/no retry. Application channel only,IDs1000/1001,**05/11/2026 11:01:50Z–11:03:10Z** (=18:01:50–18:03:10UTC+7),maximum50records combined. No widening window/channel automatically. No events→CRASH_EVENT_NOT_FOUND_IN_APPROVED_WINDOW,not a successful runtime diagnosis.
2. Allowed process: the read-only Windows PowerShell collector at the existing absolute system path,launched with a reviewed held-handle observer for its native completion. No membership helper/hash-only target,pg_controldata,Prisma,Vite,Node application,network/service startup. Collector code/field filtering/native capture must be reviewed before that future single invocation; **no new collector implemented or run in AY**.
3. Collect only recordID/time/provider/eventID and named fault-application/module/path/version/exception/offset/PID/process-creation/ReportId fields actually present. Missing fields stay NOT_RECORDED. Extract event XML metadata with a field allowlist; do not publish raw dumps,environment,memory or unrelated event messages. Report collector PID/parent/start/end/nativecode/error/timeout separately from historical event PIDs.
4. Finite total collector deadline30s,at most1 child,output capped64KiB. Parent holds handle and records native exit independently; stdout alone never PASS. Timeout→UNKNOWN,no retry/force-kill or fallback. Use private approved metadata evidence storage; no credentials. Close event-reader objects/owned handles after known completion; no services to stop.
5. Use current privileges; accessdenied→STOP,request explicit operator collection/elevation separately,never auto-elevate. No registry/WER settings/debugger/service changes,crash-dump access,new WERfile scan or deliberate reproduction.
6. Correlate event fields against available AX timing/transport. Because AX actual PIDs are missing, mere nearby PowerShell/ntdll event may remain a candidate; no forced component confirmation. Whether data is sufficient must be assessed honestly. A failed/unknown collector does not authorize repeating AX or starting DEV.

This is the **only next action proposed**, not an execution instruction and not an implicit approval. It is smaller than reproducing the failure and may supply a faulting-process reference without running the failed workload again. No fresh Event Logs,WERmetadata,dumps or diagnostic executables were collected/launched in AY.

## 11. Final safety / verdict

No AX command/helper replay,classifier execution,hash re-verification/test suite,new plan/attempt/consumption marker,PostgreSQL/API/frontend startup,Website login/Edge,MQTT,production access,DDL/DML/migration/restore/seed,credentials/ACL/registry/service changes,DeviceCommand/ON/OFF,Automation,ESP32/firmware/hardware/pump action. No current-machine process/listener/database/runtime flags rechecked for this evidence-only report. AX post-stop0listeners remains a historical observation,not fresh AY status.

No historical report/artifact modified. Only this markdown report created through the existing apply_patch report-writing workflow; no fulljournal copy,secret or dump content stored. No tests run because no implementation change and new execution not authorized.

```text
PHASE AY RESULT
Existing AX invocation/timeline: RECONSTRUCTED
AX actual process PIDs / independent child exits: NOT_AVAILABLE
AX correlated crash event/module evidence: NOT_AVAILABLE
Comparison with AK/AL: COMPLETE; invocations kept separate
Root-cause classification: CRASH_BOUNDARY_NARROWED_NOT_CONFIRMED
Faulting executable/module: NOT_CONFIRMED
Native failure cause: UNKNOWN
Failed AX command replay: NOT_EXECUTED
New diagnostic attempts:0
Fresh Event Log/WER/dump collection: NOT_PERFORMED
Source/manifest changes:0
AX attempt history:0/1 UNCHANGED
PostgreSQL/API/frontend/Edge/MQTT: NOT_STARTED / NOT_CONNECTED by Agent
DeviceCommand/Pump ON/OFF:0 ACTIONS
Automation: NOT_ENABLED
Next action: bounded Event1000/1001 metadata collection PLAN_ONLY
FINAL: EVIDENCE_INSUFFICIENT
```

**STOP after Phase AY. Không tự chuyển phase hoặc thực hiện đề xuất.**
