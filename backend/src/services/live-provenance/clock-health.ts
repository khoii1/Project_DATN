export interface ClockHealth {
  health: "HEALTHY" | "UNHEALTHY" | "UNKNOWN"; reason: string;
  source: string | null; lastSuccessfulSync: string | null; lastSyncError: number | null;
  lastSuccessfulSyncBasis: "STATUS_AGE_APPROXIMATE";
  leapIndicator: number | null; stratum: number | null; offsetMs: number | null;
  checkedAt: string; ttlMs: number; clockJumpDetected: boolean;
  assurance: "SHORT_TERM_READ_ONLY_MEASUREMENT"; longTermStability: "NOT_VERIFIED";
}
export type TimeReader = () => Promise<{ status: string; peers: string; stripchart: string; statusReadAt?: string }>;
const field = (text: string, key: string) => text.match(new RegExp(`^${key}:\\s*(.+)$`, "mi"))?.[1]?.trim() ?? null;
const numeric = (text: string | null) => text === null ? null : /^-?\d+(?:\.\d+)?/.test(text) ? Number(text.match(/^-?\d+(?:\.\d+)?/)![0]) : null;

/** Unknown locale/format/error fails closed. No service/config/time modification. */
export function assessWindowsTime(input: { status: string; peers: string; stripchart: string; statusReadAt?: string }, checkedAt: string, ttlMs = 60000): ClockHealth {
  const source = field(input.status, "Source"), leapIndicator = numeric(field(input.status, "Leap Indicator")),
    stratum = numeric(field(input.status, "Stratum")), lastSyncError = numeric(field(input.status, "Last Sync Error")),
    syncAge = numeric(field(input.status, "Time since Last Good Sync Time"));
  const samples = [...input.stripchart.matchAll(/,\s*([+-])(\d+)\.(\d+)s\s*$/gm)].map(m => (m[1] === "-" ? -1 : 1) * Number(`${m[2]}.${m[3]}`) * 1000);
  const offsetMs = samples.length >= 3 ? samples.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a) : null;
  const syncTime = Date.parse(input.statusReadAt ?? checkedAt) - (syncAge ?? NaN) * 1000;
  const base: ClockHealth = { health: "UNKNOWN", reason: "TIME_EVIDENCE_INCOMPLETE", source, lastSuccessfulSync: syncAge !== null && syncAge >= 0 && Number.isFinite(syncTime) ? new Date(syncTime).toISOString() : null,
    lastSyncError, lastSuccessfulSyncBasis: "STATUS_AGE_APPROXIMATE", leapIndicator, stratum, offsetMs, checkedAt, ttlMs, clockJumpDetected: false,
    assurance: "SHORT_TERM_READ_ONLY_MEASUREMENT", longTermStability: "NOT_VERIFIED" };
  if (source?.replace(/\s/g, "") !== "time.windows.com,0x8") return { ...base, reason: "NTP_SOURCE_UNAPPROVED_OR_UNKNOWN" };
  if (leapIndicator === null || stratum === null || lastSyncError === null || syncAge === null || offsetMs === null || !Number.isFinite(offsetMs) || syncAge < 0) return base;
  if (leapIndicator !== 0 || stratum < 1 || stratum > 15 || lastSyncError !== 0) return { ...base, health: "UNHEALTHY", reason: "WINDOWS_TIME_UNSYNCHRONIZED" };
  if (Math.abs(offsetMs) > 500) return { ...base, health: "UNHEALTHY", reason: "OFFSET_LIMIT_EXCEEDED" };
  if (syncAge > 3600) return { ...base, reason: "LAST_SYNC_TOO_OLD" };
  const peer = input.peers.split(/^Peer:\s*/mi).slice(1).find(block => /^time\.windows\.com,0x8\s*$/mi.test(block.split(/\r?\n/)[0]));
  if (!peer || field(peer, "State") !== "Active") return { ...base, reason: "NTP_PEER_NOT_ACTIVE" };
  return { ...base, health: "HEALTHY", reason: "SHORT_TERM_NTP_MEASUREMENT_OK" };
}

export class ClockHealthAdapter {
  private evidence: ClockHealth | null = null;
  private measuredMono = -Infinity;
  private previous: { wall: number; mono: number } | null = null;
  private jumpLatched = false;
  private inFlight: Promise<ClockHealth> | null = null;
  constructor(private readonly read: TimeReader, private readonly wall: () => number = Date.now,
    private readonly mono: () => number = () => performance.now(), private readonly ttlMs = 60000) {}
  private checkJump() {
    const next = { wall: this.wall(), mono: this.mono() };
    if (this.previous && (next.wall < this.previous.wall || Math.abs((next.wall - this.previous.wall) - (next.mono - this.previous.mono)) > 2000)) this.jumpLatched = true;
    this.previous = next;
  }
  private unknown(reason: string): ClockHealth {
    return { health: "UNKNOWN", reason, source: null, lastSuccessfulSync: null, lastSuccessfulSyncBasis: "STATUS_AGE_APPROXIMATE", lastSyncError: null, leapIndicator: null, stratum: null, offsetMs: null,
      checkedAt: new Date(this.wall()).toISOString(), ttlMs: this.ttlMs, clockJumpDetected: this.jumpLatched, assurance: "SHORT_TERM_READ_ONLY_MEASUREMENT", longTermStability: "NOT_VERIFIED" };
  }
  snapshot() {
    this.checkJump();
    if (this.jumpLatched) return this.unknown("CLOCK_JUMP_LATCHED");
    if (!this.evidence || this.mono() - this.measuredMono > this.ttlMs || this.wall() < Date.parse(this.evidence.checkedAt) || this.wall() - Date.parse(this.evidence.checkedAt) > this.ttlMs) return this.unknown("CLOCK_EVIDENCE_MISSING_OR_EXPIRED");
    return structuredClone(this.evidence);
  }
  refresh(): Promise<ClockHealth> {
    this.checkJump();
    if (this.inFlight) return this.inFlight;
    if (this.jumpLatched) return Promise.resolve(this.unknown("CLOCK_JUMP_LATCHED"));
    if (this.evidence && this.mono() - this.measuredMono < 30000) return Promise.resolve(this.snapshot());
    this.inFlight = (async () => {
      try {
        const status = await this.read(); this.checkJump();
        this.evidence = this.jumpLatched ? this.unknown("CLOCK_JUMP_LATCHED") : assessWindowsTime(status, new Date(this.wall()).toISOString(), this.ttlMs);
      } catch { this.evidence = this.unknown("TIME_READ_FAILED_OR_TIMEOUT"); }
      this.measuredMono = this.mono(); return this.snapshot();
    })().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }
}
