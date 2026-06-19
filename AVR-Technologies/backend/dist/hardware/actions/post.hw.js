"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.postHwRouter = exports.POINT_MAP = void 0;
exports.setP13 = setP13;
exports.notifyHardware = notifyHardware;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const prisma = new client_1.PrismaClient();
// ---------------------------------------------------------------------------
// Point mapping — single source of truth for p1-p12 semantics
// ---------------------------------------------------------------------------
exports.POINT_MAP = {
    p1: { name: "Charger ID", shortName: "CID" },
    p2: { name: "Reseller ID", shortName: "RID" },
    p3: { name: "Operator ID", shortName: "OID" },
    p4: { name: "User ID", shortName: "UID" },
    p5: { name: "Point Balance" },
    p6: { name: "Session Start Time", format: "Epoch" },
    p7: { name: "Real Time Power", unit: "Watts" },
    p8: { name: "Session Status", values: { 0: "Idle", 1: "Charging", 2: "End" } },
    p9: { name: "Session End Time", format: "Epoch" },
    p10: { name: "Total Points Consumed" },
    p11: { name: "Session Duration", unit: "Seconds" },
    p12: { name: "Energy Consumed", unit: "Wh" },
    p13: { name: "Charge Command", values: { 0: "Stop/Idle", 1: "Start Charging" } },
};
// p8 status codes sent BY hardware
const HW_STATUS = { IDLE: 0, CHARGING: 1, END: 2 };
// ---------------------------------------------------------------------------
// p13 command store — what WE tell hardware to do per station
// 0 = stop/idle, 1 = start charging
// Set by startCharging / stopCharging routes, read on every hardware poll
// ---------------------------------------------------------------------------
const stationP13 = new Map();
function setP13(stationId, value) {
    stationP13.set(stationId, value);
    console.log(`[HW] p13 command for station ${stationId} set to ${value}`);
}
// ---------------------------------------------------------------------------
// Outbound — our backend calls hardware (fire and forget from startCharging/stopCharging)
// ---------------------------------------------------------------------------
async function notifyHardware(action, stationId, userId) {
    const url = process.env.HARDWARE_API_URL;
    if (!url) {
        console.log(`[HW] HARDWARE_API_URL not set, skipping ${action} for station ${stationId}`);
        return;
    }
    // Pull live data to populate p-values properly
    const [user, activeSession] = await Promise.all([
        userId ? prisma.user.findUnique({ where: { id: userId } }) : Promise.resolve(null),
        prisma.sessions.findFirst({ where: { stationId, isActive: true }, orderBy: { createdAt: 'desc' } }),
    ]).catch(() => [null, null]);
    const nowEpoch = Math.floor(Date.now() / 1000);
    const startEpoch = activeSession ? Math.floor(new Date(activeSession.createdAt).getTime() / 1000) : nowEpoch;
    const durationSec = activeSession ? nowEpoch - startEpoch : 0;
    const payload = {
        // p1  — Charger ID
        p1: stationId,
        // p2  — Reseller ID (from station record if available)
        p2: 0,
        // p3  — Operator ID
        p3: 0,
        // p4  — User ID
        p4: userId ?? 0,
        // p5  — Point Balance
        p5: user?.points ? Number(user.points) : 0,
        // p6  — Session Start Time (Epoch)
        p6: startEpoch,
        // p7  — Real Time Power (Watts) — unknown from our side
        p7: 0,
        // p8  — Session Status
        p8: action === 'start' ? HW_STATUS.CHARGING : HW_STATUS.END,
        // p9  — Session End Time (Epoch), only on stop
        p9: action === 'stop' ? nowEpoch : 0,
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
        const data = await res.json();
        console.log(`[HW outbound] station ${stationId} ${action}:`, data);
    }
    catch (e) {
        console.error(`[HW outbound] station ${stationId} ${action} failed:`, e);
    }
}
const latestHwReadings = new Map();
// ---------------------------------------------------------------------------
// API-key guard (optional — set HW_API_KEY in .env to enable)
// ---------------------------------------------------------------------------
function checkHwApiKey(req, res) {
    const expected = process.env.HW_API_KEY;
    if (!expected)
        return true;
    const provided = req.headers['x-hw-api-key'] ?? req.query.apiKey;
    if (provided !== expected) {
        res.status(401).json({ msg: "Invalid hardware API key" });
        return false;
    }
    return true;
}
// ---------------------------------------------------------------------------
// Helper — build our response p-values from DB state
// ---------------------------------------------------------------------------
async function buildResponsePayload(stationId) {
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
    let status = HW_STATUS.IDLE;
    if (activeSession) {
        const elapsed = durationSec / 60;
        const estimated = activeSession.estimatedDuration;
        status = estimated && elapsed >= estimated ? HW_STATUS.END : HW_STATUS.CHARGING;
    }
    return {
        p1: stationId,
        p2: 0,
        p3: 0,
        p4: activeSession?.userId ?? 0,
        p5: activeSession?.User?.points ? Number(activeSession.User.points) : 0,
        p6: startEpoch,
        p7: 0,
        p8: status,
        p9: status === HW_STATUS.END ? nowEpoch : 0,
        p10: activeSession?.pointsUsed ? Number(activeSession.pointsUsed) : 0,
        p11: durationSec,
        p12: 0,
    };
}
exports.postHwRouter = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// POST /hw/data
// Hardware sends p1-p12 → we store it, handle session lifecycle, respond with our state
// ---------------------------------------------------------------------------
exports.postHwRouter.post("/data", async (req, res) => {
    if (!checkHwApiKey(req, res))
        return;
    try {
        const { p1 = 0, // CID — Charger ID
        p2 = 0, // RID — Reseller ID
        p3 = 0, // OID — Operator ID
        p4 = 0, // UID — User ID
        p5 = 0, // Point Balance
        p6 = 0, // Session Start Time (Epoch)
        p7 = 0, // Real Time Power (Watts)
        p8 = 0, // Session Status: 0=Idle,1=Start,2=Charging,3=End
        p9 = 0, // Session End Time (Epoch)
        p10 = 0, // Total Points Consumed
        p11 = 0, // Session Duration (Seconds)
        p12 = 0, // Energy Consumed (Wh)
         } = req.body;
        const stationId = Number(p1);
        const userId = Number(p4);
        const status = Number(p8);
        if (!stationId)
            return res.status(400).json({ msg: "p1 (Charger ID) is required" });
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
        console.log(`[HW inbound] station ${stationId} status=${status} (${exports.POINT_MAP.p8.values[status] ?? 'Unknown'}) uid=${userId}`);
        // --- Session lifecycle based on p8 ---
        if (status === HW_STATUS.CHARGING && userId) {
            // Hardware says: user started charging. Create session if none exists.
            const existing = await prisma.sessions.findFirst({ where: { stationId, isActive: true } });
            if (!existing) {
                const user = await prisma.user.findUnique({ where: { id: userId } });
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
    }
    catch (e) {
        console.error("[HW data error]", e);
        res.status(500).json({ msg: "Internal server error" });
    }
});
// ---------------------------------------------------------------------------
// GET /hw/data?stationId=X&p8=Y  — hardware polls our state
// Hardware sends its current p8 status; we respond with p1-p13 command
// ---------------------------------------------------------------------------
exports.postHwRouter.get("/data", async (req, res) => {
    if (!checkHwApiKey(req, res))
        return;
    try {
        const stationId = req.query.stationId ? Number(req.query.stationId) : null;
        const incomingP8 = req.query.p8 !== undefined ? Number(req.query.p8) : null;
        if (!stationId) {
            const all = {};
            latestHwReadings.forEach((v, k) => { all[k] = v; });
            return res.json({ readings: all });
        }
        // Process hardware's reported p8 status
        if (incomingP8 !== null) {
            console.log(`[HW poll] station ${stationId} p8=${incomingP8}`);
            if (incomingP8 === HW_STATUS.CHARGING) {
                // Hardware confirmed charging started — session already in DB via startCharging
                console.log(`[HW] Station ${stationId} confirmed charging`);
            }
            if (incomingP8 === HW_STATUS.END) {
                // Hardware says charging ended — close session if still open
                const activeSession = await prisma.sessions.findFirst({
                    where: { stationId, isActive: true },
                    orderBy: { createdAt: 'desc' },
                    include: { User: true }
                });
                if (activeSession) {
                    const nowEpoch = Math.floor(Date.now() / 1000);
                    const startEpoch = Math.floor(new Date(activeSession.createdAt).getTime() / 1000);
                    const totalMinutes = Math.max(1, Math.ceil((nowEpoch - startEpoch) / 60));
                    await prisma.$transaction([
                        prisma.sessions.update({
                            where: { id: activeSession.id },
                            data: { isActive: false, totalTime: `${totalMinutes} min` }
                        }),
                        prisma.chargingStation.update({
                            where: { id: stationId },
                            data: { isOccupied: false, connectedUserID: null }
                        }),
                    ]);
                    stationP13.set(stationId, 0);
                    console.log(`[HW] Station ${stationId} session closed by hardware p8=2`);
                }
            }
        }
        const p13 = stationP13.get(stationId) ?? 0;
        const payload = await buildResponsePayload(stationId);
        return res.json({ stationId, ...payload, p13 });
    }
    catch (e) {
        console.error("[HW get error]", e);
        res.status(500).json({ msg: "Internal server error" });
    }
});
// ---------------------------------------------------------------------------
// GET /hw/readings — debug view of all stored hardware readings
// ---------------------------------------------------------------------------
exports.postHwRouter.get("/readings", (req, res) => {
    if (!checkHwApiKey(req, res))
        return;
    const all = {};
    latestHwReadings.forEach((v, k) => { all[k] = v; });
    res.json({ pointMap: exports.POINT_MAP, count: latestHwReadings.size, readings: all });
});
// ---------------------------------------------------------------------------
// GET /hw/point-map — expose the mapping so hardware side can reference it
// ---------------------------------------------------------------------------
exports.postHwRouter.get("/point-map", (_req, res) => {
    res.json(exports.POINT_MAP);
});
