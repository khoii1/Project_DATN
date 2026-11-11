// Passive observation is independent from permission to publish pump commands.
// Session evidence prevents old MOCK/persisted OFF from becoming physical evidence.
import { liveEvidenceStore } from "../services/live-provenance/evidence-store";
const reports = new Map<string, { deviceCode: string; actuatorCode: string; lastStateChangedAt: Date }>();
const fresh = (at: Date) => Date.now() - at.getTime() <= 30_000 && at.getTime() <= Date.now() + 2000;
export const mqttStateObserver = {
  ready: false,
  generation: 0,
  sessionStartedAt: new Date(),
  reset() { this.ready = false; this.generation++; this.sessionStartedAt = new Date(); reports.clear(); liveEvidenceStore.reset(this.generation, this.sessionStartedAt); },
  confirmOff(deviceCode: string, actuatorCode: string, at: Date, generation: number) {
    if (this.ready && generation === this.generation) reports.set(`${deviceCode}/${actuatorCode}`, { deviceCode, actuatorCode, lastStateChangedAt: at });
  },
  isConfirmedOff(deviceCode: string, actuatorCode: string, at: Date | null) {
    return this.ready && !!at && fresh(at) && reports.get(`${deviceCode}/${actuatorCode}`)?.lastStateChangedAt.getTime() === at.getTime();
  },
  offFilters() {
    return this.ready ? [...reports.values()].filter(report => fresh(report.lastStateChangedAt)).map(report => ({ actuatorCode: report.actuatorCode, device: { deviceCode: report.deviceCode }, lastStateChangedAt: report.lastStateChangedAt })) : [];
  },
};
