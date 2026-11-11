import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ClockHealthAdapter } from "./clock-health";

const run = promisify(execFile);
export async function readWindowsTime() {
  if (process.platform !== "win32") throw new Error("WINDOWS_TIME_UNAVAILABLE");
  const query = async (args: string[]) => (await run("C:\\Windows\\System32\\w32tm.exe", args,
    { windowsHide: true, timeout: 8000, maxBuffer: 65536, encoding: "utf8" })).stdout;
  const [status, peers] = await Promise.all([query(["/query", "/status", "/verbose"]), query(["/query", "/peers"])]);
  const statusReadAt = new Date().toISOString();
  const stripchart = await query(["/stripchart", "/computer:time.windows.com", "/samples:3", "/dataonly"]);
  return { status, peers, stripchart, statusReadAt };
}
export const liveClockHealth = new ClockHealthAdapter(readWindowsTime);
