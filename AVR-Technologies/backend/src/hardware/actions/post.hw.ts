import { Router } from "express";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

// Called from startCharging / stopCharging — fire and forget, never blocks the main flow
export async function notifyHardware(action: 'start' | 'stop', stationId: number): Promise<void> {
    const url = process.env.HARDWARE_API_URL;
    if (!url) {
        console.log(`[HW] HARDWARE_API_URL not set, skipping ${action} for station ${stationId}`);
        return;
    }
    const payload = {
        action,
        p1: 0, p2: 0, p3: 0, p4: 0,
        p5: 0, p6: 0, p7: 0, p8: 0,
        p9: 0, p10: 0, p11: 0, p12: 0,
    };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
        });
        const data = await res.json() as Record<string, unknown>;
        console.log(`[HW] station ${stationId} ${action}:`, data);
    } catch (e) {
        console.error(`[HW] station ${stationId} ${action} failed:`, e);
    }
}

// ---------------------------------------------------------------------------
// In-memory store for the latest hardware reading per station.
// Replace with a Prisma model once the schema is finalized.
// ---------------------------------------------------------------------------
type HardwareReading = {
    stationId: number;
    action: 'start' | 'stop' | 'idle';
    p1: number; p2: number; p3: number; p4: number;
    p5: number; p6: number; p7: number; p8: number;
    p9: number; p10: number; p11: number; p12: number;
    receivedAt: string;
    extra: Record<string, unknown>; // any other fields hardware sends
};

const latestHwReadings = new Map<number, HardwareReading>();

// Optional simple API-key guard (set HW_API_KEY in .env; leave blank to skip)
function checkHwApiKey(req: any, res: Response): boolean {
    const expected = process.env.HW_API_KEY;
    if (!expected) return true; // no key configured → open
    const provided = req.headers['x-hw-api-key'] || req.query.apiKey;
    if (provided !== expected) {
        res.status(401).json({ msg: "Invalid hardware API key" });
        return false;
    }
    return true;
}

export const postHwRouter = Router()
const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// INBOUND — hardware calls us
// ---------------------------------------------------------------------------

/**
 * POST /hw/data
 *
 * Hardware hits this endpoint to exchange data:
 *   — they SEND us their current sensor readings (p1-p12 + anything else)
 *   — we RESPOND with our p1-p12 values + the action currently running
 *
 * Body they send:
 *   { stationId: number, p1: number, ..., p12: number, ...anyOtherFields }
 *
 * We store their payload in-memory (use DB once schema is decided).
 */
postHwRouter.post("/data", async (req: any, res: Response) => {
    if (!checkHwApiKey(req, res)) return;
    try {
        const { stationId, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, p6 = 0,
                p7 = 0, p8 = 0, p9 = 0, p10 = 0, p11 = 0, p12 = 0, ...extra } = req.body;

        if (!stationId) {
            return res.status(400).json({ msg: "stationId is required" });
        }

        // Determine current action from active session
        const activeSession = await prisma.sessions.findFirst({
            where: { stationId: Number(stationId), isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        const action: 'start' | 'stop' | 'idle' = activeSession ? 'start' : 'idle';

        // Store what hardware sent us
        const reading: HardwareReading = {
            stationId: Number(stationId), action,
            p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12,
            receivedAt: new Date().toISOString(),
            extra
        };
        latestHwReadings.set(Number(stationId), reading);
        console.log(`[HW inbound] station ${stationId}:`, reading);

        // Respond with our current p1-p12 state + action
        return res.json({ p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0,
                          p7: 0, p8: 0, p9: 0, p10: 0, p11: 0, p12: 0, action });
    } catch (e) {
        console.error("[HW data error]", e);
        res.status(500).json({ msg: "Internal server error" });
    }
});

/**
 * GET /hw/data?stationId=X
 *
 * Alternative: hardware polls us to READ our current state.
 * No request body needed — they just call this URL.
 * Returns our p1-p12 + the current action for that station.
 */
postHwRouter.get("/data", async (req: any, res: Response) => {
    if (!checkHwApiKey(req, res)) return;
    try {
        const stationId = req.query.stationId ? Number(req.query.stationId) : null;

        if (!stationId) {
            // No stationId → return latest reading for all stations
            const all = Object.fromEntries(latestHwReadings);
            return res.json({ readings: all });
        }

        const activeSession = await prisma.sessions.findFirst({
            where: { stationId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        const action: 'start' | 'stop' | 'idle' = activeSession ? 'start' : 'idle';

        return res.json({ p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0,
                          p7: 0, p8: 0, p9: 0, p10: 0, p11: 0, p12: 0,
                          action, stationId,
                          lastHwReading: latestHwReadings.get(stationId) ?? null });
    } catch (e) {
        console.error("[HW get error]", e);
        res.status(500).json({ msg: "Internal server error" });
    }
});

/**
 * GET /hw/readings
 * Dashboard view of all stored hardware readings (for debugging / admin).
 */
postHwRouter.get("/readings", (req: any, res: Response) => {
    if (!checkHwApiKey(req, res)) return;
    const all: Record<number, HardwareReading> = {};
    latestHwReadings.forEach((v, k) => { all[k] = v; });
    res.json({ count: latestHwReadings.size, readings: all });
});