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
exports.postHwRouter = void 0;
exports.notifyHardware = notifyHardware;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Called from startCharging / stopCharging — fire and forget, never blocks the main flow
async function notifyHardware(action, stationId) {
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
        const data = await res.json();
        console.log(`[HW] station ${stationId} ${action}:`, data);
    }
    catch (e) {
        console.error(`[HW] station ${stationId} ${action} failed:`, e);
    }
}
const latestHwReadings = new Map();
// Optional simple API-key guard (set HW_API_KEY in .env; leave blank to skip)
function checkHwApiKey(req, res) {
    const expected = process.env.HW_API_KEY;
    if (!expected)
        return true; // no key configured → open
    const provided = req.headers['x-hw-api-key'] || req.query.apiKey;
    if (provided !== expected) {
        res.status(401).json({ msg: "Invalid hardware API key" });
        return false;
    }
    return true;
}
exports.postHwRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
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
exports.postHwRouter.post("/data", async (req, res) => {
    if (!checkHwApiKey(req, res))
        return;
    try {
        const { stationId, p1 = 0, p2 = 0, p3 = 0, p4 = 0, p5 = 0, p6 = 0, p7 = 0, p8 = 0, p9 = 0, p10 = 0, p11 = 0, p12 = 0, ...extra } = req.body;
        if (!stationId) {
            return res.status(400).json({ msg: "stationId is required" });
        }
        // Determine current action from active session
        const activeSession = await prisma.sessions.findFirst({
            where: { stationId: Number(stationId), isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        const action = activeSession ? 'start' : 'idle';
        // Store what hardware sent us
        const reading = {
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
    }
    catch (e) {
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
exports.postHwRouter.get("/data", async (req, res) => {
    if (!checkHwApiKey(req, res))
        return;
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
        const action = activeSession ? 'start' : 'idle';
        return res.json({ p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0,
            p7: 0, p8: 0, p9: 0, p10: 0, p11: 0, p12: 0,
            action, stationId,
            lastHwReading: latestHwReadings.get(stationId) ?? null });
    }
    catch (e) {
        console.error("[HW get error]", e);
        res.status(500).json({ msg: "Internal server error" });
    }
});
/**
 * GET /hw/readings
 * Dashboard view of all stored hardware readings (for debugging / admin).
 */
exports.postHwRouter.get("/readings", (req, res) => {
    if (!checkHwApiKey(req, res))
        return;
    const all = {};
    latestHwReadings.forEach((v, k) => { all[k] = v; });
    res.json({ count: latestHwReadings.size, readings: all });
});
