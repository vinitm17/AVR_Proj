import { PrismaClient } from "@prisma/client";

const ACTIVE_QUEUE_STATUSES = ["WAITING", "NOTIFIED"] as const;

export const reconcileChargingState = async (
    prisma: PrismaClient,
    stationId?: number
) => {
    const now = new Date();

    const activeSessions = await prisma.sessions.findMany({
        where: { isActive: true, ...(stationId ? { stationId } : {}) },
        select: { id: true, stationId: true, userId: true, createdAt: true, estimatedDuration: true },
        orderBy: [{ stationId: "asc" }, { createdAt: "desc" }]
    });

    // Group by station; mark duplicates and expired sessions for closure
    const sessionsByStation = new Map<number, typeof activeSessions>();
    for (const s of activeSessions) {
        const list = sessionsByStation.get(s.stationId) ?? [];
        list.push(s);
        sessionsByStation.set(s.stationId, list);
    }

    const toClose: typeof activeSessions = [];
    const activeSessionByStation = new Map<number, typeof activeSessions[number]>();

    for (const [sid, sessions] of sessionsByStation) {
        const [canonical, ...duplicates] = sessions; // already ordered desc by createdAt
        toClose.push(...duplicates);
        const elapsedMin = Math.ceil((now.getTime() - canonical.createdAt.getTime()) / 60000);
        if (canonical.estimatedDuration && elapsedMin >= canonical.estimatedDuration) {
            toClose.push(canonical);
        } else {
            activeSessionByStation.set(sid, canonical);
        }
    }

    // Close expired/duplicate sessions in parallel
    if (toClose.length > 0) {
        await Promise.all(toClose.map(s =>
            prisma.sessions.update({
                where: { id: s.id },
                data: {
                    isActive: false,
                    totalTime: `${Math.ceil((now.getTime() - s.createdAt.getTime()) / 60000)} min`
                }
            })
        ));
    }

    // Determine which stations to reconcile
    let stationIds: number[];
    if (stationId) {
        stationIds = [stationId];
    } else {
        const [occupiedStations, queuedStations] = await Promise.all([
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
    await Promise.all(stationIds.map(async id => {
        const activeSession = activeSessionByStation.get(id);

        const [, station, queueEntries] = await Promise.all([
            prisma.chargingStation.update({
                where: { id },
                data: { isOccupied: Boolean(activeSession), connectedUserID: activeSession?.userId ?? null }
            }),
            prisma.chargingStation.findUnique({ where: { id }, select: { isActive: true, isFaulty: true } }),
            prisma.stationQueue.findMany({
                where: { stationId: id, status: { in: [...ACTIVE_QUEUE_STATUSES] } },
                orderBy: [{ position: "asc" }, { createdAt: "asc" }]
            })
        ]);

        await Promise.all(queueEntries.map(async (entry, index) => {
            const nextPosition = index + 1;
            const canNotify = station?.isActive && !station?.isFaulty && !activeSession && nextPosition === 1;
            const nextStatus = canNotify ? "NOTIFIED" : entry.status;
            if (entry.position !== nextPosition || entry.status !== nextStatus) {
                await prisma.stationQueue.update({
                    where: { id: entry.id },
                    data: { position: nextPosition, status: nextStatus }
                });
            }
        }));
    }));
};

export const activeQueueWhere = {
    status: { in: [...ACTIVE_QUEUE_STATUSES] }
};
