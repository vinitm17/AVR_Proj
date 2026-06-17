"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeQueueWhere = exports.reconcileChargingState = void 0;
const ACTIVE_QUEUE_STATUSES = ["WAITING", "NOTIFIED"];
const reconcileChargingState = (prisma, stationId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const now = new Date();
    const activeSessions = yield prisma.sessions.findMany({
        where: Object.assign({ isActive: true }, (stationId ? { stationId } : {})),
        select: { id: true, stationId: true, userId: true, createdAt: true, estimatedDuration: true },
        orderBy: [{ stationId: "asc" }, { createdAt: "desc" }]
    });
    // Group by station; mark duplicates and expired sessions for closure
    const sessionsByStation = new Map();
    for (const s of activeSessions) {
        const list = (_a = sessionsByStation.get(s.stationId)) !== null && _a !== void 0 ? _a : [];
        list.push(s);
        sessionsByStation.set(s.stationId, list);
    }
    const toClose = [];
    const activeSessionByStation = new Map();
    for (const [sid, sessions] of sessionsByStation) {
        const [canonical, ...duplicates] = sessions; // already ordered desc by createdAt
        toClose.push(...duplicates);
        const elapsedMin = Math.ceil((now.getTime() - canonical.createdAt.getTime()) / 60000);
        if (canonical.estimatedDuration && elapsedMin >= canonical.estimatedDuration) {
            toClose.push(canonical);
        }
        else {
            activeSessionByStation.set(sid, canonical);
        }
    }
    // Close expired/duplicate sessions in parallel
    if (toClose.length > 0) {
        yield Promise.all(toClose.map(s => prisma.sessions.update({
            where: { id: s.id },
            data: {
                isActive: false,
                totalTime: `${Math.ceil((now.getTime() - s.createdAt.getTime()) / 60000)} min`
            }
        })));
    }
    // Determine which stations to reconcile
    let stationIds;
    if (stationId) {
        stationIds = [stationId];
    }
    else {
        const [occupiedStations, queuedStations] = yield Promise.all([
            prisma.chargingStation.findMany({ where: { isOccupied: true }, select: { id: true } }),
            prisma.stationQueue.findMany({
                where: { status: { in: [...ACTIVE_QUEUE_STATUSES] } },
                select: { stationId: true },
                distinct: ["stationId"]
            })
        ]);
        stationIds = Array.from(new Set([
            ...Array.from(sessionsByStation.keys()),
            ...occupiedStations.map(s => s.id),
            ...queuedStations.map(q => q.stationId)
        ]));
    }
    // Update all stations in parallel
    yield Promise.all(stationIds.map((id) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const activeSession = activeSessionByStation.get(id);
        const [, station, queueEntries] = yield Promise.all([
            prisma.chargingStation.update({
                where: { id },
                data: { isOccupied: Boolean(activeSession), connectedUserID: (_a = activeSession === null || activeSession === void 0 ? void 0 : activeSession.userId) !== null && _a !== void 0 ? _a : null }
            }),
            prisma.chargingStation.findUnique({ where: { id }, select: { isActive: true, isFaulty: true } }),
            prisma.stationQueue.findMany({
                where: { stationId: id, status: { in: [...ACTIVE_QUEUE_STATUSES] } },
                orderBy: [{ position: "asc" }, { createdAt: "asc" }]
            })
        ]);
        yield Promise.all(queueEntries.map((entry, index) => __awaiter(void 0, void 0, void 0, function* () {
            const nextPosition = index + 1;
            const canNotify = (station === null || station === void 0 ? void 0 : station.isActive) && !(station === null || station === void 0 ? void 0 : station.isFaulty) && !activeSession && nextPosition === 1;
            const nextStatus = canNotify ? "NOTIFIED" : entry.status;
            if (entry.position !== nextPosition || entry.status !== nextStatus) {
                yield prisma.stationQueue.update({
                    where: { id: entry.id },
                    data: { position: nextPosition, status: nextStatus }
                });
            }
        })));
    })));
});
exports.reconcileChargingState = reconcileChargingState;
exports.activeQueueWhere = {
    status: { in: [...ACTIVE_QUEUE_STATUSES] }
};
