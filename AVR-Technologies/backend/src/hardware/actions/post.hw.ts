import { Router } from "express";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Point mapping — single source of truth for p1-p12 semantics
// ---------------------------------------------------------------------------
export const POINT_MAP = {
    p1:  { name: "Charger ID",           shortName: "CID"                                           },
    p2:  { name: "Reseller ID",          shortName: "RID"                                           },
    p3:  { name: "Operator ID",          shortName: "OID"                                           },
    p4:  { name: "User ID",              shortName: "UID"                                           },
    p5:  { name: "Point Balance"                                                                     },
    p6:  { name: "Session Start Time",   format: "Epoch"                                            },
    p7:  { name: "Real Time Power",      unit: "Watts"                                              },
    p8:  { name: "Session Status",       values: { 0: "Idle", 1: "Start", 2: "Charging", 3: "End" }},
    p9:  { name: "Session End Time",     format: "Epoch"                                            },
    p10: { name: "Total Points Consumed"                                                             },
    p11: { name: "Session Duration",     unit: "Seconds"                                            },
    p12: { name: "Energy Consumed",      unit: "Wh"                                                 },
} as const;

// p8 status codes
const HW_STATUS = { IDLE: 0, START: 1, CHARGING: 2, END: 3 } as const;

// ---------------------------------------------------------------------------
// Outbound — our backend calls hardware (fire and forget from startCharging/stopCharging)
// ---------------------------------------------------------------------------
export async function notifyHardware(
    action: 'start' | 'stop',
    stationId: number,
    userId?: number
): Promise<void> {
    const url = process.env.HARDWARE_API_URL;
    if (!url) {
        console.log(`[HW] HARDWARE_API_URL not set, skipping ${action} for station ${stationId}`);
        return;
    }

    // Pull live data to populate p-values properly
    const [user, activeSession] = await Promise.all([
        userId ? prisma.user.findUnique({ where: { id: userId } }) : Promise.resolve(null),
        prisma.sessions.findFirst({ where: { stationId, isActive: true }, orderBy: { createdAt: 'desc' } }),
    ]).catch(() => [null, null] as const);

    const nowEpoch = Math.floor(Date.now() / 1000);
    const startEpoch = activeSession ? Math.floor(new Date(activeSession.createdAt).getTime() / 1000) : nowEpoch;
    const durationSec = activeSession ? nowEpoch - startEpoch : 0;

    const payload = {
        // p1  — Charger ID
        p1:  stationId,
        // p2  — Reseller ID (from station record if available)
        p2:  0,
        // p3  — Operator ID
        p3:  0,
        // p4  — User ID
        p4:  userId ?? 0,
        // p5  — Point Balance
        p5:  user?.points ? Number(user.points) : 0,
        // p6  — Session Start Time (Epoch)
        p6:  startEpoch,
        // p7  — Real Time Power (Watts) — unknown from our side
        p7:  0,
        // p8  — Session Status
        p8:  action === 'start' ? HW_STATUS.START : HW_STATUS.END,
        // p9  — Session End Time (Epoch), only on stop
        p9:  action === 'stop' ? nowEpoch : 0,
        // p10 — Total Points Consumed
        p10: activeSession?.pointsUsed ? Number(activeSession.pointsUsed) : 0,
        // p11 — Session Duration (Seconds)
        p11: durationSec,
        // p12 — Energy Consumed (Wh) — unknown from our side
        p12: 0,
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
        });
        const data = await res.json() as Record<string, unknown>;
        console.log(`[HW outbound] station ${stationId} ${action}:`, data);
    } catch (e) {
        console.error(`[HW outbound] station ${stationId} ${action} failed:`, e);
    }
}

// ---------------------------------------------------------------------------
// In-memory store — last reading per station (replace with DB table later)
// ---------------------------------------------------------------------------
type HardwareReading = {
    // Mapped p-values with semantic names
    CID: number;          // p1
    RID: number;          // p2
    OID: number;          // p3
    UID: number;          // p4
    pointBalance: number; // p5
    sessionStartEpoch: number;  // p6
    realtimePowerW: number;     // p7
    sessionStatus: number;      // p8 — 0=Idle,1=Start,2=Charging,3=End
    sessionEndEpoch: number;    // p9
    pointsConsumed: number;     // p10
    durationSeconds: number;    // p11
    energyWh: number;           // p12
    raw: Record<string, number>;
    receivedAt: string;
};

const latestHwReadings = new Map<number, HardwareReading>();

// ---------------------------------------------------------------------------
// API-key guard (optional — set HW_API_KEY in .env to enable)
// ---------------------------------------------------------------------------
function checkHwApiKey(req: any, res: Response): boolean {
    const expected = process.env.HW_API_KEY;
    if (!expected) return true;
    const provided = req.headers['x-hw-api-key'] ?? req.query.apiKey;
    if (provided !== expected) { res.status(401).json({ msg: "Invalid hardware API key" }); return false; }
    return true;
}

// ---------------------------------------------------------------------------
// Helper — build our response p-values from DB state
// ---------------------------------------------------------------------------
async function buildResponsePayload(stationId: number) {
    const [activeSession, station] = await Promise.all([
        prisma.sessions.findFirst({
            where: { stationId, isActive: true },
            orderBy: { createdAt: 'desc' },
            include: { User: true }
        }),
        prisma.chargingStation.findUnique({ where: { id: stationId } }),
    ]);

    const nowEpoch = Math.floor(Date.now() / 1000);
    const startEpoch = activeSession ? Math.floor(new Date(activeSession.createdAt).getTime() / 1000) : 0;
    const durationSec = startEpoch ? nowEpoch - startEpoch : 0;

    let status: number = HW_STATUS.IDLE;
    if (activeSession) {
        const elapsed = durationSec / 60;
        const estimated = activeSession.estimatedDuration;
        status = estimated && elapsed >= estimated ? HW_STATUS.END : HW_STATUS.CHARGING;
    }

    return {
        p1:  stationId,
        p2:  0,
        p3:  0,
        p4:  activeSession?.userId ?? 0,
        p5:  activeSession?.User?.points ? Number(activeSession.User.points) : 0,
        p6:  startEpoch,
        p7:  0,
        p8:  status,
        p9:  status === HW_STATUS.END ? nowEpoch : 0,
        p10: activeSession?.pointsUsed ? Number(activeSession.pointsUsed) : 0,
        p11: durationSec,
        p12: 0,
    };
}

export const postHwRouter = Router();

// ---------------------------------------------------------------------------
// POST /hw/data
// Hardware sends p1-p12 → we store it, handle session lifecycle, respond with our state
// ---------------------------------------------------------------------------
postHwRouter.post("/data", async (req: any, res: Response) => {
    if (!checkHwApiKey(req, res)) return;
    try {
        const {
            p1  = 0,   // CID — Charger ID
            p2  = 0,   // RID — Reseller ID
            p3  = 0,   // OID — Operator ID
            p4  = 0,   // UID — User ID
            p5  = 0,   // Point Balance
            p6  = 0,   // Session Start Time (Epoch)
            p7  = 0,   // Real Time Power (Watts)
            p8  = 0,   // Session Status: 0=Idle,1=Start,2=Charging,3=End
            p9  = 0,   // Session End Time (Epoch)
            p10 = 0,   // Total Points Consumed
            p11 = 0,   // Session Duration (Seconds)
            p12 = 0,   // Energy Consumed (Wh)
        } = req.body;

        const stationId = Number(p1);
        const userId    = Number(p4);
        const status    = Number(p8);

        if (!stationId) return res.status(400).json({ msg: "p1 (Charger ID) is required" });

        // Store reading with semantic names
        latestHwReadings.set(stationId, {
            CID: stationId, RID: Number(p2), OID: Number(p3), UID: userId,
            pointBalance: Number(p5), sessionStartEpoch: Number(p6),
            realtimePowerW: Number(p7), sessionStatus: status,
            sessionEndEpoch: Number(p9), pointsConsumed: Number(p10),
            durationSeconds: Number(p11), energyWh: Number(p12),
            raw: { p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12 },
            receivedAt: new Date().toISOString(),
        });

        console.log(`[HW inbound] station ${stationId} status=${status} (${POINT_MAP.p8.values[status as keyof typeof POINT_MAP.p8.values] ?? 'Unknown'}) uid=${userId}`);

        // --- Session lifecycle based on p8 ---

        if (status === HW_STATUS.START && userId) {
            // Hardware says: user started charging. Create session if none exists.
            const existing = await prisma.sessions.findFirst({ where: { stationId, isActive: true } });
            if (!existing) {
                const user    = await prisma.user.findUnique({ where: { id: userId } });
                const station = await prisma.chargingStation.findUnique({ where: { id: stationId } });
                if (user && station && !station.isOccupied) {
                    await prisma.$transaction([
                        prisma.chargingStation.update({
                            where: { id: stationId },
                            data: { isOccupied: true, connectedUserID: userId }
                        }),
                        prisma.sessions.create({
                            data: {
                                userId, stationId, totalTime: "0", isActive: true,
                                location: station.location, pointsUsed: BigInt(0),
                                estimatedDuration: null,
                            }
                        }),
                    ]);
                    console.log(`[HW] Created session — station ${stationId} user ${userId}`);
                }
            }
        }

        if (status === HW_STATUS.END) {
            // Hardware says: session ended. Close it with hardware's data.
            const activeSession = await prisma.sessions.findFirst({
                where: { stationId, isActive: true },
                orderBy: { createdAt: 'desc' },
                include: { User: true }
            });
            if (activeSession) {
                const totalMinutes = p11 ? Math.ceil(Number(p11) / 60) : 1;
                const pointsConsumed = BigInt(Math.max(0, Math.round(Number(p10))));
                const userPoints = activeSession.User?.points ?? BigInt(0);
                const deduct = pointsConsumed > BigInt(0) && activeSession.pointsUsed === BigInt(0);

                await prisma.$transaction([
                    prisma.sessions.update({
                        where: { id: activeSession.id },
                        data: {
                            isActive: false,
                            totalTime: `${totalMinutes} min`,
                            pointsUsed: pointsConsumed,
                        }
                    }),
                    prisma.chargingStation.update({
                        where: { id: stationId },
                        data: { isOccupied: false, connectedUserID: null }
                    }),
                    ...(deduct && activeSession.userId ? [
                        prisma.user.update({
                            where: { id: activeSession.userId },
                            data: { points: userPoints - pointsConsumed }
                        })
                    ] : []),
                ]);
                console.log(`[HW] Closed session ${activeSession.id} — ${totalMinutes} min, ${p12} Wh, ${p10} pts`);
            }
        }

        // Respond with our current state (full p-values)
        const response = await buildResponsePayload(stationId);
        return res.json(response);

    } catch (e) {
        console.error("[HW data error]", e);
        res.status(500).json({ msg: "Internal server error" });
    }
});

// ---------------------------------------------------------------------------
// GET /hw/data?stationId=X  — hardware polls our current state
// ---------------------------------------------------------------------------
postHwRouter.get("/data", async (req: any, res: Response) => {
    if (!checkHwApiKey(req, res)) return;
    try {
        const stationId = req.query.stationId ? Number(req.query.stationId) : null;
        if (!stationId) {
            const all: Record<number, HardwareReading> = {};
            latestHwReadings.forEach((v, k) => { all[k] = v; });
            return res.json({ readings: all });
        }
        const response = await buildResponsePayload(stationId);
        return res.json({ ...response, lastHwReading: latestHwReadings.get(stationId) ?? null });
    } catch (e) {
        console.error("[HW get error]", e);
        res.status(500).json({ msg: "Internal server error" });
    }
});

// ---------------------------------------------------------------------------
// GET /hw/readings — debug view of all stored hardware readings
// ---------------------------------------------------------------------------
postHwRouter.get("/readings", (req: any, res: Response) => {
    if (!checkHwApiKey(req, res)) return;
    const all: Record<number, HardwareReading> = {};
    latestHwReadings.forEach((v, k) => { all[k] = v; });
    res.json({ pointMap: POINT_MAP, count: latestHwReadings.size, readings: all });
});

// ---------------------------------------------------------------------------
// GET /hw/point-map — expose the mapping so hardware side can reference it
// ---------------------------------------------------------------------------
postHwRouter.get("/point-map", (_req: any, res: Response) => {
    res.json(POINT_MAP);
});
